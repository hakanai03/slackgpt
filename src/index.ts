import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { AccessoryElement } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { Block } from "@slack/web-api/dist/response/ConversationsOpenResponse";
import { Accessory } from "@slack/web-api/dist/response/ConversationsRepliesResponse";
import { getEnv } from "./lib/env";
import { createCompletion, Messages } from "./lib/openai";
import { makeSlackBot } from "./lib/slack";

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

const { slackAppToken, slackBotToken, slackSigningSecret, openaiApiKey } =
  getEnv();

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
      text: `\`\`\`${elm.text}\`\`\``,
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

const appMentionHandler = async ({
  event,
  say,
}: SlackEventMiddlewareArgs<"app_mention">) => {
  const { ts, thread_ts, channel } = event;

  if (thread_ts) {
    // This is a threaded mention
    try {
      const result = await webClient.conversations.replies({
        channel: channel,
        ts: thread_ts,
      });
      const { user_id } = await webClient.auth.test();

      const messages = result.messages
        ?.map((msg) => {
          const texts = filterRichTextBlocks(msg.blocks).flatMap((block) => {
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
            role: msg.user === user_id ? "assistant" : "user",
          };
          return message;
        })
        .filter((message) => message.content !== "");
      if (!messages) return;
      const completion = await createCompletion(messages);

      await webClient.chat.postMessage({
        channel,
        thread_ts,
        text: completion.data.choices.slice(-1)[0].message?.content,
      });
    } catch (error) {
      console.error("Error fetching thread messages:", error);
    }
  } else {
    // This is a non-threaded mention
    console.log("Non-threaded mention:");
    console.log(event.text);

    try {
      await webClient.chat.postMessage({
        channel: channel,
        text: event.text,
        thread_ts: ts,
      });
      console.log("Reply sent in a new thread.");
    } catch (error) {
      console.error("Error sending reply in a new thread:", error);
    }
  }
};

bot.event("app_mention", appMentionHandler);

bot.start();
