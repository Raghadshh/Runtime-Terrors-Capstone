/**
 * F15 – Estimated task duration: logic + "How long?" picker UI.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { C, FONTS, Icon, Txt } from '../timer/shared';

/* ============================== Logic ============================== */

export const DURATION_PRESETS = [5, 15, 30] as const;
export const DEFAULT_DURATION = 10;
export const MIN_DURATION = 1;
export const MAX_DURATION = 600;

/** Duration in whole minutes. */
export type DurationMinutes = number;

export function isPresetDuration(minutes: DurationMinutes | null): boolean {
  return minutes !== null && (DURATION_PRESETS as readonly number[]).includes(minutes);
}

/** Returns a whole number of minutes within range, or null when the input is invalid. */
export function parseDuration(value: string | number | null | undefined): DurationMinutes | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < MIN_DURATION || n > MAX_DURATION) return null;
  return n;
}

/** "10 min" – compact form used on task cards and pills. */
export function formatDurationShort(minutes: DurationMinutes): string {
  return `${minutes} min`;
}

/** "10 minutes" / "1 minute" – long form used in details and summaries. */
export function formatDurationLong(minutes: DurationMinutes): string {
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

export function durationToSeconds(minutes: DurationMinutes): number {
  return minutes * 60;
}

/* ============================== Duration picker UI ============================== */

export interface DurationPickerProps {
  /** Current duration in minutes, or null while the custom value is invalid. */
  value: DurationMinutes | null;
  onChange: (minutes: DurationMinutes | null) => void;
  /** Force the validation message (e.g. after a failed save). */
  showError?: boolean;
}

export function DurationPicker({ value, onChange, showError = false }: DurationPickerProps) {
  const [customMode, setCustomMode] = useState(() => !isPresetDuration(value));
  const [text, setText] = useState(() => (value !== null && !isPresetDuration(value) ? String(value) : ''));
  const inputRef = useRef<TextInput>(null);
  const focusNext = useRef(false);

  useEffect(() => {
    if (customMode && focusNext.current) inputRef.current?.focus();
    focusNext.current = false;
  }, [customMode]);

  const invalid = customMode && ((text !== '' && parseDuration(text) === null) || (showError && value === null));

  const choosePreset = (minutes: DurationMinutes): void => {
    setCustomMode(false);
    onChange(minutes);
  };

  const chooseCustom = (): void => {
    setText(value !== null ? String(value) : '');
    focusNext.current = true;
    setCustomMode(true);
  };

  const changeText = (raw: string): void => {
    const digits = raw.replace(/[^0-9]/g, '');
    setText(digits);
    onChange(parseDuration(digits));
  };

  return (
    <View style={s.card}>
      <Txt w={700} size={15} style={s.heading}>How long?</Txt>
      <View style={s.options} accessibilityRole="radiogroup" accessibilityLabel="Estimated duration">
        {DURATION_PRESETS.map((m) => (
          <Pill key={m} label={formatDurationShort(m)} selected={!customMode && value === m} onPress={() => choosePreset(m)} />
        ))}
        <Pill label="Custom" selected={customMode} onPress={chooseCustom} wide />
      </View>

      {customMode ? (
        <View style={s.custom}>
          <Txt w={600} size={11} style={s.label}>Enter minutes</Txt>
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={s.input}
              value={text}
              onChangeText={changeText}
              keyboardType="number-pad"
              placeholder="e.g. 10"
              placeholderTextColor={C.placeholder}
              maxLength={3}
              accessibilityLabel="Custom minutes"
            />
            <Txt w={600} size={13}>min</Txt>
          </View>
          {invalid ? (
            <Txt w={600} size={11} color={C.danger} style={s.error}>
              Enter a number from {MIN_DURATION} to {MAX_DURATION}.
            </Txt>
          ) : null}
        </View>
      ) : null}

      <View style={s.summary}>
        <Icon name="stopwatch" size={16} />
        <Txt size={12}>
          Task duration: <Txt w={700} size={12}>{value ? formatDurationLong(value) : '—'}</Txt>
        </Txt>
      </View>
    </View>
  );
}

function Pill({ label, selected, onPress, wide = false }: { label: string; selected: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      style={[s.pill, wide && s.pillWide, selected && s.pillSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <Txt w={selected ? 700 : 500} size={12} color={selected ? C.white : C.navy}>{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.paleYellow, borderRadius: 18, padding: 12, marginBottom: 12 },
  heading: { marginBottom: 10 },
  options: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, height: 30, borderRadius: 999, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  pillWide: { flex: 1.25 },
  pillSelected: { backgroundColor: C.green },
  custom: { marginTop: 12 },
  label: { marginBottom: 6, marginLeft: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, fontFamily: FONTS[400], color: C.navy,
  },
  error: { marginTop: 6 },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    paddingVertical: 9, paddingHorizontal: 12, backgroundColor: C.white, borderRadius: 12,
  },
});
