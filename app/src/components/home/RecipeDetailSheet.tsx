// Recipe detail — the legacy full-screen #recipe-detail-overlay, rendered as a
// full-height modal: name, interactive rating stars (tap the current rating to
// clear), category chip, link button, ingredients (+ add-to-grocery), numbered
// steps, and edit/delete actions.

import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mono } from '@/components/summary/shared';
import { Badge, Button, Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import * as db from '@/utils/supabase/db';

import { ingredientsFor, RatingStars } from './shared';

export function RecipeDetailSheet({
  recipeId,
  onClose,
  onEdit,
  onAddToGrocery,
}: {
  recipeId: string | null;
  onClose: () => void;
  onEdit: (recipeId: string) => void;
  onAddToGrocery: (recipeId: string) => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const recipes = useDataStore((s) => s.recipes);
  const recipeIngredients = useDataStore((s) => s.recipeIngredients);
  const upsertRow = useDataStore((s) => s.upsertRow);
  const removeRow = useDataStore((s) => s.removeRow);
  const setCollection = useDataStore((s) => s.setCollection);

  const recipe = recipeId ? (recipes.find((r) => r.id === recipeId) ?? null) : null;
  const ingredients = recipe ? ingredientsFor(recipeIngredients, recipe.id) : [];
  const stepLines = (recipe?.steps || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const setRating = async (val: number) => {
    if (!recipe) return;
    // tap the current rating to clear (legacy setRecipeRating)
    const rating = Number(recipe.rating) === val ? 0 : val;
    const { data, error } = await db.recipes.update(recipe.id, { rating });
    if (error || !data) return;
    upsertRow('recipes', data);
  };

  const del = () => {
    if (!recipe) return;
    Alert.alert('Delete this recipe?', recipe.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await db.recipes.remove(recipe.id);
          if (error) return;
          removeRow('recipes', recipe.id);
          setCollection(
            'recipeIngredients',
            useDataStore.getState().recipeIngredients.filter((i) => i.recipe_id !== recipe.id),
          );
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={!!recipeId} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <View
          style={[
            styles.topbar,
            { paddingTop: insets.top + 8, borderBottomColor: palette.border },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: palette.text2 }}>
              ← Back
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          {recipe ? (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable onPress={() => onEdit(recipe.id)} hitSlop={8}>
                <Text style={{ fontSize: 15 }}>✏️</Text>
              </Pressable>
              <Pressable onPress={del} hitSlop={8}>
                <Text style={{ fontSize: 14, color: palette.danger }}>✕</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 30 }}>
          {!recipe ? (
            <Mono size={11}>Recipe not found</Mono>
          ) : (
            <>
              <Text style={[styles.name, { color: palette.text1 }]}>{recipe.name}</Text>
              <View style={styles.metaRow}>
                <RatingStars rating={Number(recipe.rating)} size={24} onPress={setRating} />
                {recipe.category ? (
                  <Badge text={recipe.category} color={palette.text2} bg={palette.card2} />
                ) : null}
              </View>
              {recipe.link ? (
                <Button
                  title="🔗 Open recipe link"
                  onPress={() => Linking.openURL(recipe.link).catch(() => {})}
                  style={{ marginBottom: 14 }}
                />
              ) : null}

              <Card>
                <View style={styles.secHd}>
                  <Text style={{ fontSize: 14 }}>🧺</Text>
                  <Text style={[styles.secName, { color: palette.text1 }]}>Ingredients</Text>
                  <View style={{ flex: 1 }} />
                  <Mono size={10}>{ingredients.length}</Mono>
                </View>
                {ingredients.length ? (
                  <>
                    {ingredients.map((i) => (
                      <View
                        key={i.id}
                        style={[styles.ingRow, { borderBottomColor: palette.border }]}
                      >
                        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
                          {i.text}
                        </Text>
                      </View>
                    ))}
                    <Button
                      title="🛒 Add ingredients to grocery"
                      onPress={() => onAddToGrocery(recipe.id)}
                      variant="ghost"
                      style={{ marginTop: 10 }}
                    />
                  </>
                ) : (
                  <Mono size={11} style={{ paddingVertical: 8 }}>
                    No ingredients
                  </Mono>
                )}
              </Card>

              <Card>
                <View style={styles.secHd}>
                  <Text style={{ fontSize: 14 }}>📋</Text>
                  <Text style={[styles.secName, { color: palette.text1 }]}>Steps</Text>
                  <View style={{ flex: 1 }} />
                  {stepLines.length ? <Mono size={10}>{stepLines.length}</Mono> : null}
                </View>
                {stepLines.length ? (
                  stepLines.map((s, i) => (
                    <View key={i} style={[styles.stepRow, { borderBottomColor: palette.border }]}>
                      <Mono size={11} style={{ marginTop: 2 }}>
                        {i + 1}.
                      </Mono>
                      <Text style={[styles.stepText, { color: palette.text1 }]}>{s}</Text>
                    </View>
                  ))
                ) : (
                  <Mono size={11} style={{ paddingVertical: 8 }}>
                    No steps yet — tap ✏️ to add some
                  </Mono>
                )}
              </Card>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontFamily: fonts.sansMedium,
    fontSize: 24,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  secHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  secName: { fontFamily: fonts.sansMedium, fontSize: 14 },
  ingRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
