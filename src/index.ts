import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
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

      console.log("Thread messages:");
      const message: Messages = result.messages
        ?.map((msg) => {
          const user = msg.user;
          const element = msg.blocks?.[0].elements?.[0].elements?.find(
            (el) => el.type === "text"
          );
          if (!user || !element) return;
          const content = (element as { type: "text"; text: string }).text;

          console;

          return {
            role: user === user_id ? "assistant" : "user",
            content,
          } as ArrayElement<Messages>;
        })
        .filter((i) => i !== undefined) as Messages;
      console.log(message)

      const completion = await createCompletion(message);

      await webClient.chat.postMessage({
        channel,
        thread_ts,
        text: completion.data.choices.slice(-1)[0].message?.content,
      })

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
