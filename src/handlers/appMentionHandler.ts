import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { createCompletion, Messages } from "../lib/openai";
import { useSlackApi } from "../lib/slack/apiClient";
import { extractStatementFromSlackMessage } from "../lib/slack/utils/extractStatementFromSlackMessage";
import { formatStatementForOpenAIMessage } from "../lib/slack/utils/formatStatementForOpenAI";

export const appMentionHandler = async ({
  event,
}: SlackEventMiddlewareArgs<"app_mention">) => {
  const slackApi = useSlackApi();
  const { ts, thread_ts, channel } = event;

  try {
    // 👀をつける
    await slackApi.reactions.add({
      channel,
      name: "eyes",
      timestamp: ts,
    });

    const { user_id, bot_id } = await slackApi.auth.test();
    if (!user_id || !bot_id) throw new Error();

    const result = await slackApi.conversations.replies({
      channel: channel,
      ts: thread_ts || ts
    });
    if (!result.messages) throw new Error();

    const messages = result.messages
      .filter(
        (message) =>
          message.bot_id === bot_id || // botの発言か
          message.text?.includes(`<@${user_id}>`) // ユーザーからbotへのメンションか
      )
      .map((message) => extractStatementFromSlackMessage(message, user_id))
      .filter((message) => message.text !== "") // 空の発言を除外
      .map((message) => formatStatementForOpenAIMessage(message));
    if (messages.length === 0) return; // 会話がない場合は何もしない

    const completion = await createCompletion(messages);
    await slackApi.chat.postMessage({
      channel: channel,
      thread_ts: thread_ts || ts,
      text: completion.data.choices.slice(-1)[0].message?.content,
      reply_broadcast: !thread_ts,
    });
  } catch (error) {
    // slackにエラーを投稿する
    await slackApi.chat.postMessage({
      channel,
      thread_ts: ts,
      text: "[ERROR] うまく会話ができなかったよ😭",
      reply_broadcast: true,
    });
  }
};
