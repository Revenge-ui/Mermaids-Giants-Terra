import { ErrorCode } from "@riftbound/shared";

const messages: Record<ErrorCode, string> = {
  [ErrorCode.NOT_YOUR_TURN]: "现在是对手的回合。",
  [ErrorCode.CARD_NOT_IN_HAND]: "这张卡不在你的手牌中。",
  [ErrorCode.NOT_ENOUGH_MANA]: "法力不足。",
  [ErrorCode.BOARD_FULL]: "战场已经满了。",
  [ErrorCode.INVALID_TARGET]: "不能选择这个目标。",
  [ErrorCode.MINION_NOT_FOUND]: "目标随从不存在。",
  [ErrorCode.MINION_CANNOT_ATTACK]: "这个随从本回合不能攻击。",
  [ErrorCode.PLAYER_NOT_FOUND]: "找不到玩家。",
  [ErrorCode.ROOM_NOT_FOUND]: "房间不存在，请检查房间码。",
  [ErrorCode.ROOM_FULL]: "房间已经满了。",
  [ErrorCode.ALREADY_IN_ROOM]: "你已经在一个房间中。",
  [ErrorCode.NOT_IN_ROOM]: "你当前不在房间中。",
  [ErrorCode.GAME_NOT_STARTED]: "游戏尚未开始。",
  [ErrorCode.GAME_ALREADY_OVER]: "这局游戏已经结束。",
  [ErrorCode.PLAYER_ID_MISMATCH]: "玩家身份验证失败。",
  [ErrorCode.INVALID_ACTION]: "无法识别这个操作。",
  [ErrorCode.OPPONENT_DISCONNECTED]: "对手已断开连接，正在等待重连。",
  [ErrorCode.INVALID_SESSION]: "重连凭证无效，请重新进入房间。",
  [ErrorCode.RECONNECT_EXPIRED]: "重连等待时间已经结束。",
  [ErrorCode.INVALID_PAYLOAD]: "服务器拒绝了格式错误的请求。",
  [ErrorCode.INVALID_DECK]: "服务器判定这套卡组不合法，请重新检查卡牌数量。",
  [ErrorCode.RATE_LIMITED]: "操作过于频繁，请稍后再试。",
  [ErrorCode.INTERNAL_ERROR]: "服务器暂时无法处理这个操作。"
};

export function errorMessage(code: ErrorCode | undefined): string {
  return code ? messages[code] : messages[ErrorCode.INTERNAL_ERROR];
}
