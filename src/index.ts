import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import {
  Accessory,
  Message,
  Block,
  AccessoryElement,
} from "@slack/web-api/dist/response/ConversationsRepliesResponse";
import { getEnv } from "./lib/env";
import { createCompletion, Messages } from "./lib/openai";
import { makeSlackBot } from "./lib/slack";

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

const { slackAppToken, slackBotToken, slackSigningSecret } = getEnv();

const bot = makeSlackBot({
  token: slackBotToken,
  appToken: slackAppToken,
  signingSecret: slackSigningSecret,
});

const webClient = new WebClient(slackBotToken);

const filterRichTextBlocks = (blocks?: Block[]): Block[] => {
  if (!blocks) return [];
  return blocks.filter((block) => block.type === "rich_text");
};

const filterElements = (accessories?: Accessory[]): Accessory[] => {
  if (!accessories) return [];
  return accessories.filter((accessory) =>
    ["rich_text_section", "rich_text_preformatted", "rich_text_quote"].some(
      (i) => i === accessory.type
    )
  );
};

const createCodeblock = (text: string) => {
  return `\`\`\`${text}\`\`\``;
};

type TextAccessoryElement = AccessoryElement & {
  type: "text";
  text: string;
};

const filterElementTexts = (
  accessoryElements?: AccessoryElement[],
  option?: {
    code: boolean;
  }
): TextAccessoryElement[] => {
  if (!accessoryElements) return [];
  const textAccessoryElements = accessoryElements.filter(
    (accessoryElement) => accessoryElement.type === "text"
  ) as TextAccessoryElement[];
  if (option?.code) {
    return textAccessoryElements.map((elm) => ({
      ...elm,
      text: createCodeblock(elm.text),
    }));
  }
  return textAccessoryElements;
};

const extractText = (elements: TextAccessoryElement[]) => {
  return elements.reduce((acc, curr, index) => {
    if (curr.type === "text") {
      acc += curr.text;
      if (index !== elements.length - 1) {
        acc += "\n";
      }
    }
    return acc;
  }, "");
};

const makeChatCompletionFromSlackMessage = (
  slackMessage: Message,
  bot_user_id: string
) => {
  const texts = filterRichTextBlocks(slackMessage.blocks).flatMap((block) => {
    return filterElements(block.elements).flatMap((element) => {
      switch (element.type) {
        case "rich_text_quote":
        case "rich_text_preformatted":
          return filterElementTexts(element.elements, { code: true });
        default:
          return filterElementTexts(element.elements);
      }
    });
  });
  const message: ArrayElement<Messages> = {
    content: extractText(texts),
    role: slackMessage.user === bot_user_id ? "assistant" : "user",
  };
  return message;
};

const appMentionHandler = async ({
  event,
  say,
}: SlackEventMiddlewareArgs<"app_mention">) => {
  const { ts, thread_ts, channel } = event;

  try {
    // 👀をつける
    await webClient.reactions.add({
      channel,
      name: "eyes",
      timestamp: ts,
    });

    const { user_id, bot_id } = await webClient.auth.test();
    if (!user_id) throw new Error();

    if (thread_ts) {
      // This is a threaded mention
      const result = await webClient.conversations.replies({
        channel: channel,
        ts: thread_ts,
      });
      if (!result.messages) throw new Error();

      const messages = result.messages
        .filter(
          (msg) =>
            msg.bot_id === bot_id || // botの発言か
            msg.text?.includes(`<@${user_id}>`) // ユーザーからbotへのメンションか
        )
        .map((msg) => makeChatCompletionFromSlackMessage(msg, user_id))
        .filter((message) => message.content !== "");
      console.dir(JSON.stringify(messages));

      const completion = await createCompletion(messages);
      await webClient.chat.postMessage({
        channel,
        thread_ts,
        text: completion.data.choices.slice(-1)[0].message?.content,
      });
    } else {
      console.log("Non-threaded mention:");
      const result = await webClient.conversations.replies({
        channel: channel,
        ts,
      });
      if (!result.messages) throw new Error();

      const messages = result.messages
        .map((msg) => makeChatCompletionFromSlackMessage(msg, user_id))
        .filter((message) => message.content !== "");

      const completion = await createCompletion(messages);
      await webClient.chat.postMessage({
        channel,
        thread_ts: ts,
        text: completion.data.choices.slice(-1)[0].message?.content,
        reply_broadcast: true,
      });
    }
  } catch (error) {
    console.error("Error sending reply in a new thread:", error);
  }
};

bot.event("app_mention", appMentionHandler);

bot.start();
