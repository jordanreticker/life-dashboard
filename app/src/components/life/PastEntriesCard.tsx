// 📚 Past journal entries (legacy rLife past-entries block + the journal
// lock): collapsible card, newest 15 entries, tap a header to reveal ✏️/✕,
// and the optional password lock. The SHA-256 hash lives in app_settings
// under 'journal_lock_hash' (same key + digest as the web app); entries
// re-lock on every app launch, unlock state is session-only.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { JournalEditSheet } from '@/components/life/JournalEditSheet';
import { sha256Hex } from '@/components/life/sha256';
import { SecHeader, SheetTitle, confirmAction } from '@/components/life/shared';
import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDate } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { JournalEntry } from '@/utils/supabase/db';

type LockMode = 'set' | 'clear';

export function PastEntriesCard({ onToast }: { onToast: (msg: string) => void }) {
  const { palette } = useTheme();
  const { journalEntries, removeRow } = useDataStore();

  const [open, setOpen] = useState(false); // legacy D.journalEntriesOpen
  const [unlocked, setUnlocked] = useState(false); // re-locks on reload
  const [lockHash, setLockHash] = useState('');
  const [pw, setPw] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [lockMode, setLockMode] = useState<LockMode | null>(null);
  const [lockPw1, setLockPw1] = useState('');
  const [lockPw2, setLockPw2] = useState('');

  useEffect(() => {
    let alive = true;
    db.appSettings.get('journal_lock_hash').then(({ data }) => {
      if (alive && data?.value) setLockHash(data.value);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!journalEntries.length) return null;

  const lockSet = !!lockHash;
  const entries = [...journalEntries]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 15);

  const unlock = () => {
    if (sha256Hex(pw) === lockHash) {
      setUnlocked(true);
      setPw('');
      onToast('🔓 Unlocked');
    } else {
      setPw('');
      onToast('Wrong password');
    }
  };

  const openLockSheet = (mode: LockMode) => {
    setLockPw1('');
    setLockPw2('');
    setLockMode(mode);
  };

  const confirmLockSheet = async () => {
    if (lockMode === 'set') {
      if (!lockPw1 || lockPw1.length < 3) {
        onToast('Password must be at least 3 chars');
        return;
      }
      if (lockPw1 !== lockPw2) {
        onToast('Passwords do not match');
        return;
      }
      const hash = sha256Hex(lockPw1);
      setLockHash(hash);
      setUnlocked(true);
      setLockMode(null);
      await db.appSettings.set('journal_lock_hash', hash);
      onToast('🔒 Password set. Re-locks on reload.');
    } else if (lockMode === 'clear') {
      if (sha256Hex(lockPw1) !== lockHash) {
        onToast('Wrong password');
        return;
      }
      setLockHash('');
      setUnlocked(false);
      setLockMode(null);
      await db.appSettings.set('journal_lock_hash', '');
      onToast('Password removed');
    }
  };

  const deleteEntry = (e: JournalEntry) => {
    confirmAction('Delete this entry?', 'This cannot be undone.', () => {
      removeRow('journalEntries', e.id);
      setExpandedId(null);
      void db.journalEntries.remove(e.id);
    });
  };

  const locked = lockSet && !unlocked;

  return (
    <Card>
      <SecHeader
        emoji="📚"
        name="Past entries"
        count={journalEntries.length}
        open={open}
        onPress={() => setOpen((o) => !o)}
        right={
          lockSet ? <Text style={{ fontSize: 11 }}>{unlocked ? '🔓' : '🔒'}</Text> : undefined
        }
      />

      {open && locked ? (
        <View style={styles.lockWrap}>
          <Text style={[styles.lockMsg, { color: palette.text2 }]}>
            🔒 Journal entries are locked
          </Text>
          <TextField
            placeholder="Password"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            onSubmitEditing={unlock}
            returnKeyType="done"
            style={{ width: 200, textAlign: 'center', marginBottom: 8 }}
          />
          <Button title="Unlock" onPress={unlock} />
          <Mono size={9} color={palette.text3} style={{ marginTop: 10 }}>
            forgot? remove via clear button when unlocked
          </Mono>
        </View>
      ) : null}

      {open && !locked ? (
        <View>
          {entries.map((e) => {
            const isExp = expandedId === e.id;
            return (
              <View key={e.id} style={[styles.entry, { borderBottomColor: palette.border }]}>
                <Pressable
                  onPress={() => setExpandedId(isExp ? null : e.id)}
                  style={styles.entryHd}
                >
                  <Text style={{ fontSize: 14 }}>{e.mood || ''}</Text>
                  {e.title ? (
                    <Text style={[styles.entryTitle, { color: palette.text1 }]} numberOfLines={1}>
                      {e.title}
                    </Text>
                  ) : (
                    <Text style={[styles.entryUntitled, { color: palette.text3 }]}>untitled</Text>
                  )}
                  <Mono size={10} color={palette.text3}>
                    {fmtDate(e.date)}
                  </Mono>
                  {isExp ? (
                    <>
                      <Pressable onPress={() => setEditEntry(e)} hitSlop={8}>
                        <Text style={{ fontSize: 12 }}>✏️</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteEntry(e)} hitSlop={8}>
                        <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
                      </Pressable>
                    </>
                  ) : null}
                </Pressable>
                <Text style={[styles.entryText, { color: palette.text2 }]}>{e.text}</Text>
              </View>
            );
          })}

          <View style={[styles.lockFooter, { borderTopColor: palette.border }]}>
            {!lockSet ? (
              <Pressable onPress={() => openLockSheet('set')} hitSlop={6}>
                <Mono size={11} color={palette.text2}>
                  🔒 Set password
                </Mono>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setUnlocked(false);
                    onToast('Locked');
                  }}
                  hitSlop={6}
                >
                  <Mono size={11} color={palette.text2}>
                    🔒 Lock now
                  </Mono>
                </Pressable>
                <Pressable onPress={() => openLockSheet('clear')} hitSlop={6}>
                  <Mono size={11} color={palette.text2}>
                    remove password
                  </Mono>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ) : null}

      <JournalEditSheet
        entry={editEntry}
        onClose={() => {
          setEditEntry(null);
          setExpandedId(null);
        }}
        onToast={onToast}
      />

      {/* Set / remove password (legacy prompt() flows). */}
      <BottomSheet visible={lockMode !== null} onClose={() => setLockMode(null)}>
        <SheetTitle
          title={lockMode === 'set' ? '🔒 Set journal password' : 'Remove password'}
          sub={
            lockMode === 'set'
              ? 'Locks past entries. Re-locks on every reload.'
              : 'Enter the current password to remove the lock.'
          }
        />
        <TextField
          placeholder={lockMode === 'set' ? 'Password (min 3 chars)' : 'Current password'}
          value={lockPw1}
          onChangeText={setLockPw1}
          secureTextEntry
          style={{ marginBottom: 8 }}
        />
        {lockMode === 'set' ? (
          <TextField
            placeholder="Confirm password"
            value={lockPw2}
            onChangeText={setLockPw2}
            secureTextEntry
            style={{ marginBottom: 8 }}
          />
        ) : null}
        <Button
          title={lockMode === 'set' ? 'Set password' : 'Remove'}
          onPress={confirmLockSheet}
          variant={lockMode === 'set' ? 'primary' : 'danger'}
        />
        <Button
          title="Cancel"
          onPress={() => setLockMode(null)}
          variant="ghost"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  lockWrap: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  lockMsg: {
    fontFamily: fonts.sans,
    fontSize: 13,
    marginBottom: 10,
  },
  entry: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryTitle: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  entryUntitled: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontStyle: 'italic',
  },
  entryText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  lockFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    paddingTop: 8,
  },
});
