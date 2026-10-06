/**
 * F14 – Countdown timer: logic, per-task registry + circular timer UI.
 */
import React, { useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Button, C, Icon, Txt, type Task } from './shared';

/* ============================== Logic ============================== */

export const TimerStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- value + type pair, like an enum
export type TimerStatus = (typeof TimerStatus)[keyof typeof TimerStatus];

export type TimerListener = (timer: CountdownTimer) => void;
export type Unsubscribe = () => void;

export interface CountdownTimerOptions {
  /** Playback multiplier; >1 fast-forwards the countdown. */
  speed?: number;
}

const TICK_MS = 200;

// Optional EXPO_PUBLIC_TIMER_SPEED=N fast-forwards timers (useful for demos/testing).
const SPEED = Math.max(1, Number(process.env.EXPO_PUBLIC_TIMER_SPEED) || 1);

export class CountdownTimer {
  durationSeconds: number;
  readonly speed: number;
  remainingMs: number;
  status: TimerStatus = TimerStatus.IDLE;

  private endsAt: number | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<TimerListener>();

  constructor(durationSeconds: number, { speed = SPEED }: CountdownTimerOptions = {}) {
    this.durationSeconds = durationSeconds;
    this.speed = speed;
    this.remainingMs = durationSeconds * 1000;
  }

  get remainingSeconds(): number {
    return Math.max(0, Math.ceil(this.remainingMs / 1000));
  }

  /** Fraction of time remaining, 1 → 0. */
  get progress(): number {
    return this.durationSeconds ? this.remainingMs / (this.durationSeconds * 1000) : 0;
  }

  start(): void {
    if (this.status === TimerStatus.RUNNING || this.remainingMs <= 0) return;
    this.endsAt = Date.now() + this.remainingMs / this.speed;
    this.status = TimerStatus.RUNNING;
    this.interval = setInterval(() => this.tick(), TICK_MS);
    this.emit();
  }

  pause(): void {
    if (this.status !== TimerStatus.RUNNING) return;
    this.sync();
    this.clear();
    this.status = TimerStatus.PAUSED;
    this.emit();
  }

  resume(): void {
    if (this.status === TimerStatus.PAUSED) this.start();
  }

  toggle(): void {
    if (this.status === TimerStatus.RUNNING) this.pause();
    else this.start();
  }

  reset(): void {
    this.clear();
    this.remainingMs = this.durationSeconds * 1000;
    this.status = TimerStatus.IDLE;
    this.emit();
  }

  restart(): void {
    this.reset();
    this.start();
  }

  setDuration(durationSeconds: number): void {
    this.durationSeconds = durationSeconds;
    this.reset();
  }

  subscribe(listener: TimerListener): Unsubscribe {
    this.listeners.add(listener);
    listener(this);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private sync(): void {
    if (this.endsAt === null) return;
    this.remainingMs = Math.max(0, (this.endsAt - Date.now()) * this.speed);
  }

  private tick(): void {
    this.sync();
    if (this.remainingMs <= 0) {
      this.remainingMs = 0;
      this.clear();
      this.status = TimerStatus.FINISHED;
    }
    this.emit();
  }

  private clear(): void {
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
    this.endsAt = null;
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn(this));
  }
}

/** "10:00", "09:59", "00:00" */
export function formatClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/* ---------- Per-task registry ---------- */

const timers = new Map<string, CountdownTimer>();

/** Returns the task's timer, creating it from the task's estimated duration (minutes). */
export function getTaskTimer(task: Task): CountdownTimer {
  const seconds = task.durationMinutes * 60;
  let timer = timers.get(task.id);
  if (!timer) {
    timer = new CountdownTimer(seconds);
    timers.set(task.id, timer);
  } else if (timer.durationSeconds !== seconds && timer.status === TimerStatus.IDLE) {
    timer.setDuration(seconds);
  }
  return timer;
}

export function peekTaskTimer(taskId: string): CountdownTimer | null {
  return timers.get(taskId) ?? null;
}

/** Called when a task's estimated duration changes so its timer matches. */
export function syncTaskTimerDuration(taskId: string, minutes: number): void {
  const timer = timers.get(taskId);
  if (timer && timer.durationSeconds !== minutes * 60) timer.setDuration(minutes * 60);
}

export function removeTaskTimer(taskId: string): void {
  timers.get(taskId)?.reset();
  timers.delete(taskId);
}

/* ---------- React hooks ---------- */

/** Re-renders the component on every timer tick. */
export function useTimerTicks(timer: CountdownTimer | null): void {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => (timer ? timer.subscribe(() => force()) : undefined), [timer]);
}

