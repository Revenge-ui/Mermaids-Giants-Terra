import type { DeckSubmission } from "@riftbound/shared";

// AI 拥有独立配置；服务器会像校验真人卡组一样重新校验它。
export const NORMAL_AI_DECK: DeckSubmission = {
  deckId: "AI_NORMAL_V1",
  cards: {
    CARD_000001: 2, CARD_000002: 2, CARD_000003: 2, CARD_000004: 2,
    CARD_000005: 2, CARD_000006: 2, CARD_000007: 2, CARD_000008: 2,
    CARD_000009: 2, CARD_000010: 2, CARD_000011: 2, CARD_000012: 2,
    CARD_000015: 2, CARD_000016: 2, CARD_000017: 2
  }
};
