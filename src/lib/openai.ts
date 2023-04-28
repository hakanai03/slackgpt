import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { getEnv } from "./env";

const configuration = new Configuration({
  apiKey: getEnv().openaiApiKey,
});

const configurationWithSecondKey = getEnv().openaiApiKeySecond
  ? new Configuration({
      apiKey: getEnv().openaiApiKeySecond,
    })
  : undefined;

const openai = new OpenAIApi(configuration);
const openaiWithSecondKey = configurationWithSecondKey ? new OpenAIApi(configurationWithSecondKey) : openai;

export type Messages = CreateChatCompletionRequest["messages"];

export const createCompletion = async (
  createChatCompletionRequest: CreateChatCompletionRequest
) => {
  console.log(Date(), createChatCompletionRequest.model, createChatCompletionRequest.messages)
  return openai.createChatCompletion(createChatCompletionRequest);
};

export const createCompletionWithSecondKey = async(
  createChatCompletionRequest: CreateChatCompletionRequest
) => {
  console.log(Date(), createChatCompletionRequest.model, createChatCompletionRequest.messages)
  return openaiWithSecondKey.createChatCompletion(createChatCompletionRequest);
}
