import assert from "node:assert/strict";
import { GameClient, MemorySessionStore, type DeckSubmission, type PlayerAction, type PlayerViewState } from "@riftbound/shared";

const serverUrl = process.env.E2E_SERVER_URL ?? "http://localhost:3001";
const alphaStore = new MemorySessionStore();
const betaStore = new MemorySessionStore();
const alpha = new GameClient(serverUrl, { sessionStore: alphaStore });
let beta = new GameClient(serverUrl, { sessionStore: betaStore });
const testDeck: DeckSubmission = { ...{ deckId: "E2E_DECK", faction: "MERMAID", cards: { "MER-M-001": 2, "MER-M-002": 2, "MER-M-003": 2, "MER-M-004": 2, "MER-M-005": 2, "MER-M-006": 2, "MER-M-007": 2, "MER-M-008": 2, "MER-M-009": 2, "MER-M-010": 2, "MER-M-011": 2, "MER-M-012": 2, "MER-M-013": 2, "MER-M-014": 2, "GEN-S-001": 2 } }, deckId: "RECONNECT_DECK" };

function waitConnected(client: GameClient): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connection timed out")), 5_000);
    const unsubscribe = client.onConnectionChange((status) => {
      if (status !== "CONNECTED") return;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    });
    client.connect();
  });
}

function waitUpdate(client: GameClient): Promise<PlayerViewState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Game update timed out")), 5_000);
    const unsubscribe = client.onGameUpdate((state) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(state);
    });
  });
}

function waitOpponent(client: GameClient, expected: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Opponent connection event timed out")), 5_000);
    const unsubscribe = client.onOpponentConnection((connected) => {
      if (connected !== expected) return;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    });
  });
}

try {
  await Promise.all([waitConnected(alpha), waitConnected(beta)]);
  const created = await alpha.createRoom("Reconnect Alpha", testDeck);
  assert.equal(created.ok, true);
  const alphaInitialPromise = waitUpdate(alpha);
  const betaInitialPromise = waitUpdate(beta);
  const joined = await beta.joinRoom(created.roomId!, "Reconnect Beta", testDeck);
  assert.equal(joined.ok, true);
  const [alphaInitial, betaInitial] = await Promise.all([alphaInitialPromise, betaInitialPromise]);

  const disconnectedNotice = waitOpponent(alpha, false);
  beta.disconnect();
  await disconnectedNotice;

  const recovered = new GameClient(serverUrl, { sessionStore: betaStore });
  const recoveredUpdate = waitUpdate(recovered);
  const reconnectedNotice = waitOpponent(alpha, true);
  await waitConnected(recovered);
  const restored = await recoveredUpdate;
  await reconnectedNotice;

  assert.equal(restored.gameId, betaInitial.gameId);
  assert.equal(restored.turn, betaInitial.turn);
  assert.equal(restored.stateRevision, betaInitial.stateRevision);
  assert.deepEqual(restored.you.hand, betaInitial.you.hand);
  assert.equal("hand" in restored.opponent, false);

  const alphaAfterFirstConfirm = waitUpdate(alpha);
  const betaAfterFirstConfirm = waitUpdate(recovered);
  await alpha.confirmMulligan([]);
  await Promise.all([alphaAfterFirstConfirm, betaAfterFirstConfirm]);
  const alphaPlaying = waitUpdate(alpha);
  const betaPlaying = waitUpdate(recovered);
  await recovered.confirmMulligan([]);
  const [playingAlpha, playingBeta] = await Promise.all([alphaPlaying, betaPlaying]);
  assert.equal(playingAlpha.status, "PLAYING");

  const current = playingAlpha.currentPlayerId === playingAlpha.you.playerId ? alpha : recovered;
  const alphaNext = waitUpdate(alpha);
  const recoveredNext = waitUpdate(recovered);
  const duplicateAction: PlayerAction = {
    type: "END_TURN",
    playerId: current.getPlayerId()!,
    actionId: `E2E_DUPLICATE_${Date.now()}`,
    clientSequence: 999
  };
  const actionResult = await current.sendAction(duplicateAction);
  assert.equal(actionResult.ok, true);
  const [nextAlpha, nextBeta] = await Promise.all([alphaNext, recoveredNext]);
  assert.equal(nextAlpha.stateRevision, playingAlpha.stateRevision + 1);
  assert.equal(nextBeta.stateRevision, playingBeta.stateRevision + 1);
  const duplicateResult = await current.sendAction(duplicateAction);
  assert.equal(duplicateResult.ok, true);
  assert.equal(duplicateResult.duplicate, true);
  assert.equal(duplicateResult.stateRevision, nextBeta.stateRevision);

  console.log(JSON.stringify({
    ok: true,
    roomId: created.roomId,
    restoredGameId: restored.gameId,
    restoredRevision: restored.stateRevision,
    nextRevision: nextBeta.stateRevision,
    duplicateProtected: duplicateResult.duplicate
  }));
  recovered.disconnect();
} finally {
  alpha.disconnect();
  beta.disconnect();
}
