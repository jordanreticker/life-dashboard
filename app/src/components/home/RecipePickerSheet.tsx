// "Add from recipe" sheet — the legacy #recipe-picker-modal: pick a recipe,
// check off which ingredients you need, and add them to the grocery list.
// Ingredient lines keep amounts on the recipe; the grocery list gets the parsed
// core noun ("1 tbsp butter" → "Butter") and dedupes against active items.

import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';

import { capFirst, coreName, ingredientsFor, sameIngredient, SheetTitle } from './shared';

export function RecipePickerSheet({
  visible,
  preselectId,
  onClose,
}: {
  visible: boolean;
  preselectId?: string | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const recipes = useDataStore((s) => s.recipes);
  const recipeIngredients = useDataStore((s) => s.recipeIngredients);
  const listItems = useDataStore((s) => s.listItems);
  const upsertRow = useDataStore((s) => s.upsertRow);

  const sorted = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes],
  );

  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const ingredients = recipeId ? ingredientsFor(recipeIngredients, recipeId) : [];
  const groceryActive = listItems.filter((i) => i.list === 'grocery' && !i.done);

  const selectRecipe = (id: string) => {
    setRecipeId(id);
    setChecked(new Set(ingredientsFor(recipeIngredients, id).map((i) => i.id)));
  };

  // Seed on open (legacy openRecipePicker): preselect or first recipe, all checked.
  useEffect(() => {
    if (!visible) return;
    const initial =
      preselectId && sorted.some((r) => r.id === preselectId) ? preselectId : sorted[0]?.id ?? null;
    if (initial) selectRecipe(initial);
    else setRecipeId(null);
    setAdding(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const allChecked = ingredients.length > 0 && ingredients.every((i) => checked.has(i.id));

  const toggleAll = () => {
    // any unchecked -> select all, else deselect all (legacy rp-toggle-all)
    setChecked(allChecked ? new Set() : new Set(ingredients.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = async () => {
    if (adding) return;
    const selected = ingredients.filter((i) => checked.has(i.id));
    if (!selected.length) {
      Alert.alert('Nothing selected');
      return;
    }
    setAdding(true);
    let added = 0;
    let skipped = 0;
    // Track cores added in this batch so duplicates within the batch are skipped too.
    const batchCores: string[] = [];
    let nextOrder =
      listItems
        .filter((i) => i.list === 'grocery')
        .reduce((m, i) => Math.max(m, Number(i.sort_order) || 0), 0) + 1;
    for (const ing of selected) {
      const core = coreName(ing.text);
      if (!core) {
        skipped++;
        continue;
      }
      const dup =
        groceryActive.some((g) => sameIngredient(core, coreName(g.text))) ||
        batchCores.some((c) => sameIngredient(core, c));
      if (dup) {
        skipped++;
        continue;
      }
      const { data, error } = await db.listItems.insert({
        list: 'grocery',
        text: capFirst(core),
        done: false,
        added_date: todayIso(),
        sort_order: nextOrder++,
      });
      if (error || !data) continue;
      upsertRow('listItems', data);
      batchCores.push(core);
      added++;
    }
    setAdding(false);
    onClose();
    Alert.alert('🛒 Added ' + added + (skipped ? ` · ${skipped} already on list` : ''));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <SheetTitle>🍳 Add from recipe</SheetTitle>
      {!sorted.length ? (
        <Mono size={11} style={{ textAlign: 'center', paddingVertical: 16 }}>
          No recipes yet. Tap "Manage recipes" to add one.
        </Mono>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {sorted.map((r) => {
                const sel = r.id === recipeId;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => selectRecipe(r.id)}
                    style={[
                      styles.recipeChip,
                      { borderColor: sel ? palette.chores : palette.border2 },
                      sel && { backgroundColor: palette.choresBg },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: sel ? fonts.sansMedium : fonts.sans,
                        fontSize: 12,
                        color: sel ? palette.chores : palette.text2,
                      }}
                    >
                      {r.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {ingredients.length ? (
            <Pressable onPress={toggleAll} style={{ alignSelf: 'flex-end', marginBottom: 4 }}>
              <Mono size={11} color={palette.text2}>
                {allChecked ? 'Deselect all' : 'Select all'}
              </Mono>
            </Pressable>
          ) : null}

          {!ingredients.length ? (
            <Mono size={11} style={{ textAlign: 'center', paddingVertical: 14 }}>
              No ingredients
            </Mono>
          ) : (
            ingredients.map((ing) => {
              const isChecked = checked.has(ing.id);
              const onList = groceryActive.some((g) =>
                sameIngredient(coreName(ing.text), coreName(g.text)),
              );
              return (
                <Pressable key={ing.id} onPress={() => toggleOne(ing.id)} style={styles.ingRow}>
                  <View
                    style={[
                      styles.chk,
                      { borderColor: isChecked ? palette.chores : palette.border2 },
                      isChecked && { backgroundColor: palette.chores },
                    ]}
                  >
                    {isChecked ? <Text style={styles.chkMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.ingText, { color: palette.text1 }]}>
                    {ing.text}
                    {onList ? <Mono size={9}> · on list</Mono> : null}
                  </Text>
                </Pressable>
              );
            })
          )}

          <Button
            title="Add selected to grocery"
            onPress={addSelected}
            loading={adding}
            style={{ marginTop: 12 }}
          />
        </>
      )}
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  recipeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
  },
  chk: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chkMark: { color: '#fff', fontSize: 11, lineHeight: 13 },
  ingText: { fontFamily: fonts.sans, fontSize: 13, flex: 1 },
});
