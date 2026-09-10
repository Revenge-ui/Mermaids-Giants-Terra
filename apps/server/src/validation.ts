import { z } from "zod";

const identifier = z.string().min(1).max(160);
const playerName = z.string().max(64);
const roomId = z.string().regex(/^\d{6}$/);
const deck = z.object({
  deckId: identifier,
  cards: z.record(z.string().min(1).max(80), z.number().int().min(0).max(30)).refine((cards) => Object.keys(cards).length <= 60)
}).strict();
const target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("HERO"), playerId: identifier }).strict(),
  z.object({ type: z.literal("MINION"), playerId: identifier, instanceId: identifier }).strict()
]);
const metadata = {
  playerId: identifier,
  actionId: z.string().min(8).max(160),
  clientSequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
};

export const createRoomPayloadSchema = z.object({ playerName, deck }).strict();
export const joinRoomPayloadSchema = z.object({ roomId, playerName, deck }).strict();
export const reconnectPayloadSchema = z.object({
  roomId,
  playerId: identifier,
  sessionToken: z.string().min(32).max(256)
}).strict();
export const playerActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PLAY_CARD"), ...metadata, cardInstanceId: identifier, target: target.optional() }).strict(),
  z.object({ type: z.literal("ATTACK"), ...metadata, attackerId: identifier, target }).strict(),
  z.object({ type: z.literal("END_TURN"), ...metadata }).strict(),
  z.object({ type: z.literal("SURRENDER"), ...metadata }).strict()
]);
