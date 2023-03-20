export const getEnv = () => {
  const {
    SLACK_BOT_TOKEN,
    SLACK_APP_TOKEN,
    SLACK_SIGNING_SECRET,
    OPENAI_API_KEY,
  } = process.env;

  if (!SLACK_BOT_TOKEN) {
    throw Error("Please set the environment variable SLACK_BOT_TOKEN.");
  }
  if (!SLACK_APP_TOKEN) {
    throw Error("Please set the environment variable SLACK_APP_TOKEN.");
  }
  if (!SLACK_SIGNING_SECRET) {
    throw Error("Please set the environment variable SLACK_SIGNING_SECRET.");
  }
  if (!OPENAI_API_KEY) {
    throw Error("Please set the environment variable OPENAI_API_KEY.");
  }

  return {
    slackBotToken: SLACK_BOT_TOKEN,
    slackAppToken: SLACK_APP_TOKEN,
    slackSigningSecret: SLACK_SIGNING_SECRET,
    openaiApiKey: OPENAI_API_KEY,
  };
};
