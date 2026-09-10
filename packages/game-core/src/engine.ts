import {
  ErrorCode,
  type ActionTarget,
  type CardDefinition,
  type CardView,
  type GameEvent,
  type MinionCardDefinition,
  type PlayerAction,
  type PlayerViewState,
  type PublicPlayerState,
  type SpellCardDefinition
} from "@riftbound/shared";
import { DEFAULT_DECK_DEFINITION_IDS, getCardDefinition } from "./cards/database.js";
import { GameRuleError } from "./GameRuleError.js";
import { SeededRandom, type RandomProvider } from "./random/RandomProvider.js";
import type { CardInstance, GamePlayer, GameResult, GameState, MinionInstance, PlayerState } from "./state.js";

const MAX_HERO_HEALTH = 30;
const MAX_MANA = 10;
const MAX_BOARD_SIZE = 7;

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    deck: player.deck.map((card) => ({ ...card })),
    hand: player.hand.map((card) => ({ ...card })),
    board: player.board.map((minion) => ({ ...minion }))
  };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    players: [clonePlayer(state.players[0]), clonePlayer(state.players[1])]
  };
}

export function createDeckInstances(gameId: string, playerId: string, definitionIds: readonly string[], random: RandomProvider): CardInstance[] {
  const cards = definitionIds.map((definitionId, index) => {
    getCardDefinition(definitionId);
    return {
    instanceId: `${gameId}_${playerId}_CARD_${String(index + 1).padStart(3, "0")}`,
    definitionId
    };
  });
  return random.shuffle(cards);
}

function newPlayer(gameId: string, player: GamePlayer, random: RandomProvider): PlayerState {
  return {
    playerId: player.playerId,
    name: player.name,
    health: MAX_HERO_HEALTH,
    mana: 0,
    maxMana: 0,
    deck: createDeckInstances(gameId, player.playerId, player.deckDefinitionIds ?? DEFAULT_DECK_DEFINITION_IDS, random),
    hand: [],
    board: []
  };
}

function playerById(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new GameRuleError(ErrorCode.PLAYER_NOT_FOUND);
  return player;
}

function opponentOf(state: GameState, playerId: string): PlayerState {
  const opponent = state.players.find((candidate) => candidate.playerId !== playerId);
  if (!opponent) throw new GameRuleError(ErrorCode.PLAYER_NOT_FOUND);
  return opponent;
}

function requireTurn(state: GameState, playerId: string): PlayerState {
  if (state.status !== "PLAYING") throw new GameRuleError(ErrorCode.GAME_ALREADY_OVER);
  if (state.currentPlayerId !== playerId) throw new GameRuleError(ErrorCode.NOT_YOUR_TURN);
  return playerById(state, playerId);
}

function drawCard(state: GameState, playerId: string, events: GameEvent[]): void {
  const player = playerById(state, playerId);
  const card = player.deck.shift();
  if (!card) return;
  player.hand.push(card);
  events.push({
    type: "CARD_DRAWN",
    playerId,
    cardInstanceId: card.instanceId,
    definitionId: card.definitionId
  });
}

function startTurn(state: GameState, playerId: string, events: GameEvent[]): void {
  const player = playerById(state, playerId);
  player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
  player.mana = player.maxMana;
  player.board.forEach((minion) => { minion.canAttack = true; });
  state.currentPlayerId = playerId;
  drawCard(state, playerId, events);
  events.push({ type: "TURN_STARTED", playerId, turn: state.turn });
}

export function createGame(
  gameId: string,
  roomId: string,
  players: [GamePlayer, GamePlayer],
  seed: number
): GameResult {
  const random = new SeededRandom(seed);
  const states: [PlayerState, PlayerState] = [
    newPlayer(gameId, players[0], random),
    newPlayer(gameId, players[1], random)
  ];
  const firstIndex = random.int(2);
  const secondIndex = firstIndex === 0 ? 1 : 0;
  const state: GameState = {
    gameId,
    roomId,
    turn: 1,
    currentPlayerId: states[firstIndex].playerId,
    status: "PLAYING",
    players: states,
    randomSeed: seed,
    revision: 0
  };
  const events: GameEvent[] = [{ type: "GAME_STARTED", gameId, firstPlayerId: state.currentPlayerId }];
  for (let count = 0; count < 3; count += 1) drawCard(state, states[firstIndex].playerId, events);
  for (let count = 0; count < 4; count += 1) drawCard(state, states[secondIndex].playerId, events);
  startTurn(state, states[firstIndex].playerId, events);
  return { state, events };
}

