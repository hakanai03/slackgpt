import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import {getEnv} from "./env";

const configuration = new Configuration({
  apiKey: getEnv().openaiApiKey,
});

const configurationWithSecondKey = getEnv().openaiApiKeySecond ? new Configuration({
  apiKey: getEnv().openaiApiKeySecond,
}) : undefined

const openai = new OpenAIApi(configuration);

export type Messages = CreateChatCompletionRequest["messages"]

export const createCompletion = async (
  messages: Messages
) => {
  return openai.createChatCompletion({
    messages,
    model: "gpt-3.5-turbo",
  });
};
