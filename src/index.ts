import { appMentionHandler } from "./handlers/appMentionHandler";
import { messageHandler } from "./handlers/messageHandler";
import { getEnv } from "./lib/env";
import { makeSlackBot } from "./lib/slack";

const { slackAppToken, slackBotToken, slackSigningSecret } = getEnv();

const bot = makeSlackBot({
  token: slackBotToken,
  appToken: slackAppToken,
  signingSecret: slackSigningSecret,
});

bot.event("app_mention", appMentionHandler);
bot.event("message", messageHandler);


bot.start();
