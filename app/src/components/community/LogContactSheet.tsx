// Log-contact sheet (legacy contact-modal / openContactModal + confirmContact):
// pick a contact type (💬 text / 📞 call / 🤝 hangout), optional note and a
// backdatable date. Calls and hangouts can tag extra people (group contact) —
// every tagged person gets their own contact_log row and XP (family ×1.5),
// summed into one award. people.last_contact only moves forward.

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { buildXpMap, contactXp } from '@/utils/compute';
import { fmtDate, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Person } from '@/utils/supabase/db';
import { awardContactLogged } from '@/utils/xp';

import { contactTypeEmoji, effectiveLastContact, lastContactMap, personHealth } from './health';

const TYPES = [
  { value: 'text', label: '💬 Text' },
  { value: 'call', label: '📞 Call' },
  { value: 'hangout', label: '🤝 Hangout' },
] as const;

type ContactType = (typeof TYPES)[number]['value'];

export function LogContactSheet({
  person,
  onClose,
  onToast,
}: {
  person: Person | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const { palette } = useTheme();
  const people = useDataStore((s) => s.people);
  const contactLog = useDataStore((s) => s.contactLog);
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [type, setType] = useState<ContactType>('text');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [extras, setExtras] = useState<Person[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset per open (legacy openContactModal).
  useEffect(() => {
    if (!person) return;
    setType('text');
    setNote('');
    setDate(todayIso());
    setExtras([]);
    setPickerOpen(false);
    setSaving(false);
  }, [person?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const logMap = useMemo(() => lastContactMap(contactLog), [contactLog]);
  const lastContact = person ? effectiveLastContact(person, logMap) : null;
  const health = person ? personHealth(lastContact, person.tier, person.cadence_days) : null;

  const recentLogs = useMemo(
    () =>
      person
        ? contactLog
            .filter((l) => l.person_id === person.id)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 3)
        : [],
    [contactLog, person],
  );

  // Group contacts only for calls and hangouts (legacy isGroupable).
  const groupable = type === 'call' || type === 'hangout';

  // Taggable pool: all family + friends people minus primary and already-tagged.
  const available = useMemo(() => {
    if (!person) return [];
    const taken = new Set([person.id, ...extras.map((e) => e.id)]);
    return people.filter(
      (p) => (p.tier === 'family' || p.tier === 'friends') && !taken.has(p.id),
    );
  }, [people, person, extras]);

  const pickType = (t: ContactType) => {
    setType(t);
    if (t === 'text') {
      // Switching back to text clears any tagged extras (legacy).
      setExtras([]);
      setPickerOpen(false);
    }
  };

  const save = async () => {
    if (!person || saving) return;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : todayIso();
    setSaving(true);
    const targets = [person, ...extras];
    const xpMap = buildXpMap(useDataStore.getState().xpValues);
    const trimmedNote = note.trim();
    let totalXp = 0;

    for (const t of targets) {
      const xpVal = contactXp(type, t.tier, xpMap);
      totalXp += xpVal;
      // Only bump last_contact forward (legacy confirmContact).
      if (!t.last_contact || d > t.last_contact) {
        const { data } = await db.people.update(t.id, { last_contact: d });
        if (data) upsertRow('people', data);
      }
      const { data: log } = await db.contactLog.insert({
        person_id: t.id,
        person_name: t.name,
        type,
        note: trimmedNote,
        date: d,
        xp: xpVal,
      });
      if (log) upsertRow('contactLog', log);
    }

    // XP + streak + badge checks after the rows are reflected (xp.ts contract).
    await awardContactLogged(
      type,
      targets.map((t) => t.tier),
    );

    setSaving(false);
    const groupSuffix = targets.length > 1 ? ` (${targets.length} people)` : '';
    const dateSuffix = d !== todayIso() ? ' on ' + fmtDate(d) : '';
    onToast(`${contactTypeEmoji(type)} Logged${groupSuffix}${dateSuffix} +${totalXp} XP`);
    onClose();
  };

  return (
    <BottomSheet visible={!!person} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>
        Log contact{person ? ' · ' + person.name : ''}
      </Text>

      {health ? (
        <Mono size={11} color={lastContact ? health.color : palette.text3} style={{ marginBottom: 6 }}>
          {lastContact ? `last: ${fmtDate(lastContact)} · ${health.label}` : 'no contact logged yet'}
        </Mono>
      ) : null}

      {recentLogs.length ? (
        <View style={[styles.recent, { backgroundColor: palette.card2 }]}>
          {recentLogs.map((l) => (
            <View key={l.id} style={styles.recentRow}>
              <Text style={{ fontSize: 11 }}>{contactTypeEmoji(l.type)}</Text>
              <Mono size={11} style={{ minWidth: 48 }}>
                {fmtDate(l.date)}
              </Mono>
              {l.note ? (
                <Mono size={11} color={palette.text2} style={{ flex: 1 }}>
                  {l.note.length > 40 ? l.note.slice(0, 38) + '…' : l.note}
                </Mono>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.typeRow}>
        {TYPES.map((t) => {
          const active = t.value === type;
          return (
            <Pressable
              key={t.value}
              onPress={() => pickType(t.value)}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: active ? palette.text1 : palette.card2,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: active ? palette.bg : palette.text1,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {groupable ? (
        <View style={{ marginBottom: 10 }}>
          {extras.length ? (
            <View style={{ marginBottom: 6 }}>
              <Mono size={10} style={{ marginBottom: 4 }}>
                also tagged:
              </Mono>
              <View style={styles.chipWrap}>
                {extras.map((p) => (
                  <View key={p.id} style={[styles.chip, { backgroundColor: palette.card2 }]}>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: palette.text1 }}>
                      {p.name}
                    </Text>
                    <Pressable
                      hitSlop={6}
                      onPress={() => setExtras((xs) => xs.filter((x) => x.id !== p.id))}
                    >
                      <Text style={{ fontSize: 9, color: palette.danger }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <Pressable
            onPress={() => {
              if (!available.length && !pickerOpen) {
                onToast('No more people to add');
                return;
              }
              setPickerOpen((o) => !o);
            }}
          >
            <Mono size={11} color={palette.community}>
              + Tag another (group {type === 'call' ? 'call' : 'hangout'})
            </Mono>
          </Pressable>
          {pickerOpen ? (
            <View style={[styles.chipWrap, { marginTop: 6 }]}>
              {available.length ? (
                available.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setExtras((xs) => [...xs, p]);
                      setPickerOpen(false);
                    }}
                    style={[styles.chip, { backgroundColor: palette.card2 }]}
                  >
                    <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: palette.text1 }}>
                      {p.name}
                    </Text>
                    <Mono size={9}>{p.tier === 'family' ? 'fam' : 'fri'}</Mono>
                  </Pressable>
                ))
              ) : (
                <Mono size={10}>No more people to add</Mono>
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      <TextField value={note} onChangeText={setNote} placeholder="Note (optional)" />
      <TextField
        value={date}
        onChangeText={setDate}
        placeholder={todayIso()}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ marginTop: 8 }}
      />
      <Mono size={10} style={{ marginTop: 6 }}>
        date (YYYY-MM-DD · defaults to today)
      </Mono>

      <Button title="Log it" onPress={save} loading={saving} style={{ marginTop: 12 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 17, marginBottom: 3 },
  recent: { borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 8, gap: 3, marginBottom: 10 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
