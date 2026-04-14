import { ManaType } from '@/types/enums';
import type { ManaPoolInfo, SymbolPaymentEntry } from '@/types/models';

const COLOR_TO_MANA: Record<string, ManaType> = {
  White: ManaType.WHITE,
  Blue: ManaType.BLUE,
  Black: ManaType.BLACK,
  Red: ManaType.RED,
  Green: ManaType.GREEN,
};

/** Parse "Colored(Red)" -> {type: RED, count: 1}, "Generic(2)" -> {type: null, count: 2}, etc. */
function parseSymbol(s: string): { type: ManaType | null; count: number } {
  const colorMatch = s.match(/^Colored\((\w+)\)$/);
  if (colorMatch) return { type: COLOR_TO_MANA[colorMatch[1]] ?? null, count: 1 };
  const genericMatch = s.match(/^Generic\((\d+)\)$/);
  if (genericMatch) return { type: null, count: parseInt(genericMatch[1], 10) };
  if (s === 'Colorless') return { type: ManaType.COLORLESS, count: 1 };
  return { type: null, count: 0 };
}

/**
 * Build mana payment from debug-formatted manaCost strings and available pool.
 * manaCost example: ["Colored(Red)", "Generic(2)"]
 */
export function buildManaPayment(manaCost: string[], pool: ManaPoolInfo): SymbolPaymentEntry[] {
  const available: Record<string, number> = {
    [ManaType.WHITE]: pool.white.unrestricted,
    [ManaType.BLUE]: pool.blue.unrestricted,
    [ManaType.BLACK]: pool.black.unrestricted,
    [ManaType.RED]: pool.red.unrestricted,
    [ManaType.GREEN]: pool.green.unrestricted,
    [ManaType.COLORLESS]: pool.colorless.unrestricted,
  };
  const parsed = manaCost.map((s) => parseSymbol(s));
  const payments: SymbolPaymentEntry[] = new Array(parsed.length);

  // Pass 1: reserve colored/colorless mana so generic doesn't steal it
  for (let i = 0; i < parsed.length; i++) {
    const { type } = parsed[i];
    if (type) {
      payments[i] = { paidWith: [type] };
      available[type] = Math.max(0, available[type] - 1);
    }
  }

  // Pass 2: fill in generic with whatever remains
  for (let i = 0; i < parsed.length; i++) {
    if (payments[i]) continue;
    const { count } = parsed[i];
    const paidWith: ManaType[] = [];
    for (let j = 0; j < count; j++) {
      const avail = Object.keys(available).find((k) => available[k] > 0);
      if (avail) {
        paidWith.push(avail as ManaType);
        available[avail]--;
      }
    }
    payments[i] = { paidWith };
  }

  return payments;
}
