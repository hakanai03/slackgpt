import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import { getEnv } from "./env";

const configuration = new Configuration({
  apiKey: getEnv().openaiApiKey,
});

const secondKey = getEnv().openaiApiKeySecond;

if (secondKey === undefined) {
  console.log("[INFO] Second key is not set. Using first key instead.")
}

const configurationWithSecondKey = new Configuration({
  apiKey: secondKey || getEnv().openaiApiKey,
})

const openai = new OpenAIApi(configuration);
const openaiWithSecondKey = new OpenAIApi(configurationWithSecondKey);

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
