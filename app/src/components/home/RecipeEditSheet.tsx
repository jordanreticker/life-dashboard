// Recipe edit sheet — the legacy #recipe-edit-modal: name, category (with
// suggestions from existing recipes), link, ingredients one-per-line, steps
// one-per-line. Saving replaces the ingredient rows (clear + re-insert,
// FK-ordered) exactly like the legacy saveRecipe.

import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { radius } from '@/theme';
import * as db from '@/utils/supabase/db';
import type { Recipe, RecipeIngredient } from '@/utils/supabase/db';

import { ingredientsFor, SheetTitle } from './shared';

export type RecipeEditTarget = Recipe | 'new' | null;

export function RecipeEditSheet({
  target,
  onClose,
}: {
  target: RecipeEditTarget;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const recipes = useDataStore((s) => s.recipes);
  const upsertRow = useDataStore((s) => s.upsertRow);
  const setCollection = useDataStore((s) => s.setCollection);

  const editing = target && target !== 'new' ? target : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [link, setLink] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [steps, setSteps] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    const { recipeIngredients } = useDataStore.getState();
    setName(editing?.name ?? '');
    setCategory(editing?.category ?? '');
    setLink(editing?.link ?? '');
    setIngredientsText(
      editing ? ingredientsFor(recipeIngredients, editing.id).map((i) => i.text).join('\n') : '',
    );
    setSteps(editing?.steps ?? '');
    setSaving(false);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = [
    ...new Set(recipes.map((r) => (r.category || '').trim()).filter(Boolean)),
  ].sort();

  const save = async () => {
    if (saving) return; // guard against double-tap (legacy _savingRecipe)
    const n = name.trim();
    if (!n) {
      Alert.alert('Recipe name required');
      return;
    }
    setSaving(true);
    const row = {
      name: n,
      category: category.trim(),
      link: link.trim(),
      steps: steps.replace(/\r/g, '').trim(),
    };
    const lines = ingredientsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    let recipeId: string;
    if (editing) {
      const { data, error } = await db.recipes.update(editing.id, row);
      if (error || !data) {
        setSaving(false);
        return;
      }
      upsertRow('recipes', data);
      recipeId = data.id;
      await db.recipeIngredients.removeByRecipe(recipeId);
    } else {
      const { data, error } = await db.recipes.insert(row); // FK: recipe before ingredients
      if (error || !data) {
        setSaving(false);
        return;
      }
      upsertRow('recipes', data);
      recipeId = data.id;
    }

    const inserted: RecipeIngredient[] = [];
    for (let i = 0; i < lines.length; i++) {
      const { data } = await db.recipeIngredients.insert({
        recipe_id: recipeId,
        text: lines[i],
        sort_order: i,
      });
      if (data) inserted.push(data);
    }
    setCollection('recipeIngredients', [
      ...useDataStore.getState().recipeIngredients.filter((i) => i.recipe_id !== recipeId),
      ...inserted,
    ]);
    setSaving(false);
    onClose();
  };

  return (
    <BottomSheet visible={!!target} onClose={onClose}>
      <SheetTitle>{editing ? 'Edit recipe' : 'New recipe'}</SheetTitle>
      <View style={{ gap: 8, marginTop: 10 }}>
        <TextField placeholder="Recipe name" value={name} onChangeText={setName} />
        <TextField
          placeholder="Category (e.g. Dinner)"
          value={category}
          onChangeText={setCategory}
        />
        {categories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {categories.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.catChip, { borderColor: palette.border2 }]}
                >
                  <Mono size={10} color={palette.text2}>
                    {c}
                  </Mono>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <TextField
          placeholder="Link (optional)"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Mono size={10}>Ingredients — one per line</Mono>
        <TextField
          placeholder={'1 tbsp butter\n2 cloves garlic'}
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />
        <Mono size={10}>Steps — one per line (optional)</Mono>
        <TextField
          placeholder={'Preheat oven to 400°F\nChop the onion'}
          value={steps}
          onChangeText={setSteps}
          multiline
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />
      </View>
      <Button title="Save recipe" onPress={save} loading={saving} style={{ marginTop: 14 }} />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  catChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
