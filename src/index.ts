import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { getEnv } from "./lib/env";
import { makeSlackBot } from "./lib/slack";

const { slackAppToken, slackBotToken, slackSigningSecret, openaiApiKey } = getEnv();

const bot = makeSlackBot({
  token: slackBotToken,
  appToken: slackAppToken,
  signingSecret: slackSigningSecret,
});

const appMentionHandler = async ({
  event,
  say,
}: SlackEventMiddlewareArgs<"app_mention">) => {
  console.log(event.text);
};

bot.event("app_mention", appMentionHandler);

bot.start();
