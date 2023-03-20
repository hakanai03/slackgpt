import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
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
