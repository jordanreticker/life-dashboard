// Community pane — the port of the legacy rCommunity(): the 📬 inbox tracker
// card, the family/friends tier tabs, the person-card grid with contact-
// cadence health bars (tap to select → tap again to log contact, ✏️ edit
// cadence, ✕ delete), the manual reorder mode (↑/↓ rewrite 1-based sort_order
// for changed rows only), add-person, and the per-person contact history with
// expandable logs + delete (XP refund). contact_log stays authoritative for
// last-contact at render time; people.last_contact only moves forward.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ContactHistory } from '@/components/community/ContactHistory';
import {
  effectiveLastContact,
  lastContactMap,
  personHealth,
  type PersonHealth,
} from '@/components/community/health';
import { InboxCard } from '@/components/community/InboxCard';
import { LogContactSheet } from '@/components/community/LogContactSheet';
import { PeopleGrid } from '@/components/community/PeopleGrid';
import { PersonEditSheet } from '@/components/community/PersonEditSheet';
import { Card, Loading, PaneTitle, Screen, Segmented } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { ContactLogEntry, Person } from '@/utils/supabase/db';
import { revokeContactLogEntry } from '@/utils/xp';

type Tier = 'family' | 'friends';

const TIER_META: Record<Tier, { emoji: string; label: string }> = {
  family: { emoji: '👨‍👩‍👧', label: 'Family' },
  friends: { emoji: '👥', label: 'Friends' },
};

export default function CommunityScreen() {
  const { palette } = useTheme();
  const { loaded, loading, loadAll, people, contactLog, upsertRow, removeRow, setCollection } =
    useDataStore();

  const [tier, setTier] = useState<Tier>('family');
  const [reordering, setReordering] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [contactPerson, setContactPerson] = useState<Person | null>(null);

  // Transient toast (the legacy toast()).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  const today = todayIso();

  // contact_log is the source of truth for last contact (render-time only).
  const logMap = useMemo(() => lastContactMap(contactLog), [contactLog]);
  const healthFor = (p: Person): PersonHealth =>
    personHealth(effectiveLastContact(p, logMap), p.tier, p.cadence_days, today);

  const tierPeople = useMemo(
    () =>
      people
        .filter((p) => p.tier === tier)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [people, tier],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const switchTier = (t: Tier) => {
    setTier(t);
    setSelectedId(null);
    setReordering(false);
  };

  // First tap selects (reveals ✏️/✕), second tap opens the log-contact sheet.
  const pressPerson = (p: Person) => {
    if (selectedId === p.id) {
      setSelectedId(null);
      setContactPerson(p);
    } else {
      setSelectedId(p.id);
    }
  };

  const addPerson = async (name: string) => {
    const { data, error } = await db.people.insert({ name, tier });
    if (data) upsertRow('people', data);
    showToast(error ? 'Save failed' : '+ Added ' + name);
  };

  const deletePerson = async (p: Person) => {
    setSelectedId(null);
    removeRow('people', p.id);
    // person_id on tasks/contact_log is ON DELETE SET NULL in the db — reflect
    // that in the store so other panes stay consistent (no per-row writes).
    const s = useDataStore.getState();
    s.setCollection(
      'tasks',
      s.tasks.map((t) => (t.person_id === p.id ? { ...t, person_id: null } : t)),
    );
    s.setCollection(
      'contactLog',
      s.contactLog.map((l) => (l.person_id === p.id ? { ...l, person_id: null } : l)),
    );
    await db.people.remove(p.id);
  };

  // Reorder mode: swap with the neighbor, then rewrite 1-based sort_order for
  // CHANGED rows only (context/tech-stack.md "Layout invariants").
  const movePerson = (idx: number, dir: 'up' | 'down') => {
    const arr = [...tierPeople];
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    arr.forEach((p, i) => {
      const so = i + 1;
      if (p.sort_order !== so) {
        upsertRow('people', { ...p, sort_order: so });
        void db.people.update(p.id, { sort_order: so });
      }
    });
  };

  const deleteLog = (log: ContactLogEntry) => {
    const amount = Number(log.xp) || 0;
    Alert.alert('Delete this contact log?', `-${amount} XP`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          removeRow('contactLog', log.id);
          await db.contactLog.remove(log.id);
          await revokeContactLogEntry(log);
          showToast(`Removed -${amount} XP`);
        },
      },
    ]);
  };

  const meta = TIER_META[tier];

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={loadAll} refreshing={loading && loaded}>
        <PaneTitle title="👥 Community" />

        {!loaded ? (
          <Loading label="loading community…" />
        ) : (
          <>
            <InboxCard onToast={showToast} />

            <View style={{ marginBottom: 10 }}>
              <Segmented<Tier>
                options={[
                  { value: 'family', label: '👨‍👩‍👧 Family' },
                  { value: 'friends', label: '👥 Friends' },
                ]}
                value={tier}
                onChange={switchTier}
                accentColor={palette.community}
              />
            </View>

            <Card>
              <View style={styles.secHead}>
                <Text style={{ fontSize: 15 }}>{meta.emoji}</Text>
                <Text style={[styles.secName, { color: palette.text1 }]}>{meta.label}</Text>
                <Text style={[styles.secCount, { color: palette.text3 }]}>
                  {tierPeople.length} people
                </Text>
                <Pressable
                  onPress={() => setReordering((r) => !r)}
                  style={[
                    styles.reorderBtn,
                    { backgroundColor: reordering ? palette.community : palette.card2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.reorderText,
                      { color: reordering ? '#fff' : palette.text2 },
                    ]}
                  >
                    {reordering ? 'done' : 'reorder'}
                  </Text>
                </Pressable>
              </View>

              <PeopleGrid
                people={tierPeople}
                healthFor={healthFor}
                selectedId={selectedId}
                reordering={reordering}
                onPressPerson={pressPerson}
                onEditPerson={setEditPerson}
                onDeletePerson={deletePerson}
                onMovePerson={movePerson}
                onAddPerson={addPerson}
              />

              {tierPeople.length ? (
                <>
                  <View style={[styles.divider, { backgroundColor: palette.border }]} />
                  <ContactHistory
                    people={tierPeople}
                    contactLog={contactLog}
                    healthFor={healthFor}
                    expanded={expanded}
                    onToggleExpanded={(pid) =>
                      setExpanded((e) => ({ ...e, [pid]: !e[pid] }))
                    }
                    onDeleteLog={deleteLog}
                  />
                </>
              ) : null}
            </Card>
          </>
        )}

        <PersonEditSheet
          person={editPerson}
          onClose={() => {
            setEditPerson(null);
            setSelectedId(null);
          }}
          onToast={showToast}
        />
        <LogContactSheet
          person={contactPerson}
          onClose={() => setContactPerson(null)}
          onToast={showToast}
        />
      </Screen>

      {toast ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: palette.bg }}>
              {toast}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  secName: { fontFamily: fonts.sansMedium, fontSize: 14 },
  secCount: { fontFamily: fonts.mono, fontSize: 10 },
  reorderBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  reorderText: { fontFamily: fonts.mono, fontSize: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    maxWidth: '86%',
  },
});
