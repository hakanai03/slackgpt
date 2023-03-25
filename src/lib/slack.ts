import { App, LogLevel } from "@slack/bolt";
import { WebClient } from "@slack/web-api";

let webClient: WebClient;

export const makeSlackBot = ({
  token,
  appToken,
  signingSecret,
}: {
  token: string;
  appToken: string;
  signingSecret: string;
}) => {
  return new App({
    token,
    appToken,
    signingSecret,
    logLevel: LogLevel.DEBUG,
    socketMode: true,
  });
};

