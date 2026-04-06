import { ManaType } from '@/types/enums';
import type { ManaPoolInfo } from '@/types/models';
import type { SymbolPaymentEntry } from '@/types/models';

const SYMBOL_TO_MANA: Record<string, ManaType> = {
  W: ManaType.WHITE,
  U: ManaType.BLUE,
  B: ManaType.BLACK,
  R: ManaType.RED,
  G: ManaType.GREEN,
  C: ManaType.COLORLESS,
};

/**
 * Build mana payment entries from a mana cost and available pool.
 * Each cost symbol gets one SymbolPaymentEntry.
 * Generic mana (numbers like "1", "2") are paid with whatever's available.
 */
export function buildManaPayment(
  manaCost: string[],
  pool: ManaPoolInfo,
): SymbolPaymentEntry[] {
  const available: Record<string, number> = {
    [ManaType.WHITE]: pool.white.unrestricted,
    [ManaType.BLUE]: pool.blue.unrestricted,
    [ManaType.BLACK]: pool.black.unrestricted,
    [ManaType.RED]: pool.red.unrestricted,
    [ManaType.GREEN]: pool.green.unrestricted,
    [ManaType.COLORLESS]: pool.colorless.unrestricted,
  };

  const payments: SymbolPaymentEntry[] = [];

  // Pay colored costs first
  for (const symbol of manaCost) {
    const manaType = SYMBOL_TO_MANA[symbol];
    if (manaType) {
      payments.push({ paidWith: [manaType] });
      available[manaType] = Math.max(0, available[manaType] - 1);
    }
  }

  // Pay generic costs (numeric symbols like "1", "2", etc.)
  for (const symbol of manaCost) {
    if (SYMBOL_TO_MANA[symbol]) continue; // already handled
    const amount = parseInt(symbol, 10);
    if (isNaN(amount)) continue;
    for (let i = 0; i < amount; i++) {
      // Find any available mana
      const type = Object.keys(available).find((k) => available[k] > 0);
      if (type) {
        payments.push({ paidWith: [type as ManaType] });
        available[type] = available[type] - 1;
      } else {
        // Not enough mana — send colorless as placeholder
        payments.push({ paidWith: [ManaType.COLORLESS] });
      }
    }
  }

  return payments;
}
