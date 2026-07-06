// The person-card grid (legacy .pbar / .pcell): each card shows the name, a
// contact-cadence health bar and its label. Tap once to select (reveals ✏️
// edit + ✕ delete), tap again to open the log-contact sheet. Reorder mode
// swaps arrows in per card (legacy data-personmove). The add-person row lives
// at the bottom (legacy .apr).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import type { Person } from '@/utils/supabase/db';

import type { PersonHealth } from './health';

export function HealthBar({
  health,
  width,
}: {
  health: PersonHealth;
  width?: number;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: palette.border },
        width !== undefined ? { width } : { alignSelf: 'stretch' },
      ]}
    >
      <View style={{ height: '100%', width: `${health.pct}%`, backgroundColor: health.color }} />
    </View>
  );
}

export function PeopleGrid({
  people,
  healthFor,
  selectedId,
  reordering,
  onPressPerson,
  onEditPerson,
  onDeletePerson,
  onMovePerson,
  onAddPerson,
}: {
  people: Person[];
  healthFor: (p: Person) => PersonHealth;
  selectedId: string | null;
  reordering: boolean;
  onPressPerson: (p: Person) => void;
  onEditPerson: (p: Person) => void;
  onDeletePerson: (p: Person) => void;
  onMovePerson: (index: number, dir: 'up' | 'down') => void;
  onAddPerson: (name: string) => void;
}) {
  const { palette } = useTheme();
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    onAddPerson(name.trim());
    setName('');
  };

  return (
    <View>
      <View style={styles.grid}>
        {!people.length ? (
          <Text style={[styles.empty, { color: palette.text3 }]}>add people below</Text>
        ) : null}
        {people.map((p, idx) => {
          const h = healthFor(p);
          const selected = selectedId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => onPressPerson(p)}
              style={[
                styles.cell,
                { borderColor: 'transparent' },
                selected && { backgroundColor: palette.xpBg, borderColor: palette.xp },
              ]}
            >
              {reordering ? (
                <View style={styles.moveRow}>
                  <Pressable
                    hitSlop={6}
                    disabled={idx === 0}
                    onPress={() => onMovePerson(idx, 'up')}
                    style={{ opacity: idx === 0 ? 0.3 : 1 }}
                  >
                    <Text style={[styles.moveBtn, { color: palette.text2 }]}>↑</Text>
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    disabled={idx === people.length - 1}
                    onPress={() => onMovePerson(idx, 'down')}
                    style={{ opacity: idx === people.length - 1 ? 0.3 : 1 }}
                  >
                    <Text style={[styles.moveBtn, { color: palette.text2 }]}>↓</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.nameRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.name, { color: palette.text1 }]}
                >
                  {p.name}
                </Text>
                {selected ? (
                  <>
                    <Pressable hitSlop={6} onPress={() => onEditPerson(p)}>
                      <Text style={{ fontSize: 11 }}>✏️</Text>
                    </Pressable>
                    <Pressable hitSlop={6} onPress={() => onDeletePerson(p)}>
                      <Text style={{ fontSize: 12, color: palette.danger }}>✕</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
              <HealthBar health={h} />
              <View style={styles.metaRow}>
                <Text numberOfLines={1} style={[styles.metaLabel, { color: h.color, flex: 1 }]}>
                  {h.label}
                </Text>
                <Text style={[styles.metaLabel, { color: palette.text3 }]}>{h.cadence}d</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.addRow}>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Add a person..."
          returnKeyType="done"
          onSubmitEditing={add}
          style={{ flex: 1 }}
        />
        <Button title="+ Add" onPress={add} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  empty: { fontFamily: fonts.mono, fontSize: 11, paddingVertical: 6 },
  cell: {
    flexGrow: 1,
    flexBasis: '30%',
    maxWidth: '48%',
    gap: 4,
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  moveRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 1 },
  moveBtn: { fontFamily: fonts.monoMedium, fontSize: 14, paddingHorizontal: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontFamily: fonts.sansMedium, fontSize: 13, flex: 1 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { fontFamily: fonts.mono, fontSize: 9 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
});