/** Re-renders only when the timer's status changes. */
export function useTimerStatus(timer: CountdownTimer | null): TimerStatus | null {
  const [status, setStatus] = useState<TimerStatus | null>(timer?.status ?? null);
  useEffect(() => (timer ? timer.subscribe((t) => setStatus(t.status)) : undefined), [timer]);
  return status;
}

/* ============================== Timer UI ============================== */

const STATUS_LABEL: Record<TimerStatus, string> = {
  [TimerStatus.IDLE]: 'Ready to start',
  [TimerStatus.RUNNING]: 'Time left',
  [TimerStatus.PAUSED]: 'Paused',
  [TimerStatus.FINISHED]: "Time's up!",
};

export interface CircularTimerProps {
  timer: CountdownTimer;
  size?: number;
  stroke?: number;
}

export function CircularTimer({ timer, size = 200, stroke = 14 }: CircularTimerProps) {
  useTimerTicks(timer);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const finished = timer.status === TimerStatus.FINISHED;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessibilityRole="timer">
      <Svg width={size} height={size} style={s.ringSvg}>
        <Circle cx={center} cy={center} r={radius} stroke={C.lightGreen} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={C.green}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - timer.progress)}
        />
      </Svg>
      <View style={s.ringCenter}>
        <Txt w={800} size={44} style={s.ringTime}>{formatClock(timer.remainingSeconds)}</Txt>
        <Txt w={finished ? 700 : 600} size={12} color={finished ? C.green : C.muted}>{STATUS_LABEL[timer.status]}</Txt>
      </View>
    </View>
  );
}

export type TimerControlsMode = 'details' | 'active';

export interface TimerControlsProps {
  timer: CountdownTimer;
  /**
   * "details": Start + Reset (Start calls onStart so the screen can open the active timer).
   * "active":  Reset + Pause/Resume, switching to Restart Timer once time is up.
   */
  mode?: TimerControlsMode;
  onStart?: () => void;
}

export function TimerControls({ timer, mode = 'active', onStart }: TimerControlsProps) {
  const status = useTimerStatus(timer);

  if (mode === 'details') {
    const startLabel = status === TimerStatus.RUNNING ? 'View Timer' : status === TimerStatus.PAUSED ? 'Resume' : 'Start';
    return (
      <View style={s.btnRow}>
        <Button variant="outline" icon="reset" label="Reset" style={s.flex} onPress={() => timer.reset()} />
        <Button
          icon="play"
          label={startLabel}
          style={s.flex}
          onPress={() => {
            if (timer.status !== TimerStatus.RUNNING) timer.start();
            onStart?.();
          }}
        />
      </View>
    );
  }

  if (status === TimerStatus.FINISHED) {
    return <Button icon="reset" label="Restart Timer" onPress={() => timer.restart()} />;
  }

  const running = status === TimerStatus.RUNNING;
  const toggleLabel = running ? 'Pause' : status === TimerStatus.PAUSED ? 'Resume' : 'Start';
  return (
    <View style={s.btnRow}>
      <Button variant="outline" icon="reset" label="Reset" style={s.flex} onPress={() => timer.reset()} />
      <Button icon={running ? 'pause' : 'play'} label={toggleLabel} style={s.flex} onPress={() => timer.toggle()} />
    </View>
  );
}

/** Round play/pause button on task cards: starts the task's timer and opens it. */
export function TaskPlayButton({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const status = useTimerStatus(peekTaskTimer(task.id));
  const running = status === TimerStatus.RUNNING;
  return (
    <Pressable
      style={[s.play, running && s.playRunning]}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Start timer for ${task.title}`}
      onPress={() => {
        const timer = getTaskTimer(task);
        if (timer.status !== TimerStatus.RUNNING && timer.status !== TimerStatus.FINISHED) timer.start();
        onOpen();
      }}
    >
      <Icon name={running ? 'pause' : 'play'} size={14} stroke={2.5} color={running ? C.white : C.green} />
    </Pressable>
  );
}

/** "• 08:42" shown on task cards while a timer is running or paused. */
export function LiveRemaining({ taskId }: { taskId: string }) {
  const timer = peekTaskTimer(taskId);
  useTimerTicks(timer);
  if (!timer || (timer.status !== TimerStatus.RUNNING && timer.status !== TimerStatus.PAUSED)) return null;
  return (
    <>
      <Txt size={11} style={s.dot}>•</Txt>
      <Txt w={700} size={11} color={C.green} style={s.tabular}>{formatClock(timer.remainingSeconds)}</Txt>
    </>
  );
}

const s = StyleSheet.create({
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 4 },
  ringTime: { letterSpacing: -1, fontVariant: ['tabular-nums'] },
  btnRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.lightGreen, alignItems: 'center', justifyContent: 'center' },
  playRunning: { backgroundColor: C.green },
  dot: { marginHorizontal: 3 },
  tabular: { fontVariant: ['tabular-nums'] },
});
