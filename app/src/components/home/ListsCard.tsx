// Shopping & grocery lists card (legacy lists section at the top of the chores
// pane): tabbed 🛒 Grocery / 🛍️ Shopping.
//   - Grocery: staples group first, check-off (+list_item_done XP), star
//     (staple) toggle, delete, collapsible "previously bought" with tap-to-re-add.
//   - Shopping: a ranked want-list — one manual order, numbered (#1 red, #2-3
//     amber), with a reorder mode (owner only) whose ↑/↓ moves rewrite
//     sort_order (1-based) for changed rows only.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { ListItem } from '@/utils/supabase/db';
import { awardListItemDone } from '@/utils/xp';

type ListName = 'grocery' | 'shopping';

/** Legacy active-shopping sort: sort_order, then added date. */
export function sortListItems(items: ListItem[]): ListItem[] {
  return [...items].sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
      String(a.added_date || '').localeCompare(String(b.added_date || '')) ||
      a.created_at.localeCompare(b.created_at),
  );
}

export function ListsCard({
  paigeMode,
  onOpenRecipePicker,
  onOpenRecipeManage,
}: {
  paigeMode: boolean;
  onOpenRecipePicker: () => void;
  onOpenRecipeManage: () => void;
}) {
  const { palette } = useTheme();
  const listItems = useDataStore((s) => s.listItems);
  const upsertRow = useDataStore((s) => s.upsertRow);
  const removeRow = useDataStore((s) => s.removeRow);

  const [tab, setTab] = useState<ListName>('grocery');
  const [doneOpen, setDoneOpen] = useState<Record<ListName, boolean>>({
    grocery: false,
    shopping: false,
  });
  const [reordering, setReordering] = useState(false);
  const [addText, setAddText] = useState('');

  const groList = listItems.filter((i) => i.list === 'grocery');
  const shopList = listItems.filter((i) => i.list === 'shopping');
  const groCount = groList.filter((i) => !i.done).length;
  const shopCount = shopList.filter((i) => !i.done).length;
  const list = tab === 'grocery' ? groList : shopList;

  const add = async () => {
    const text = addText.trim();
    if (!text) return;
    const nextOrder = list.reduce((m, i) => Math.max(m, Number(i.sort_order) || 0), 0) + 1;
    const { data, error } = await db.listItems.insert({
      list: tab,
      text,
      done: false,
      added_date: todayIso(),
      sort_order: nextOrder,
    });
    if (error || !data) return;
    upsertRow('listItems', data);
    setAddText('');
  };

  const toggle = async (item: ListItem) => {
    const done = !item.done;
    const { data, error } = await db.listItems.update(item.id, { done });
    if (error || !data) return;
    upsertRow('listItems', data);
    if (done) await awardListItemDone(); // legacy: XP on check-off, none refunded on re-add
  };

  const toggleStaple = async (item: ListItem) => {
    const { data, error } = await db.listItems.update(item.id, { staple: !item.staple });
    if (error || !data) return;
    upsertRow('listItems', data);
  };

  const del = async (item: ListItem) => {
    const { error } = await db.listItems.remove(item.id);
    if (error) return;
    removeRow('listItems', item.id);
  };

  const move = async (id: string, dir: 'up' | 'down') => {
    const active = sortListItems(shopList.filter((i) => !i.done));
    const i = active.findIndex((x) => x.id === id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= active.length) return;
    [active[i], active[j]] = [active[j], active[i]];
    // Rewrite sort_order (1-based) for changed rows only (layout invariant).
    for (let idx = 0; idx < active.length; idx++) {
      const it = active[idx];
      if ((Number(it.sort_order) || 0) !== idx + 1) {
        upsertRow('listItems', { ...it, sort_order: idx + 1 });
        db.listItems.update(it.id, { sort_order: idx + 1 });
      }
    }
  };

  const checkbox = (item: ListItem) => (
    <Pressable
      hitSlop={6}
      onPress={() => toggle(item)}
      style={[
        styles.chk,
        { borderColor: item.done ? palette.success : palette.border2 },
        item.done && { backgroundColor: palette.success },
      ]}
    >
      {item.done ? <Text style={styles.chkMark}>✓</Text> : null}
    </Pressable>
  );

  const itemRow = (item: ListItem, opts: { num?: number; numTotal?: number } = {}) => {
    const showReorder = reordering && !item.done && tab === 'shopping';
    const numColor =
      opts.num === 1 ? palette.danger : opts.num !== undefined && opts.num <= 3 ? palette.work : palette.text3;
    return (
      <View key={item.id} style={styles.itemRow}>
        {opts.num !== undefined ? (
          <Mono size={10} color={numColor} style={{ width: 18, textAlign: 'center' }}>
            {opts.num}
          </Mono>
        ) : null}
        {showReorder ? null : checkbox(item)}
        <Text
          style={[
            styles.itemText,
            { color: item.done ? palette.text3 : palette.text1 },
            item.done && { textDecorationLine: 'line-through' },
          ]}
        >
          {item.text}
        </Text>
        {showReorder ? (
          <>
            <Pressable
              hitSlop={6}
              disabled={opts.num === 1}
              onPress={() => move(item.id, 'up')}
              style={[styles.moveBtn, { opacity: opts.num === 1 ? 0.25 : 1 }]}
            >
              <Text style={{ fontSize: 15, color: palette.text2 }}>↑</Text>
            </Pressable>
            <Pressable
              hitSlop={6}
              disabled={opts.num === opts.numTotal}
              onPress={() => move(item.id, 'down')}
              style={[styles.moveBtn, { opacity: opts.num === opts.numTotal ? 0.25 : 1 }]}
            >
              <Text style={{ fontSize: 15, color: palette.text2 }}>↓</Text>
            </Pressable>
          </>
        ) : (
          <>
            {!item.done ? (
              <Pressable hitSlop={6} onPress={() => toggleStaple(item)} style={styles.starBtn}>
                <Text style={{ fontSize: 16, color: item.staple ? palette.xp : palette.text3 }}>
                  {item.staple ? '★' : '☆'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable hitSlop={6} onPress={() => del(item)} style={styles.starBtn}>
              <Text style={{ fontSize: 11, color: palette.text3 }}>✕</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  };

  const prevBoughtHeader = (name: ListName, count: number) => (
    <Pressable
      onPress={() => setDoneOpen((d) => ({ ...d, [name]: !d[name] }))}
      style={[styles.prevHd, { borderTopColor: palette.border }]}
    >
      <Mono size={10}>{doneOpen[name] ? '▲' : '▼'} previously bought ({count})</Mono>
      <View style={[styles.prevRule, { backgroundColor: palette.border }]} />
      <Mono size={9}>tap to re-add</Mono>
    </Pressable>
  );

  const renderGrocery = () => {
    const active = groList.filter((i) => !i.done);
    const done = groList.filter((i) => i.done);
    const staples = sortListItems(active.filter((i) => i.staple));
    const nonStaples = sortListItems(active.filter((i) => !i.staple));
    const doneSorted = [...done].sort((a, b) => (a.staple === b.staple ? 0 : a.staple ? -1 : 1));
    return (
      <View>
        {staples.length ? (
          <Mono size={10} color={palette.xp} style={{ paddingVertical: 3 }}>
            ★ staples
          </Mono>
        ) : null}
        {staples.map((i) => itemRow(i))}
        {nonStaples.map((i) => itemRow(i))}
        {done.length ? prevBoughtHeader('grocery', done.length) : null}
        {doneOpen.grocery ? doneSorted.map((i) => itemRow(i)) : null}
        {!groList.length ? (
          <Mono size={11} style={{ textAlign: 'center', paddingVertical: 10 }}>
            empty list
          </Mono>
        ) : null}
      </View>
    );
  };

  const renderShopping = () => {
    const active = sortListItems(shopList.filter((i) => !i.done));
    const done = shopList.filter((i) => i.done);
    return (
      <View>
        <View style={styles.rankRow}>
          <Mono size={10}>ranked by want — #1 is next up</Mono>
          <View style={{ flex: 1 }} />
          {!paigeMode ? (
            <Pressable
              onPress={() => setReordering((v) => !v)}
              style={[
                styles.reorderBtn,
                { backgroundColor: reordering ? palette.chores : palette.card2 },
              ]}
            >
              <Mono size={10} color={reordering ? '#fff' : palette.text2}>
                {reordering ? 'done' : '↕ reorder'}
              </Mono>
            </Pressable>
          ) : null}
        </View>
        {active.map((i, idx) => itemRow(i, { num: idx + 1, numTotal: active.length }))}
        {done.length ? prevBoughtHeader('shopping', done.length) : null}
        {doneOpen.shopping ? done.map((i) => itemRow(i)) : null}
        {!shopList.length ? (
          <Mono size={11} style={{ textAlign: 'center', paddingVertical: 10 }}>
            empty list
          </Mono>
        ) : null}
      </View>
    );
  };

  const tabBtn = (key: ListName, label: string, count: number, emoji: string) => {
    const active = tab === key;
    return (
      <Pressable
        key={key}
        onPress={() => setTab(key)}
        style={[
          styles.tabBtn,
          { borderBottomColor: active ? palette.text1 : 'transparent' },
        ]}
      >
        <Mono
          size={11}
          color={active ? palette.text1 : palette.text3}
          style={active ? { fontFamily: fonts.monoMedium } : undefined}
        >
          {emoji} {label} ({count})
        </Mono>
      </Pressable>
    );
  };

  return (
    <Card>
      <View style={[styles.tabs, { borderBottomColor: palette.border }]}>
        {tabBtn('grocery', 'Grocery', groCount, '🛒')}
        {tabBtn('shopping', 'Shopping', shopCount, '🛍️')}
      </View>

      {tab === 'grocery' ? renderGrocery() : renderShopping()}

      <View style={[styles.addWrap, { borderTopColor: palette.border }]}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TextField
            placeholder={tab === 'grocery' ? 'Add grocery item...' : 'Add shopping item...'}
            value={addText}
            onChangeText={setAddText}
            onSubmitEditing={add}
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <Pressable onPress={add} style={[styles.addBtn, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
              Add
            </Text>
          </Pressable>
        </View>
        {tab === 'grocery' ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <Pressable
              onPress={onOpenRecipePicker}
              style={[styles.smBtn, { borderColor: palette.border2 }]}
            >
              <Mono size={11} color={palette.text2}>
                🍳 From recipe
              </Mono>
            </Pressable>
            <Pressable
              onPress={onOpenRecipeManage}
              style={[styles.smBtn, { borderColor: palette.border2 }]}
            >
              <Mono size={11} color={palette.text2}>
                Manage recipes
              </Mono>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  chk: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chkMark: { color: '#fff', fontSize: 12, lineHeight: 14 },
  itemText: { fontFamily: fonts.sans, fontSize: 13, flex: 1 },
  starBtn: { paddingHorizontal: 5, paddingVertical: 3 },
  moveBtn: { paddingHorizontal: 11, paddingVertical: 3 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  reorderBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prevHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 7,
    paddingBottom: 3,
  },
  prevRule: { flex: 1, height: StyleSheet.hairlineWidth },
  addWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 10,
  },
  addBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smBtn: {
    flex: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 7,
  },
});
