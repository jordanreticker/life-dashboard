// Recipe manager sheet — the legacy #recipe-manage-modal: alphabetical recipe
// list (ingredient count · category · rating), tap a name for the detail view,
// ✏️ to edit, ✕ to delete (with confirm; ingredients cascade server-side).

import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import * as db from '@/utils/supabase/db';
import type { Recipe } from '@/utils/supabase/db';

import { RatingStars, SheetTitle } from './shared';

export function RecipeManageSheet({
  visible,
  onClose,
  onOpenDetail,
  onEdit,
  onNew,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenDetail: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onNew: () => void;
}) {
  const { palette } = useTheme();
  const recipes = useDataStore((s) => s.recipes);
  const recipeIngredients = useDataStore((s) => s.recipeIngredients);
  const removeRow = useDataStore((s) => s.removeRow);
  const setCollection = useDataStore((s) => s.setCollection);

  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));

  const del = (recipe: Recipe) => {
    Alert.alert('Delete this recipe?', recipe.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await db.recipes.remove(recipe.id); // ingredients cascade server-side
          if (error) return;
          removeRow('recipes', recipe.id);
          setCollection(
            'recipeIngredients',
            useDataStore.getState().recipeIngredients.filter((i) => i.recipe_id !== recipe.id),
          );
        },
      },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <SheetTitle>🍳 Recipes</SheetTitle>
      <View style={{ marginVertical: 8 }}>
        {!sorted.length ? (
          <Mono size={11} style={{ textAlign: 'center', paddingVertical: 14 }}>
            No recipes yet
          </Mono>
        ) : (
          sorted.map((r) => {
            const count = recipeIngredients.filter((i) => i.recipe_id === r.id).length;
            return (
              <View key={r.id} style={styles.row}>
                <Pressable onPress={() => onOpenDetail(r)} style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: palette.text1 }]} numberOfLines={1}>
                    {r.name}{' '}
                    <Mono size={10}>
                      ({count}){r.category ? ` · ${r.category}` : ''}
                    </Mono>
                  </Text>
                  {Number(r.rating) > 0 ? (
                    <RatingStars rating={Number(r.rating)} size={11} style={{ marginTop: 1 }} />
                  ) : null}
                </Pressable>
                <Pressable hitSlop={6} onPress={() => onEdit(r)} style={styles.actBtn}>
                  <Text style={{ fontSize: 13 }}>✏️</Text>
                </Pressable>
                <Pressable hitSlop={6} onPress={() => del(r)} style={styles.actBtn}>
                  <Text style={{ fontSize: 12, color: palette.danger }}>✕</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
      <Button title="+ New recipe" onPress={onNew} />
      <Button title="Close" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
  },
  name: { fontFamily: fonts.sans, fontSize: 13 },
  actBtn: { paddingHorizontal: 5, paddingVertical: 4 },
});
