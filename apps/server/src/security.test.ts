import assert from "node:assert/strict";
import test from "node:test";
import { SlidingWindowRateLimiter } from "./RateLimiter.js";
import { createRoomPayloadSchema, playerActionSchema, reconnectPayloadSchema } from "./validation.js";

test("runtime validation rejects malformed and unknown action fields", () => {
  assert.equal(playerActionSchema.safeParse({ type: "END_TURN", playerId: "P1" }).success, false);
  assert.equal(playerActionSchema.safeParse({
    type: "END_TURN",
    playerId: "P1",
    actionId: "ACTION_01",
    clientSequence: 1,
    enemyHealth: 0
  }).success, false);
});

test("runtime validation rejects short reconnect credentials", () => {
  assert.equal(reconnectPayloadSchema.safeParse({ roomId: "123456", playerId: "P1", sessionToken: "guess" }).success, false);
});

test("rate limiter permits normal traffic and blocks bursts", () => {
  const limiter = new SlidingWindowRateLimiter(1_000);
  assert.equal(limiter.allow("socket:action", 2, 100), true);
  assert.equal(limiter.allow("socket:action", 2, 200), true);
  assert.equal(limiter.allow("socket:action", 2, 300), false);
  assert.equal(limiter.allow("socket:action", 2, 1_201), true);
});

test("runtime validation rejects malformed deck submissions", () => {
  assert.equal(createRoomPayloadSchema.safeParse({ playerName: "甲" }).success, false);
  assert.equal(createRoomPayloadSchema.safeParse({ playerName: "甲", deck: { deckId: "D1", cards: { CARD_000001: -1 } } }).success, false);
  assert.equal(createRoomPayloadSchema.safeParse({ playerName: "甲", deck: { deckId: "D1", cards: { CARD_000001: 31 } } }).success, false);
});
