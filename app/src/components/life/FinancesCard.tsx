// 💵 Finances (legacy openFinModal / deleteFin / fin totals): running totals
// for expenses / income / savings, the entry list (tap to edit), and the
// add/edit sheet with label, amount, type, category and notes. Saving a
// savings entry with a positive amount awards savings_log XP — on add AND on
// edit, exactly like the legacy confirm handler. Deletes revoke nothing.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, SecHeader, SheetTitle } from '@/components/life/shared';
import { Mono, StatCell, fmtNum } from '@/components/summary/shared';
import { BottomSheet, Button, Card, Segmented, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDate, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { FinanceEntry } from '@/utils/supabase/db';
import { awardSavingsLogged } from '@/utils/xp';

type FinType = 'expense' | 'income' | 'savings';

const CATEGORIES = [
  'housing',
  'food',
  'transport',
  'health',
  'subscriptions',
  'savings',
  'income',
  'other',
];

export function FinancesCard({ onToast }: { onToast: (msg: string) => void }) {
  const { palette } = useTheme();
  const { financeEntries, upsertRow, removeRow } = useDataStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FinType>('expense');
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');

  const totals = useMemo(() => {
    const sum = (t: FinType) =>
      financeEntries.filter((f) => f.type === t).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    return { expenses: sum('expense'), income: sum('income'), savings: sum('savings') };
  }, [financeEntries]);

  const typeColor: Record<FinType, string> = {
    expense: palette.danger,
    income: palette.success,
    savings: palette.fin,
  };

  const openSheet = (f: FinanceEntry | null) => {
    setEditing(f);
    setLabel(f ? f.label : '');
    setAmount(f ? String(f.amount) : '');
    setType((f?.type as FinType) || 'expense');
    setCategory(f?.category || 'other');
    setNotes(f?.notes || '');
    setSheetOpen(true);
  };

  const save = async () => {
    const lbl = label.trim();
    if (!lbl) return;
    const amt = parseFloat(amount) || 0;
    const patch = {
      label: lbl,
      amount: amt,
      type,
      category,
      notes: notes.trim(),
      updated_date: todayIso(),
    };
    if (editing) {
      const { data, error } = await db.financeEntries.update(editing.id, patch);
      if (error || !data) {
        onToast('Save failed');
        return;
      }
      upsertRow('financeEntries', data);
    } else {
      const { data, error } = await db.financeEntries.insert(patch);
      if (error || !data) {
        onToast('Save failed');
        return;
      }
      upsertRow('financeEntries', data);
    }
    setSheetOpen(false);
    if (type === 'savings' && amt > 0) {
      const { xp } = await awardSavingsLogged();
      onToast(`Savings logged +${xp} XP`);
    }
  };

  const deleteEntry = (f: FinanceEntry) => {
    removeRow('financeEntries', f.id);
    void db.financeEntries.remove(f.id);
  };

  return (
    <Card>
      <SecHeader
        emoji="💵"
        name="Money"
        count={financeEntries.length}
        right={
          <Pressable onPress={() => openSheet(null)} hitSlop={6}>
            <Mono size={11} color={palette.text2}>
              + Add entry
            </Mono>
          </Pressable>
        }
      />

      <View style={styles.totals}>
        <StatCell value={'$' + fmtNum(totals.expenses)} label="expenses" color={typeColor.expense} />
        <StatCell value={'$' + fmtNum(totals.income)} label="income" color={typeColor.income} />
        <StatCell value={'$' + fmtNum(totals.savings)} label="savings" color={typeColor.savings} />
      </View>

      {financeEntries.map((f) => {
        const ft = (f.type as FinType) || 'expense';
        return (
          <Pressable
            key={f.id}
            onPress={() => openSheet(f)}
            style={[styles.row, { borderTopColor: palette.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: palette.text1 }]}>{f.label}</Text>
              <Mono size={10} color={palette.text3}>
                {f.category || 'other'}
                {f.updated_date ? ' · ' + fmtDate(f.updated_date) : ''}
                {f.notes ? ' · ' + f.notes : ''}
              </Mono>
            </View>
            <Mono size={12} color={typeColor[ft]}>
              {ft === 'expense' ? '-' : '+'}${fmtNum(Number(f.amount) || 0)}
            </Mono>
            <Pressable onPress={() => deleteEntry(f)} hitSlop={8}>
              <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
            </Pressable>
          </Pressable>
        );
      })}

      {/* Legacy #fin-modal. */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <SheetTitle title={editing ? 'Edit entry' : 'Add entry'} />
        <TextField
          placeholder="Label (e.g. Rent)"
          value={label}
          onChangeText={setLabel}
          style={styles.field}
        />
        <TextField
          placeholder="Amount ($)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={styles.field}
        />
        <View style={styles.field}>
          <Segmented<FinType>
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'savings', label: 'Savings' },
            ]}
            value={type}
            onChange={setType}
            accentColor={palette.fin}
          />
        </View>
        <View style={[styles.cats, styles.field]}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={category === c}
              activeColor={palette.fin}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
        <TextField
          placeholder="Notes (optional context)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ ...styles.field, minHeight: 50 }}
        />
        <Button title="Save" onPress={save} variant="accent" accentColor={palette.fin} />
        <Button
          title="Cancel"
          onPress={() => setSheetOpen(false)}
          variant="ghost"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  totals: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  field: {
    marginBottom: 8,
  },
  cats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
});
