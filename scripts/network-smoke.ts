import assert from "node:assert/strict";
import {
  GameClient,
  type ActionTarget,
  type CardView,
  type DeckSubmission,
  type PlayerViewState
} from "@riftbound/shared";

const serverUrl = process.env.E2E_SERVER_URL ?? "http://localhost:3001";
const alpha = new GameClient(serverUrl);
const beta = new GameClient(serverUrl);
const testDeck: DeckSubmission = { deckId: "E2E_DECK", cards: { CARD_000001: 2, CARD_000002: 2, CARD_000003: 2, CARD_000004: 2, CARD_000005: 2, CARD_000006: 2, CARD_000007: 2, CARD_000008: 2, CARD_000009: 2, CARD_000010: 2, CARD_000011: 2, CARD_000012: 2, CARD_000015: 2, CARD_000016: 2, CARD_000017: 2 } };

function waitForConnection(client: GameClient): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connection timed out")), 5000);
    const unsubscribe = client.onConnectionChange((status) => {
      if (status !== "CONNECTED") return;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    });
    client.connect();
  });
}

function waitForUpdate(client: GameClient): Promise<PlayerViewState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Game update timed out")), 5000);
    const unsubscribe = client.onGameUpdate((state) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(state);
    });
  });
}

function spellTarget(card: CardView, state: PlayerViewState): ActionTarget | undefined | null {
  if (card.type !== "SPELL") return null;
  if (card.effect.type === "DEAL_DAMAGE") return { type: "HERO", playerId: state.opponent.playerId };
  if (card.effect.type === "BUFF") {
    const target = state.you.board[0];
    return target ? { type: "MINION", playerId: state.you.playerId, instanceId: target.instanceId } : null;
  }
  return undefined;
}

async function sendAndWait(action: () => void): Promise<[PlayerViewState, PlayerViewState]> {
  const nextAlpha = waitForUpdate(alpha);
  const nextBeta = waitForUpdate(beta);
  action();
  return Promise.all([nextAlpha, nextBeta]);
}

try {
  await Promise.all([waitForConnection(alpha), waitForConnection(beta)]);
  const created = await alpha.createRoom("E2E Alpha", testDeck);
  assert.equal(created.ok, true);
  assert.ok(created.roomId);

  const initialAlpha = waitForUpdate(alpha);
  const initialBeta = waitForUpdate(beta);
  const joined = await beta.joinRoom(created.roomId!, "E2E Beta", testDeck);
  assert.equal(joined.ok, true);
  let [stateAlpha, stateBeta] = await Promise.all([initialAlpha, initialBeta]);
  assert.equal("hand" in stateAlpha.opponent, false);
  assert.equal("hand" in stateBeta.opponent, false);

  let playedMinion = false;
  let playedSpell = false;
  let attacked = false;

  for (let step = 0; step < 50 && !(playedMinion && playedSpell && attacked); step += 1) {
    const alphaTurn = stateAlpha.currentPlayerId === stateAlpha.you.playerId;
    const currentClient = alphaTurn ? alpha : beta;
    const currentState = alphaTurn ? stateAlpha : stateBeta;

    const readyMinion = currentState.you.board.find((minion) => minion.canAttack);
    if (!attacked && readyMinion) {
      [stateAlpha, stateBeta] = await sendAndWait(() => currentClient.attack(readyMinion.instanceId, { type: "HERO", playerId: currentState.opponent.playerId }));
      attacked = true;
      continue;
    }

    const playable = currentState.you.hand.filter((card) => card.cost <= currentState.you.mana);
    const minionCard = !playedMinion ? playable.find((card) => card.type === "MINION") : undefined;
    if (minionCard) {
      [stateAlpha, stateBeta] = await sendAndWait(() => currentClient.playCard(minionCard.instanceId));
      playedMinion = true;
      continue;
    }

    const spellCard = !playedSpell ? playable.find((card) => card.type === "SPELL" && spellTarget(card, currentState) !== null) : undefined;
    if (spellCard) {
      const target = spellTarget(spellCard, currentState);
      [stateAlpha, stateBeta] = await sendAndWait(() => currentClient.playCard(spellCard.instanceId, target ?? undefined));
      playedSpell = true;
      continue;
    }

    [stateAlpha, stateBeta] = await sendAndWait(() => currentClient.endTurn());
  }

  assert.equal(playedMinion, true);
  assert.equal(playedSpell, true);
  assert.equal(attacked, true);

  const surrenderingClient = stateAlpha.status === "PLAYING" ? alpha : beta;
  [stateAlpha, stateBeta] = await sendAndWait(() => surrenderingClient.surrender());
  assert.equal(stateAlpha.status, "FINISHED");
  assert.equal(stateBeta.status, "FINISHED");
  assert.ok(stateAlpha.winnerId);
  assert.equal(stateAlpha.winnerId, stateBeta.winnerId);

  console.log(JSON.stringify({
    ok: true,
    roomId: created.roomId,
    playedMinion,
    playedSpell,
    attacked,
    winnerId: stateAlpha.winnerId
  }));
} finally {
  alpha.disconnect();
  beta.disconnect();
}
