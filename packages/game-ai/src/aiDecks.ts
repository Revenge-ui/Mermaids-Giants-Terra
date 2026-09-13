import type { DeckSubmission } from "@riftbound/shared";

// AI 拥有独立配置；服务器会像校验真人卡组一样重新校验它。
export const NORMAL_AI_DECK: DeckSubmission = {
  deckId: "AI_GIANT_NORMAL_V2",
  faction: "GIANT",
  cards: {
    "GIA-M-001": 2, "GIA-M-002": 2, "GIA-M-003": 2, "GIA-M-004": 2,
    "GIA-M-005": 2, "GIA-M-006": 2, "GIA-M-007": 2, "GIA-M-008": 2,
    "GIA-M-009": 2, "GIA-M-010": 2, "GIA-M-011": 2, "GIA-M-012": 2,
    "GIA-M-013": 2, "GIA-M-014": 2, "GEN-S-001": 2
  }
};