function validateSpellTarget(state: GameState, player: PlayerState, spell: SpellCardDefinition, target?: ActionTarget): void {
  if (spell.effect.type === "DEAL_DAMAGE") {
    const opponent = opponentOf(state, player.playerId);
    if (!target || target.playerId !== opponent.playerId) throw new GameRuleError(ErrorCode.INVALID_TARGET);
    if (target.type === "MINION" && !opponent.board.some((minion) => minion.instanceId === target.instanceId)) {
      throw new GameRuleError(ErrorCode.MINION_NOT_FOUND);
    }
  }
  if (spell.effect.type === "BUFF") {
    if (!target || target.type !== "MINION" || target.playerId !== player.playerId) {
      throw new GameRuleError(ErrorCode.INVALID_TARGET);
    }
    if (!player.board.some((minion) => minion.instanceId === target.instanceId)) {
      throw new GameRuleError(ErrorCode.MINION_NOT_FOUND);
    }
  }
}

function removeDeadMinions(state: GameState, events: GameEvent[]): void {
  state.players.forEach((player) => {
    const dead = player.board.filter((minion) => minion.health <= 0);
    dead.forEach((minion) => events.push({ type: "MINION_DIED", playerId: player.playerId, instanceId: minion.instanceId }));
    player.board = player.board.filter((minion) => minion.health > 0);
  });
}

function applyDamage(state: GameState, sourceId: string, target: ActionTarget, amount: number, events: GameEvent[]): void {
  const targetPlayer = playerById(state, target.playerId);
  if (target.type === "HERO") {
    targetPlayer.health -= amount;
    events.push({ type: "DAMAGE_DEALT", sourceId, targetId: targetPlayer.playerId, amount });
    return;
  }
  const minion = targetPlayer.board.find((candidate) => candidate.instanceId === target.instanceId);
  if (!minion) throw new GameRuleError(ErrorCode.MINION_NOT_FOUND);
  minion.health -= amount;
  events.push({ type: "DAMAGE_DEALT", sourceId, targetId: minion.instanceId, amount });
}

function heal(player: PlayerState, amount: number, events: GameEvent[]): void {
  const healed = Math.min(amount, MAX_HERO_HEALTH - player.health);
  player.health += healed;
  events.push({ type: "HEAL_APPLIED", targetId: player.playerId, amount: healed });
}

function summonMinion(player: PlayerState, card: CardInstance, definition: MinionCardDefinition, events: GameEvent[]): void {
  const minion: MinionInstance = {
    instanceId: card.instanceId,
    definitionId: definition.id,
    attack: definition.attack,
    health: definition.health,
    maxHealth: definition.health,
    canAttack: false
  };
  player.board.push(minion);
  events.push({ type: "MINION_SUMMONED", playerId: player.playerId, instanceId: minion.instanceId, definitionId: definition.id });
}

function applySpell(state: GameState, player: PlayerState, card: CardInstance, definition: SpellCardDefinition, target: ActionTarget | undefined, events: GameEvent[]): void {
  const effect = definition.effect;
  if (effect.type === "HEAL") heal(player, effect.amount, events);
  if (effect.type === "DRAW_CARD") {
    for (let count = 0; count < effect.amount; count += 1) drawCard(state, player.playerId, events);
  }
  if (effect.type === "BUFF" && target?.type === "MINION") {
    const minion = player.board.find((candidate) => candidate.instanceId === target.instanceId)!;
    minion.attack += effect.attack;
    minion.health += effect.health;
    minion.maxHealth += effect.health;
  }
  if (effect.type === "DEAL_DAMAGE" && target) applyDamage(state, card.instanceId, target, effect.amount, events);
}

function checkGameOver(state: GameState, events: GameEvent[]): void {
  const defeated = state.players.find((player) => player.health <= 0);
  if (!defeated || state.status === "FINISHED") return;
  const winner = opponentOf(state, defeated.playerId);
  state.status = "FINISHED";
  state.winnerId = winner.playerId;
  events.push({ type: "GAME_OVER", winnerId: winner.playerId });
}

function playCard(state: GameState, action: Extract<PlayerAction, { type: "PLAY_CARD" }>, events: GameEvent[]): void {
  const player = requireTurn(state, action.playerId);
  const handIndex = player.hand.findIndex((card) => card.instanceId === action.cardInstanceId);
  if (handIndex < 0) throw new GameRuleError(ErrorCode.CARD_NOT_IN_HAND);
  const card = player.hand[handIndex]!;
  const definition = getCardDefinition(card.definitionId);
  if (player.mana < definition.cost) throw new GameRuleError(ErrorCode.NOT_ENOUGH_MANA);
  if (definition.type === "MINION" && player.board.length >= MAX_BOARD_SIZE) throw new GameRuleError(ErrorCode.BOARD_FULL);
  if (definition.type === "SPELL") validateSpellTarget(state, player, definition, action.target);

  player.mana -= definition.cost;
  player.hand.splice(handIndex, 1);
  events.push({ type: "CARD_PLAYED", playerId: player.playerId, cardInstanceId: card.instanceId, definitionId: definition.id });
  events.push({ type: "MANA_SPENT", playerId: player.playerId, amount: definition.cost });
  if (definition.type === "MINION") summonMinion(player, card, definition, events);
  else applySpell(state, player, card, definition, action.target, events);
  removeDeadMinions(state, events);
  checkGameOver(state, events);
}

