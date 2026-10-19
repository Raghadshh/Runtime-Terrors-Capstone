// Basic routine execution (R18). Focus Mode can build on this saved step progress.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, FormError } from '@/components/screen';
import { Header } from '@/components/header';
import { ProgressBar } from '@/components/progress';
import { useMine } from '@/lib/dashboard';
import { CountdownTimer, formatClock, useTimerTicks } from '../timer/countdownTimer';
import { useRoutines } from './RoutinesContext';
import { routineOccursOn } from './routineRules';
import { RoutineAction, routineStyles as s } from './RoutineControls';

export default function ActiveRoutineScreen({ routineId, childView = false }: { routineId: string; childView?: boolean }) {
  const { child } = useMine();
  const { routines, loading, error: loadError, today, setStepDone } = useRoutines();
  const routine = routines.find(item => item.id === routineId && (!childView || item.childId === child?.id));
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const index = selectedId ? routine?.steps.findIndex(step => step.id === selectedId) ?? -1 : -1;
  const currentIndex = index >= 0 ? index : routine?.activeIndex ?? 0;
  const step = routine?.steps[currentIndex];
  const timer = useMemo(() => new CountdownTimer((step?.minutes ?? 1) * 60), [step?.id, step?.minutes, today]);
  useTimerTicks(timer);
  // The optional timer is local to this visit. Completion is stored separately in Supabase.
  useEffect(() => {
    if (paused) timer.pause();
    return () => timer.pause();
  }, [timer, paused]);
  const done = routine?.steps.filter(item => item.completed).length ?? 0;
  const complete = !!routine?.steps.length && done === routine.steps.length;
  const scheduled = !!routine && routineOccursOn(routine, today);
  function details() { router.replace('/routines/' + routineId + (childView ? '?childView=1' : '')); }
  async function finishStep() {
    if (!step || !routine || busy || paused) return;
    setBusy(true); setError(null);
    try {
      await setStepDone(routineId, step.id, true);
      const next = routine.steps.findIndex((item, position) => position > currentIndex && !item.completed);
      const other = routine.steps.findIndex(item => item.id !== step.id && !item.completed);
      setSelectedId(routine.steps[next >= 0 ? next : other]?.id ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your progress was not saved.'); }
    finally { setBusy(false); }
  }
  return <Screen>
    <Header title="Active Routine" />
    {!routine || !step ? <><Text style={s.body}>{loading ? 'Loading routine…' : 'This routine was not found.'}</Text><FormError message={loadError} /></> :
      complete ? <View style={{ gap: 22, paddingTop: 70 }}>
        <Text style={[s.heading, { textAlign: 'center', fontSize: 28 }]}>Nice job!</Text>
        <Text style={[s.body, { textAlign: 'center' }]}>{routine.name} is complete for today.</Text>
        <ProgressBar percent={100} />
        <RoutineAction label="Back to Routine" onPress={details} />
      </View> : <View style={{ gap: 18 }}>
        <Text style={[s.label, { textAlign: 'center', color: '#2C7A4B' }]}>Step {currentIndex + 1} of {routine.steps.length}</Text>
        <ProgressBar percent={done / routine.steps.length * 100} />
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Svg width={172} height={172} viewBox="0 0 172 172">
            <Circle cx={86} cy={86} r={75} stroke="#DDECF4" strokeWidth={20} fill="white" />
          </Svg>
          <Text style={[s.heading, { fontSize: 25, marginTop: 12, textAlign: 'center' }]}>{step.title}</Text>
          <Text style={[s.muted, { marginTop: 8 }]}>One small step at a time.</Text>
          <Text style={[s.heading, { fontSize: 48, marginTop: 22, fontVariant: ['tabular-nums'] }]}>{formatClock(timer.remainingSeconds)}</Text>
          <Text style={s.muted}>Optional step timer</Text>
        </View>
        <RoutineAction label={timer.status === 'running' ? 'Pause Timer' : timer.status === 'paused' ? 'Resume Timer' : 'Start Timer'}
          secondary disabled={paused || !scheduled || timer.remainingSeconds === 0} onPress={() => timer.toggle()} />
        <FormError message={error || loadError} />
        {!scheduled ? <Text style={s.muted}>This routine is not scheduled for today.</Text> : null}
        <RoutineAction label={busy ? 'Saving…' : step.completed ? 'Step already complete' : 'Done with this step'}
          disabled={busy || paused || !scheduled || step.completed} onPress={() => void finishStep()} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><RoutineAction label="Previous" secondary disabled={busy || currentIndex === 0}
            onPress={() => setSelectedId(routine.steps[currentIndex - 1].id)} /></View>
          <View style={{ flex: 1 }}><RoutineAction label="Next" secondary disabled={busy || currentIndex === routine.steps.length - 1}
            onPress={() => setSelectedId(routine.steps[currentIndex + 1].id)} /></View>
        </View>
        <RoutineAction label={paused ? 'Resume routine' : 'Pause routine'} tint="#FFF1B8" secondary disabled={busy} onPress={() => setPaused(!paused)} />
        <RoutineAction label="Back to Routine" secondary disabled={busy} onPress={details} />
      </View>}
  </Screen>;
}
