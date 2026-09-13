import { LRT_GIFT_PACK_ID } from "./data/packDefinitions";

export interface PackInventory {
  [packId: string]: number;
}

export interface GiftState {
  lrtGiftClaimed: boolean;
}

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

const PACK_INVENTORY_KEY = "riftbound.packInventory.v0.1";
const GIFT_STATE_KEY = "riftbound.giftState.v0.1";
export const LRT_GIFT_PACK_COUNT = 50;

export function loadPackInventory(storage: ReadStorage): PackInventory {
  try {
    const raw = storage.getItem(PACK_INVENTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([id, count]) => [id, Math.max(0, Math.floor(Number(count) || 0))]));
  } catch { return {}; }
}

export function savePackInventory(storage: WriteStorage, inventory: PackInventory): void {
  storage.setItem(PACK_INVENTORY_KEY, JSON.stringify(inventory));
}

export function loadGiftState(storage: ReadStorage): GiftState {
  try {
    const raw = storage.getItem(GIFT_STATE_KEY);
    return raw ? { lrtGiftClaimed: JSON.parse(raw)?.lrtGiftClaimed === true } : { lrtGiftClaimed: false };
  } catch { return { lrtGiftClaimed: false }; }
}

export function saveGiftState(storage: WriteStorage, state: GiftState): void {
  storage.setItem(GIFT_STATE_KEY, JSON.stringify(state));
}

export function claimLrtGift(storage: ReadStorage & WriteStorage): { claimed: boolean; inventory: PackInventory; giftState: GiftState } {
  const giftState = loadGiftState(storage);
  const inventory = loadPackInventory(storage);
  if (giftState.lrtGiftClaimed) return { claimed: false, inventory, giftState };
  const nextInventory = { ...inventory, [LRT_GIFT_PACK_ID]: (inventory[LRT_GIFT_PACK_ID] ?? 0) + LRT_GIFT_PACK_COUNT };
  const nextGiftState = { lrtGiftClaimed: true };
  savePackInventory(storage, nextInventory);
  saveGiftState(storage, nextGiftState);
  return { claimed: true, inventory: nextInventory, giftState: nextGiftState };
}

export function consumePack(storage: WriteStorage, inventory: PackInventory, packId: string): PackInventory | null {
  const count = inventory[packId] ?? 0;
  if (count <= 0) return null;
  const next = { ...inventory, [packId]: count - 1 };
  savePackInventory(storage, next);
  return next;
}

export function consumePacks(storage: WriteStorage, inventory: PackInventory, packId: string, amount: number): PackInventory | null {
  const count = inventory[packId] ?? 0;
  if (!Number.isInteger(amount) || amount <= 0 || count < amount) return null;
  const next = { ...inventory, [packId]: count - amount };
  savePackInventory(storage, next);
  return next;
}
