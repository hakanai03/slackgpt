import { App, LogLevel } from "@slack/bolt";

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
  });
};
