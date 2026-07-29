import { supabase } from './supabaseClient';
import type { CharacterSlot, MemberEquippedItemRow, ShopItemRow } from '../types/database';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// sprite_key is either a CSS hex color (body/background/top/pants/shoes) or
// a single emoji (head/weapon/shield/accessory1/accessory2) -- callers need
// to tell these apart to render a color swatch instead of printing the hex
// string as literal text.
export function isHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

export class ShopActionError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function mapShopErrorToKey(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('already_owned')) return 'shop.error.alreadyOwned';
  if (m.includes('insufficient_points')) return 'shop.error.insufficientPoints';
  if (m.includes('currency_not_available')) return 'shop.error.currencyNotAvailable';
  if (m.includes('item_not_owned')) return 'shop.error.itemNotOwned';
  return 'shop.error.unknown';
}

export async function getShopItems(): Promise<ShopItemRow[]> {
  const { data, error } = await supabase.from('shop_items').select('*').order('slot').order('sort_order');
  if (error) throw new ShopActionError('shop.error.unknown');
  return (data ?? []) as ShopItemRow[];
}

export async function getOwnedItemIds(userId: string, familyId: string): Promise<Set<string>> {
  const { data } = await supabase.from('member_owned_items').select('item_id').eq('user_id', userId).eq('family_id', familyId);
  return new Set((data ?? []).map((r) => r.item_id as string));
}

export async function getEquippedItems(userId: string, familyId: string): Promise<MemberEquippedItemRow[]> {
  const { data } = await supabase.from('member_equipped_items').select('*').eq('user_id', userId).eq('family_id', familyId);
  return (data ?? []) as MemberEquippedItemRow[];
}

// Lighter than getShopItems() + getEquippedItems() together -- callers that
// only need to show "which title is currently equipped" (e.g. the dashboard
// header) don't need the whole shop catalog just to look up one name. Two
// round trips instead of one join -- the hand-maintained Database type here
// declares no table Relationships, so supabase-js can't type an embedded
// `shop_items(name)` select the way a CLI-generated schema would.
export async function getEquippedTitleName(userId: string, familyId: string): Promise<string | null> {
  const { data: equipped } = await supabase
    .from('member_equipped_items')
    .select('item_id')
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .eq('slot', 'title')
    .maybeSingle();
  if (!equipped) return null;
  const { data: item } = await supabase.from('shop_items').select('name').eq('id', equipped.item_id).maybeSingle();
  return item?.name ?? null;
}

export async function purchaseItem(familyId: string, itemId: string): Promise<void> {
  const { error } = await supabase.rpc('purchase_item', { p_family_id: familyId, p_item_id: itemId });
  if (error) throw new ShopActionError(mapShopErrorToKey(error.message));
}

export async function equipItem(familyId: string, itemId: string): Promise<void> {
  const { error } = await supabase.rpc('equip_item', { p_family_id: familyId, p_item_id: itemId });
  if (error) throw new ShopActionError(mapShopErrorToKey(error.message));
}

export async function unequipItem(familyId: string, slot: CharacterSlot): Promise<void> {
  const { error } = await supabase.rpc('unequip_item', { p_family_id: familyId, p_slot: slot });
  if (error) throw new ShopActionError(mapShopErrorToKey(error.message));
}
