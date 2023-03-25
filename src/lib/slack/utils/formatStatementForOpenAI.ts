import { ArrayElement } from "../../../types/ArrayElement";
import { Messages } from "../../openai";
import { Statement } from "./Statement";

export const formatStatementForOpenAIMessage = (
  statement: Statement
): ArrayElement<Messages> => {
  return {
    role: statement.role,
    content: statement.text,
  };
};
