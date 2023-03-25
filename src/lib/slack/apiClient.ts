import { WebClient } from "@slack/web-api";
import { getEnv } from "../env";

const webClient: WebClient = new WebClient(getEnv().slackBotToken);

export const useSlackApi = () => {
  return webClient;
};
