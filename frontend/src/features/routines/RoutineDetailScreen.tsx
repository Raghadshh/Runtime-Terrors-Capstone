import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Screen, FormError } from '@/components/screen';
import { Header } from '@/components/header';
import { ProgressBar } from '@/components/progress';
import { useMine } from '@/lib/dashboard';
import { formatClock } from '@/lib/format';
import { RoutineNavigation } from './RoutineNavigation';
import { useRoutines } from './RoutinesContext';
import { repeatDays, routineDraft, routineOccursOn } from './routineRules';
import { RoundCheck, RoutineAction, RoutineModal, routineStyles as s } from './RoutineControls';

export default function RoutineDetailScreen({ routineId, childView = false }: { routineId: string; childView?: boolean }) {
  const router = useRouter();
  const { children, child } = useMine();
  const { routines, loading, error: loadError, today, setStepDone, removeRoutine, saveRoutine } = useRoutines();
  const routine = routines.find(item => item.id === routineId && (!childView || item.childId === child?.id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!routine) return <Screen bottomBar={childView ? undefined : <RoutineNavigation />}>
    <Header title="Routine Details" /><Text style={s.body}>{loading ? 'Loading routine…' : 'This routine was not found.'}</Text><FormError message={loadError} />
  </Screen>;
  const done = routine.steps.filter(step => step.completed).length;
  const complete = routine.steps.length > 0 && done === routine.steps.length;
  const scheduled = routineOccursOn(routine, today);
  const assigned = children.find(profile => profile.id === routine.childId)?.name ?? 'For you';
  const duration = routine.steps.reduce((total, step) => total + step.minutes, 0);
  async function toggle(stepId: string, finished: boolean) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await setStepDone(routineId, stepId, !finished); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your progress was not saved.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (busy) return;
    setBusy(true); setError(null);
    try { await removeRoutine(routineId); router.replace('/routines'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete routine.'); setDeleting(false); }
    finally { setBusy(false); }
  }
  async function duplicate() {
    if (!routine || busy) return;
    setBusy(true); setError(null);
    const draft = routineDraft(routine);
    draft.name = draft.name.slice(0, 93) + ' (copy)';
    draft.steps = draft.steps.map(step => ({ ...step, id: randomUUID() }));
    try { const id = await saveRoutine(draft); router.replace('/routines/edit/' + id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not copy routine.'); }
    finally { setBusy(false); }
  }
  return <Screen bottomBar={childView ? undefined : <RoutineNavigation />}>
    <Header title="Routine Details" />
    <View style={[s.card, { backgroundColor: '#E3F0DD', marginBottom: 18, gap: 7 }]}>
      <Text style={[s.label, { color: '#2C7A4B', fontSize: 11 }]}>{routine.name.toUpperCase()}</Text>
      <Text style={[s.heading, { fontSize: 23 }]}>{routine.subtitle || routine.name}</Text>
      <Text style={s.muted}>{assigned} · {repeatDays(routine.days)} at {formatClock(routine.time)} · {duration} min</Text>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}>
      <Text style={s.heading}>Progress</Text><Text style={[s.label, { color: '#2C7A4B' }]}>{done} of {routine.steps.length} steps</Text>
    </View>
    <ProgressBar percent={routine.steps.length ? done / routine.steps.length * 100 : 0} />
    <View style={[s.card, { marginTop: 20, marginBottom: 24 }]}>
      <Text style={[s.heading, { marginBottom: 8 }]}>Steps</Text>
      {routine.steps.map((step, index) => <Pressable key={step.id} accessibilityRole="checkbox"
        accessibilityLabel={'Complete step: ' + step.title} accessibilityState={{ checked: step.completed, disabled: busy || !scheduled }}
        disabled={busy || !scheduled} onPress={() => void toggle(step.id, step.completed)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 }}>
        <RoundCheck checked={step.completed} />
        <Text style={[s.body, { flex: 1 }, step.completed ? { textDecorationLine: 'line-through', color: '#557085' } : null]}>{index + 1}. {step.title}</Text>
      </Pressable>)}
    </View>
    {!scheduled ? <Text style={[s.muted, { marginBottom: 12 }]}>This routine is not scheduled for today. You can still view and edit it.</Text> : null}
    <View style={{ gap: 12 }}>
      <FormError message={error || loadError} />
      <RoutineAction label={complete ? 'Routine complete for today' : done ? 'Continue Routine' : 'Start Routine'} disabled={busy || !scheduled || complete}
        onPress={() => router.push('/routines/active/' + routineId + (childView ? '?childView=1' : ''))} />
      {!childView ? <>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><RoutineAction label="Edit Routine" secondary disabled={busy} onPress={() => router.push('/routines/edit/' + routineId)} /></View>
          <View style={{ flex: 1 }}><RoutineAction label="Delete" secondary danger disabled={busy} onPress={() => setDeleting(true)} /></View>
        </View>
        <RoutineAction label="Reuse Routine" secondary disabled={busy} onPress={() => void duplicate()} />
        <Text style={s.muted}>Progress is saved for today. Kept steps keep their saved progress when edited.</Text>
      </> : null}
    </View>
    <RoutineModal visible={deleting} title="Delete this routine?" onClose={() => { if (!busy) setDeleting(false); }}>
      <View style={{ gap: 16 }}>
        <Text style={s.body}>This removes {routine.name}, its steps, and its saved progress. This cannot be undone.</Text>
        <RoutineAction label={busy ? 'Deleting…' : 'Delete Routine'} secondary danger disabled={busy} onPress={() => void remove()} />
        <RoutineAction label="Cancel" secondary disabled={busy} onPress={() => setDeleting(false)} />
      </View>
    </RoutineModal>
  </Screen>;
}
