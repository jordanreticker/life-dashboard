// Daily question — the legacy "💬 ask paige" card at the bottom of the pane.
// A random question is picked on load; "Next ↻" jumps to a random different
// one; "+ Log her answer" opens the answer sheet (legacy logqa-modal) and
// inserts a question_answers row. Past answers for the current question are
// matched by question_id (text fallback for legacy rows), newest first, max 5,
// each deletable.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { fmtDate, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';

import { confirmAction, SheetTitle } from './shared';

export function QuestionCard() {
  const { palette } = useTheme();
  const { questions, questionAnswers, loaded, upsertRow, removeRow } = useDataStore();

  const [qIdx, setQIdx] = useState(0);
  const [randomized, setRandomized] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  // Legacy boot behavior: start on a random question once data is in.
  useEffect(() => {
    if (loaded && !randomized && questions.length) {
      setQIdx(Math.floor(Math.random() * questions.length));
      setRandomized(true);
    }
  }, [loaded, randomized, questions.length]);

  if (!questions.length) {
    return (
      <Card style={{ backgroundColor: palette.paigeBg, borderColor: 'transparent' }}>
        <Mono size={10} color={palette.paige} style={styles.qlbl}>
          💬 ask paige
        </Mono>
        <Text style={[styles.qtxt, { color: palette.text1 }]}>No questions loaded yet.</Text>
      </Card>
    );
  }

  const idx = qIdx % questions.length;
  const q = questions[idx];
  // Match past answers by ID first, fall back to question text for legacy rows.
  const pastAnswers = questionAnswers.filter(
    (a) => (a.question_id && a.question_id === q.id) || a.question === q.question,
  );
  const recentAnswers = [...pastAnswers]
    .sort(
      (a, b) =>
        (b.date || '').localeCompare(a.date || '') ||
        (b.created_at || '').localeCompare(a.created_at || ''),
    )
    .slice(0, 5);

  // Legacy Next ↻: random different question.
  const next = () => {
    if (questions.length <= 1) {
      setQIdx((i) => i + 1);
      return;
    }
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * questions.length);
    setQIdx(n);
  };

  const saveAnswer = async () => {
    const text = answer.trim();
    if (!text || saving) return;
    setSaving(true);
    const { data } = await db.questionAnswers.insert({
      question_id: q.id,
      question: q.question,
      answer: text,
      date: todayIso(),
    });
    if (data) upsertRow('questionAnswers', data);
    setSaving(false);
    setAnswer('');
    setAnswerOpen(false);
  };

  const deleteAnswer = (id: string) =>
    confirmAction('Delete this answer?', undefined, async () => {
      const { error } = await db.questionAnswers.remove(id);
      if (!error) removeRow('questionAnswers', id);
    });

  return (
    <Card style={{ backgroundColor: palette.paigeBg, borderColor: 'transparent' }}>
      <Mono size={10} color={palette.paige} style={styles.qlbl}>
        💬 ask paige
      </Mono>
      <Text style={[styles.qtxt, { color: palette.text1 }]}>{q.question}</Text>
      <View style={styles.btnRow}>
        <Pressable
          onPress={next}
          style={[styles.qBtn, { backgroundColor: palette.surface, borderColor: palette.border2 }]}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: palette.text2 }}>
            Next ↻
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setAnswer('');
            setAnswerOpen(true);
          }}
          style={[styles.qBtn, { backgroundColor: palette.paige, borderColor: palette.paige }]}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: '#fff' }}>
            + Log her answer
          </Text>
        </Pressable>
      </View>
      <Mono size={9} style={{ textAlign: 'center', marginTop: 8 }}>
        Q{idx + 1} of {questions.length}
        {pastAnswers.length
          ? ` · ${pastAnswers.length} answer${pastAnswers.length > 1 ? 's' : ''} logged`
          : ''}
      </Mono>

      {recentAnswers.length ? (
        <View style={[styles.pastWrap, { borderTopColor: palette.border2 }]}>
          <Mono size={10} color={palette.paige} style={{ marginBottom: 6 }}>
            past answers
          </Mono>
          {recentAnswers.map((a) => (
            <View key={a.id} style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: palette.text2,
                  lineHeight: 17,
                }}
              >
                "{a.answer}"
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Mono size={9}>{fmtDate(a.date)}</Mono>
                <Pressable onPress={() => deleteAnswer(a.id)} hitSlop={6}>
                  <Mono size={9} color={palette.text3}>
                    delete
                  </Mono>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Legacy logqa-modal. */}
      <BottomSheet visible={answerOpen} onClose={() => setAnswerOpen(false)}>
        <SheetTitle title="Log Paige's answer" sub={`"${q.question}"`} subColor={palette.paige} />
        <TextField
          placeholder="What did she say?"
          value={answer}
          onChangeText={setAnswer}
          multiline
          autoFocus
          style={{ minHeight: 90 }}
        />
        <Button
          title="Save answer"
          variant="accent"
          accentColor={palette.paige}
          onPress={saveAnswer}
          loading={saving}
          style={{ marginTop: 12 }}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  qlbl: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  qtxt: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  qBtn: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  pastWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
