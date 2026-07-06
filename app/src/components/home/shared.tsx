// Shared bits for the Home (chores) pane: freshness color mapping, the
// "last completed by" chip, the household split math, and the recipe
// ingredient parsing helpers (coreName / sameIngredient) ported verbatim from
// the legacy inline script.

import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fonts, type Palette } from '@/theme';
import type { Freshness } from '@/utils/compute';
import { toDateStr } from '@/utils/dates';
import type { ChoreLogEntry, RecipeIngredient, Task } from '@/utils/supabase/db';

// Legacy freshObj color bands, expressed as palette tokens:
// critical/never (#9B1C1C) and overdue (#DC2626) → danger, low (#D97706) →
// work amber, mid (#CA8A04) → xp amber, fresh (#16A34A) → success.
export function freshColor(f: Freshness, palette: Palette): string {
  switch (f.tone) {
    case 'never':
    case 'critical':
    case 'overdue':
      return palette.danger;
    case 'low':
      return palette.work;
    case 'mid':
      return palette.xp;
    default:
      return palette.success;
  }
}

export type Completer = 'me' | 'joint' | 'paige';

/** Who completed this chore most recently (legacy lastChoreCompleter). */
export function lastChoreCompleter(
  choreLog: ChoreLogEntry[],
  choreId: string,
): Completer | null {
  let best: ChoreLogEntry | null = null;
  let bestKey = '';
  choreLog.forEach((l) => {
    if (l.chore_id !== choreId) return;
    const key = (toDateStr(l.date) || String(l.date || '')) + '|' + (l.created_at || '');
    if (key >= bestKey) {
      bestKey = key;
      best = l;
    }
  });
  if (!best) return null;
  const who = (best as ChoreLogEntry).completed_by;
  return who === 'paige' ? 'paige' : who === 'joint' ? 'joint' : 'me';
}

/** The J / P / J·P completer chip next to a chore name. */
export function CompleterChip({ who }: { who: Completer | null }) {
  const { palette } = useTheme();
  if (!who) return null;
  if (who === 'joint') {
    return (
      <View style={[styles.chip, { paddingHorizontal: 0, overflow: 'hidden' }]}>
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: palette.chores }} />
            <View style={{ flex: 1, backgroundColor: palette.paige }} />
          </View>
        </View>
        <Text style={[styles.chipText, { paddingHorizontal: 5 }]}>J·P</Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.chip,
        styles.chipRound,
        { backgroundColor: who === 'paige' ? palette.paige : palette.chores },
      ]}
    >
      <Text style={styles.chipText}>{who === 'paige' ? 'P' : 'J'}</Text>
    </View>
  );
}

/** Household split (legacy choreSplit): chore log + completed home tasks. */
export function choreSplit(
  choreLog: ChoreLogEntry[],
  tasks: Task[],
  fromDate: string | null,
): { me: number; paige: number } {
  let me = 0;
  let paige = 0;
  const count = (who: string | null | undefined) => {
    // joint completions credit both of us
    if (who === 'paige') paige++;
    else if (who === 'joint') {
      me++;
      paige++;
    } else me++;
  };
  choreLog.forEach((l) => {
    const d = toDateStr(l.date) || String(l.date || '');
    if (!d || (fromDate && d < fromDate)) return;
    count(l.completed_by);
  });
  tasks.forEach((t) => {
    if (t.section !== 'home' || !t.done) return;
    const d = toDateStr(t.completed_date) || String(t.completed_date || '');
    if (!d || (fromDate && d < fromDate)) return;
    count(t.completed_by);
  });
  return { me, paige };
}

/** Ingredients of one recipe, in saved order. */
export function ingredientsFor(all: RecipeIngredient[], recipeId: string): RecipeIngredient[] {
  return all
    .filter((i) => i.recipe_id === recipeId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

// ── Recipe ingredient parsing (legacy coreName / sameIngredient) ──────────────
// Ingredient lines keep their amounts ("1 tbsp butter") on the recipe, but the
// grocery list gets the parsed core noun ("butter") and dedupes on it.

const RECIPE_UNITS = [
  'tbsp', 'tbsps', 'tablespoon', 'tablespoons', 'tsp', 'tsps', 'teaspoon', 'teaspoons',
  'cup', 'cups', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram',
  'grams', 'kg', 'ml', 'l', 'liter', 'liters', 'litre', 'litres', 'clove', 'cloves',
  'can', 'cans', 'pinch', 'pinches', 'dash', 'dashes', 'slice', 'slices', 'stick',
  'sticks', 'package', 'packages', 'pkg', 'bunch', 'bunches', 'head', 'heads', 'sprig',
  'sprigs', 'quart', 'quarts', 'pint', 'pints', 'gallon', 'gallons', 'jar', 'jars',
  'box', 'boxes', 'bag', 'bags', 'handful', 'handfuls',
];

export function coreName(text: string): string {
  const orig = String(text || '').trim();
  let s = orig.toLowerCase();
  // strip leading quantity tokens: integers, decimals, fractions (1/2, ½), ranges
  s = s.replace(/^[\d¼½¾⅓⅔⅛⅜⅝⅞/.\-–\s]+/, '').trim();
  // strip a leading unit word (+ optional trailing period)
  s = s.replace(new RegExp('^(?:' + RECIPE_UNITS.join('|') + ')\\.?\\b\\s*', 'i'), '').trim();
  // "1 cup of flour" -> after unit strip leaves "of flour"
  s = s.replace(/^of\s+/i, '').trim();
  // drop any parenthetical notes anywhere, e.g. "onion (diced)" -> "onion"
  s = s.replace(/\([^)]*\)/g, ' ');
  // drop everything after the first comma, e.g. "yellow onion, diced" -> "yellow onion"
  s = s.replace(/,.*$/, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || orig.toLowerCase();
}

export function sameIngredient(a: string, b: string): boolean {
  a = String(a || '').toLowerCase().trim();
  b = String(b || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wb = (x: string) => new RegExp('\\b' + esc(x) + '\\b', 'i');
  return wb(a).test(b) || wb(b).test(a);
}

export const capFirst = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Sheet heading text, matching the summary sheets' visual language. */
export function SheetTitle({ children }: { children: string }) {
  const { palette } = useTheme();
  return <Text style={[styles.sheetTitle, { color: palette.text1 }]}>{children}</Text>;
}

/** Small star-rating row (legacy ratingStars). */
export function RatingStars({
  rating,
  size = 13,
  onPress,
  style,
}: {
  rating: number;
  size?: number;
  onPress?: (n: number) => void;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  const n = Number(rating) || 0;
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          onPress={onPress ? () => onPress(i) : undefined}
          style={{
            fontSize: size,
            lineHeight: size + 4,
            color: i <= n ? palette.xp : palette.border2,
            paddingHorizontal: onPress ? 2 : 0,
          }}
        >
          {i <= n ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 16,
    minWidth: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  chipRound: { width: 16, borderRadius: 8 },
  chipText: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    color: '#fff',
  },
  sheetTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    marginBottom: 3,
  },
});
