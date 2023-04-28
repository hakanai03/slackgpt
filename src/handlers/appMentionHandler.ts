import { SlackEventMiddlewareArgs } from "@slack/bolt";
import { ConversationsRepliesResponse } from "@slack/web-api";
import { Mode } from "fs";
import { CreateChatCompletionRequest } from "openai";
import {
  createCompletion as createCompletionFirstKey,
  createCompletionWithSecondKey,
  Messages,
} from "../lib/openai";
import { useSlackApi } from "../lib/slack/apiClient";
import { extractStatementFromSlackMessage } from "../lib/slack/utils/extractStatementFromSlackMessage";
import { formatStatementForOpenAIMessage } from "../lib/slack/utils/formatStatementForOpenAI";

// ref: https://platform.openai.com/docs/models/model-endpoint-compatibility
const models = [
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0301",
] as const;

type Model = typeof models[number];

const getModelWithSpacesRegExp = (model: Mode): RegExp => {
  return new RegExp(`^[\\s\\u3000]*${model}([\\s\\u3000])+`);
};

const findModel = (str: string): Model | undefined => {
  return models.find((model) => {
    return getModelWithSpacesRegExp(model).test(str);
  });
};

const removeModelFromFirstMessage = (
  messages: Messages,
  model: typeof models[number]
): Messages => {
  const firstMessage = messages[0];
  const modelWithSpaces = getModelWithSpacesRegExp(model);

  if (messages.length === 0 || !modelWithSpaces.test(firstMessage.content)) {
    return messages;
  }

  return [
    {
      ...firstMessage,
      content: firstMessage.content.replace(modelWithSpaces, ""),
    },
    ...messages.slice(1),
  ];
};

type SlackMessage = NonNullable<ConversationsRepliesResponse["messages"]>;

/**
 * SlackのメッセージからOpenAIの発言を作成するためのリクエストを作成する
 *
 * @param slackMessages Slackのメッセージ
 * @param user_id ユーザーID
 * @param bot_id botのID, 指定された場合はbotの発言とユーザーからbotへのメンションのみを対象とする. 指定されない場合は全てのメッセージを対象とする(botへのDMを想定)
 * @returns OpenAIの発言を作成するためのリクエスト
 */
const makeCompletionRequestFromSlackMessage = (
  slackMessages: SlackMessage,
  user_id: string,
  bot_id?: string
): CreateChatCompletionRequest => {
  const messages = slackMessages
    .filter(
      (message) =>
        bot_id === undefined || // bot_idが指定されていない場合は全てのメッセージを対象とする
        message.bot_id === bot_id || // botの発言か
        message.text?.includes(`<@${user_id}>`) // ユーザーからbotへのメンションか
    )
    .map((message) => extractStatementFromSlackMessage(message, user_id))
    .filter((message) => message.text !== "") // 空の発言を除外
    .map((message) => formatStatementForOpenAIMessage(message));

  const model = findModel(messages[0].content) || "gpt-3.5-turbo";
  const completionRequest: CreateChatCompletionRequest = {
    model,
    messages: removeModelFromFirstMessage(messages, model),
  };
  return completionRequest;
};

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
      ts: thread_ts || ts,
    });
    if (!result.messages) throw new Error();

    const completionRequest = makeCompletionRequestFromSlackMessage(
      result.messages,
      user_id,
      bot_id
    );
    //会話がない場合何もしない
    if (completionRequest.messages.length === 0) return;

    const createCompletion =
      findModel(completionRequest.messages[0].content) === "gpt-4"
        ? createCompletionWithSecondKey
        : createCompletionFirstKey;

    const completion = await createCompletion(completionRequest);
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
    console.error(error);
  }
};