function attack(state: GameState, action: Extract<PlayerAction, { type: "ATTACK" }>, events: GameEvent[]): void {
  const player = requireTurn(state, action.playerId);
  const opponent = opponentOf(state, action.playerId);
  const attacker = player.board.find((minion) => minion.instanceId === action.attackerId);
  if (!attacker) throw new GameRuleError(ErrorCode.MINION_NOT_FOUND);
  if (!attacker.canAttack) throw new GameRuleError(ErrorCode.MINION_CANNOT_ATTACK);
  if (action.target.playerId !== opponent.playerId) throw new GameRuleError(ErrorCode.INVALID_TARGET);

  if (action.target.type === "MINION") {
    const target = action.target;
    const defender = opponent.board.find((minion) => minion.instanceId === target.instanceId);
    if (!defender) throw new GameRuleError(ErrorCode.MINION_NOT_FOUND);
    attacker.canAttack = false;
    const defenderAttack = defender.attack;
    applyDamage(state, attacker.instanceId, target, attacker.attack, events);
    applyDamage(state, defender.instanceId, { type: "MINION", playerId: player.playerId, instanceId: attacker.instanceId }, defenderAttack, events);
    removeDeadMinions(state, events);
  } else {
    attacker.canAttack = false;
    applyDamage(state, attacker.instanceId, action.target, attacker.attack, events);
  }
  checkGameOver(state, events);
}

function endTurn(state: GameState, action: Extract<PlayerAction, { type: "END_TURN" }>, events: GameEvent[]): void {
  requireTurn(state, action.playerId);
  const opponent = opponentOf(state, action.playerId);
  events.push({ type: "TURN_ENDED", playerId: action.playerId, turn: state.turn });
  state.turn += 1;
  startTurn(state, opponent.playerId, events);
}

function surrender(state: GameState, action: Extract<PlayerAction, { type: "SURRENDER" }>, events: GameEvent[]): void {
  if (state.status !== "PLAYING") throw new GameRuleError(ErrorCode.GAME_ALREADY_OVER);
  playerById(state, action.playerId);
  const winner = opponentOf(state, action.playerId);
  state.status = "FINISHED";
  state.winnerId = winner.playerId;
  events.push({ type: "PLAYER_SURRENDERED", playerId: action.playerId });
  events.push({ type: "GAME_OVER", winnerId: winner.playerId });
}

export function executeAction(currentState: GameState, action: PlayerAction): GameResult {
  const state = cloneGameState(currentState);
  const events: GameEvent[] = [];
  if (action.type === "PLAY_CARD") playCard(state, action, events);
  else if (action.type === "ATTACK") attack(state, action, events);
  else if (action.type === "END_TURN") endTurn(state, action, events);
  else if (action.type === "SURRENDER") surrender(state, action, events);
  else throw new GameRuleError(ErrorCode.INVALID_ACTION);
  state.revision += 1;
  return { state, events };
}

function cardView(card: CardInstance): CardView {
  const definition: CardDefinition = getCardDefinition(card.definitionId);
  return { ...definition, instanceId: card.instanceId, definitionId: card.definitionId };
}

function publicPlayer(player: PlayerState): PublicPlayerState {
  return {
    playerId: player.playerId,
    name: player.name,
    health: player.health,
    mana: player.mana,
    maxMana: player.maxMana,
    deckCount: player.deck.length,
    handCount: player.hand.length,
    board: player.board.map((minion) => {
      const definition = getCardDefinition(minion.definitionId);
      return {
        ...minion,
        nameKey: definition.nameKey,
        rune: definition.rune
      };
    })
  };
}

export function createPlayerView(state: GameState, viewerId: string): PlayerViewState {
  const you = playerById(state, viewerId);
  const opponent = opponentOf(state, viewerId);
  return {
    gameId: state.gameId,
    roomId: state.roomId,
    you: { ...publicPlayer(you), hand: you.hand.map(cardView) },
    opponent: publicPlayer(opponent),
    currentPlayerId: state.currentPlayerId,
    turn: state.turn,
    status: state.status,
    winnerId: state.winnerId,
    stateRevision: state.revision,
    opponentConnected: true
  };
}

export function createPlayerEvents(events: readonly GameEvent[], viewerId: string): GameEvent[] {
  return events.map((event) => {
    if (event.type === "CARD_DRAWN" && event.playerId !== viewerId) {
      return { type: "CARD_DRAWN", playerId: event.playerId };
    }
    return { ...event };
  });
}
