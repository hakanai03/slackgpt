import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const generateCompletion = async (
  messages: CreateChatCompletionRequest["messages"]
): Promise<void> => {
  openai.createChatCompletion({
    messages,
    model: "gpt-3.5-turbo",
  });
};
