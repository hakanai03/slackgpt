import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { createCompletion, Messages } from "../lib/openai";
import { useSlackApi } from "../lib/slack/apiClient";
import { extractStatementFromSlackMessage } from "../lib/slack/utils/extractStatementFromSlackMessage";
import { formatStatementForOpenAIMessage } from "../lib/slack/utils/formatStatementForOpenAI";

export const messageHandler = async ({
  event,
}: SlackEventMiddlewareArgs<"message">) => {
  const slackApi = useSlackApi();
  const { ts, channel } = event;
  // 型情報不備のため
  const { thread_ts } = event as { thread_ts?: string };

  try {
    // 👀をつける
    await slackApi.reactions.add({
      channel,
      name: "eyes",
      timestamp: ts,
    });

    const { user_id, bot_id } = await slackApi.auth.test();
    if (!user_id) throw new Error();

    if (thread_ts) {
      // This is a threaded mention
      const result = await slackApi.conversations.replies({
        channel: channel,
        ts: thread_ts,
      });
      console.log(result);
      if (!result.messages) throw new Error();

      const messages: Messages = result.messages
        .map((message) => extractStatementFromSlackMessage(message, user_id))
        .filter((message) => message.text !== "") // 空の発言を除外
        .map((message) => formatStatementForOpenAIMessage(message));
      if (messages.length === 0) return; // 会話がない場合は何もしない

      const completion = await createCompletion({
        messages,
        model: "gpt-3.5-turbo",
      });
      await slackApi.chat.postMessage({
        channel,
        thread_ts,
        text: completion.data.choices.slice(-1)[0].message?.content,
      });
    } else {
      const result = await slackApi.conversations.replies({
        channel: channel,
        ts,
      });
      if (!result.messages) throw new Error();

      const messages = result.messages
        .map((message) => extractStatementFromSlackMessage(message, user_id))
        .filter((message) => message.text !== "") // 空の発言を除外
        .map((message) => formatStatementForOpenAIMessage(message));
      if (messages.length === 0) return; // 会話がない場合は何もしない

      const completion = await createCompletion({
        messages,
        model: "gpt-3.5-turbo",
      });
      await slackApi.chat.postMessage({
        channel,
        thread_ts: ts,
        text: completion.data.choices.slice(-1)[0].message?.content,
      });
    }
  } catch (error) {
    console.error("Error sending reply in a new thread:", error);
  }
};
