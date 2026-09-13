import { translateZhCn, type DeckValidationError } from "@riftbound/shared";
import { CARD_CATALOG } from "./data/cardCatalog";

function cardName(cardId?: string): string {
  const card = CARD_CATALOG.find((candidate) => candidate.id === cardId);
  return card ? translateZhCn(card.nameKey) : cardId ?? "未知卡牌";
}

export function deckValidationMessage(error: DeckValidationError): string {
  if (error.code === "TOO_FEW_CARDS") return `卡组还差 ${(error.expected ?? 30) - (error.actual ?? 0)} 张`;
  if (error.code === "TOO_MANY_CARDS") return `卡组超过 30 张（当前 ${error.actual ?? 0} 张）`;
  if (error.code === "UNKNOWN_CARD") return `存在未知卡牌：${cardName(error.cardId)}`;
  if (error.code === "INVALID_COUNT") return `${cardName(error.cardId)}的数量无效`;
  if (error.code === "COPY_LIMIT") return `${cardName(error.cardId)}最多携带 ${error.expected ?? 2} 张`;
  if (error.code === "FACTION_MISMATCH") return error.cardId ? `${cardName(error.cardId)}与卡组阵营不符` : "卡组阵营尚未确定或包含多个阵营";
  return `你只拥有 ${error.expected ?? 0} 张${cardName(error.cardId)}`;
}
