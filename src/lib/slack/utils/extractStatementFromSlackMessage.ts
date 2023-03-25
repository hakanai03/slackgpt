import {
  Accessory,
  Message,
  Block,
  AccessoryElement,
} from "@slack/web-api/dist/response/ConversationsRepliesResponse";
import {Statement} from "./Statement";

const createCodeblock = (text: string) => {
  return `\`\`\`${text}\`\`\``;
};

type TextAccessoryElement = AccessoryElement & {
  type: "text";
  text: string;
};

const filterElementTexts = (
  accessoryElements?: AccessoryElement[],
  option?: {
    code: boolean;
  }
): TextAccessoryElement[] => {
  if (!accessoryElements) return [];
  const textAccessoryElements = accessoryElements.filter(
    (accessoryElement) => accessoryElement.type === "text"
  ) as TextAccessoryElement[];
  if (option?.code) {
    return textAccessoryElements.map((elm) => ({
      ...elm,
      text: createCodeblock(elm.text),
    }));
  }
  return textAccessoryElements;
};

const filterElements = (accessories?: Accessory[]): Accessory[] => {
  if (!accessories) return [];
  return accessories.filter((accessory) =>
    ["rich_text_section", "rich_text_preformatted", "rich_text_quote"].some(
      (i) => i === accessory.type
    )
  );
};

const filterRichTextBlocks = (blocks?: Block[]): Block[] => {
  if (!blocks) return [];
  return blocks.filter((block) => block.type === "rich_text");
};

const extractText = (elements: TextAccessoryElement[]): string => {
  return elements.reduce((acc, curr, index) => {
    if (curr.type === "text") {
      acc += curr.text;
      if (index !== elements.length - 1) {
        acc += "\n";
      }
    }
    return acc;
  }, "");
};

export const extractStatementFromSlackMessage = (
  slackMessage: Message,
  bot_user_id: string
): Statement => {
  const texts = filterRichTextBlocks(slackMessage.blocks).flatMap((block) => {
    return filterElements(block.elements).flatMap((element) => {
      switch (element.type) {
        case "rich_text_quote":
        case "rich_text_preformatted":
          return filterElementTexts(element.elements, { code: true });
        default:
          return filterElementTexts(element.elements);
      }
    });
  });

  const message: Statement = {
    text: extractText(texts),
    role: slackMessage.user === bot_user_id ? "assistant" : "user",
  };
  return message;
};

