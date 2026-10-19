import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Screen, FormError } from '@/components/screen';
import { Header } from '@/components/header';
import { useMine } from '@/lib/dashboard';
import { formatClock } from '@/lib/format';
import { useRoutines } from './RoutinesContext';
import { moveStep, routineDraft, validateRoutine, validRoutineTime, weekdays, type RoutineDraft, type StepDraft } from './routineRules';
import { RoutineNavigation } from './RoutineNavigation';
import { RoundCheck, RoutineAction, RoutineField, RoutineModal, routineStyles as s } from './RoutineControls';

export default function RoutineFormScreen({ routineId }: { routineId?: string }) {
  const { routines, loading } = useRoutines();
  const original = routines.find(routine => routine.id === routineId);
  if (routineId && !original) return <Screen><Header title="Edit Routine" /><Text style={s.body}>
    {loading ? 'Loading routine…' : 'This routine was not found.'}</Text></Screen>;
  return <RoutineForm key={routineId ?? 'new'} routineId={routineId} initial={original ? routineDraft(original) : undefined} />;
}

function RoutineForm({ routineId, initial }: { routineId?: string; initial?: RoutineDraft }) {
  const router = useRouter();
  const { user, child, children } = useMine();
  const { routines, saveRoutine } = useRoutines();
  const [draft, setDraft] = useState<RoutineDraft>(() => initial ?? {
    name: '', subtitle: '', time: '07:00', days: [0,1,2,3,4], childId: user?.accountType === 'parent' ? child?.id ?? null : null, steps: [],
  });
  const [editing, setEditing] = useState<StepDraft | null>(null);
  const [stepMinutes, setStepMinutes] = useState('');
  const [reusing, setReusing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parent = user?.accountType === 'parent';
  function change(patch: Partial<RoutineDraft>) { setDraft(current => ({ ...current, ...patch })); }
  function editStep(step?: StepDraft) {
    setEditing(step ? { ...step } : { id: randomUUID(), title: '', minutes: 5 });
    setStepMinutes(String(step?.minutes ?? 5)); setStepError(null);
  }
  function addStep() {
    if (!editing) return;
    if (!editing.title.trim() || editing.title.trim().length > 100) { setStepError('Enter a step name from 1 to 100 characters.'); return; }
    const minutes = Number(stepMinutes);
    if (!/^[0-9]+$/.test(stepMinutes) || !Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      setStepError('Enter a whole number of minutes from 1 to 600.'); return;
    }
    const saved = { ...editing, title: editing.title.trim(), minutes };
    change({ steps: draft.steps.some(step => step.id === saved.id)
      ? draft.steps.map(step => step.id === saved.id ? saved : step) : [...draft.steps, saved] });
    setEditing(null);
  }
  async function save() {
    if (busy) return;
    const validation = validateRoutine(draft);
    if (validation) { setError(validation); return; }
    if (parent && !draft.childId) { setError('Choose a child profile for this routine.'); return; }
    setBusy(true); setError(null);
    try { const id = await saveRoutine(draft, routineId); router.replace('/routines/' + id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your routine.'); }
    finally { setBusy(false); }
  }
  const reusable = routines.flatMap(routine => routine.steps.map(step => ({ routine: routine.name, step })));
  return <Screen bottomBar={<RoutineNavigation />} footer={<>
    <FormError message={error} />
    <RoutineAction label={busy ? 'Saving…' : 'Save Routine'} disabled={busy} onPress={() => void save()} />
  </>}>
    <Header title={routineId ? 'Edit Routine' : 'Create Routine'} />
    <View style={{ gap: 12 }}>
      <RoutineField label="Routine name" value={draft.name} maxLength={100} placeholder="e.g. Morning Routine" onChangeText={name => change({ name })} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.heading}>Steps</Text><Text style={s.muted}>Use arrows to reorder</Text>
      </View>
      {draft.steps.map((step, index) => <View key={step.id} style={[s.card, { borderWidth: 1, borderColor: '#C5D8E4', borderRadius: 14, flexDirection: 'row', alignItems: 'center', padding: 8, gap: 5 }]}>
        <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3F0DD' }}><Text style={s.label}>{index + 1}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Edit step: ' + step.title} onPress={() => editStep(step)} style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}>
          <Text style={s.label}>{step.title}</Text><Text style={s.muted}>{step.minutes} min</Text>
        </Pressable>
        <View style={{ flexDirection: 'row' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={'Move up: ' + step.title} disabled={index === 0} style={[s.link, { opacity: index === 0 ? 0.3 : 1 }]} onPress={() => change({ steps: moveStep(draft.steps, index, -1) })}><Text style={s.body}>↑</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Move down: ' + step.title} disabled={index === draft.steps.length - 1} style={[s.link, { opacity: index === draft.steps.length - 1 ? 0.3 : 1 }]} onPress={() => change({ steps: moveStep(draft.steps, index, 1) })}><Text style={s.body}>↓</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Remove step: ' + step.title} style={s.link} onPress={() => change({ steps: draft.steps.filter(item => item.id !== step.id) })}><Text style={[s.body, { fontSize: 23 }]}>×</Text></Pressable>
      </View>)}
      <RoutineAction label="+ Add Step" tint="#DDECF4" secondary disabled={draft.steps.length >= 50} onPress={() => editStep()} />
      <Text style={s.label}>Repeat on</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {weekdays.map((day, index) => {
          const selected = draft.days.includes(index);
          return <Pressable key={day} accessibilityRole="button" accessibilityLabel={day} accessibilityState={{ selected }} onPress={() =>
            change({ days: selected ? draft.days.filter(value => value !== index) : [...draft.days, index].sort() })}
            style={{ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: selected ? '#65A878' : 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: selected ? '#65A878' : '#C5D8E4' }}>
            <Text style={[s.label, { color: selected ? 'white' : '#294A60' }]}>{day[0]}</Text>
          </Pressable>;
        })}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit schedule and description" style={s.link} onPress={() => setScheduling(true)}><Text style={s.muted}>Starts at {validRoutineTime(draft.time) ? formatClock(draft.time) : 'choose a time'} · Edit schedule and description</Text></Pressable>
      <Text style={s.label}>{parent ? 'Assign to' : 'For you'}</Text>
      {parent ? <View style={{ gap: 8 }}>
        {children.map(profile => <Pressable accessibilityRole="button" accessibilityState={{ selected: draft.childId === profile.id }} key={profile.id}
          onPress={() => change({ childId: profile.id })} style={[s.card, { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1.5, borderColor: draft.childId === profile.id ? '#65A878' : '#C5D8E4' }]}>
          <RoundCheck checked={draft.childId === profile.id} /><Text style={s.body}>{profile.name}</Text>
        </Pressable>)}
        {!children.length ? <RoutineAction label="Add child profile" secondary onPress={() => router.push('/child-profile')} /> : null}
      </View> : <Text style={s.muted}>This routine belongs to your independent profile.</Text>}
    </View>
    <RoutineModal visible={!!editing} title="Routine step" onClose={() => setEditing(null)}>
      <View style={{ gap: 16 }}>
        <RoutineField label="Step name" value={editing?.title ?? ''} maxLength={100} onChangeText={title => setEditing(current => current ? { ...current, title } : current)} />
        <RoutineField label="Step minutes" keyboardType="number-pad" value={stepMinutes} maxLength={3} onChangeText={setStepMinutes} />
        <FormError message={stepError} />
        <RoutineAction label="Save Step" onPress={addStep} />
        {reusable.length && !draft.steps.some(step => step.id === editing?.id) ? <RoutineAction label="Reuse an existing step" secondary onPress={() => { setEditing(null); setReusing(true); }} /> : null}
        <RoutineAction label="Cancel" secondary onPress={() => setEditing(null)} />
      </View>
    </RoutineModal>
    <RoutineModal visible={scheduling} title="Routine schedule" onClose={() => setScheduling(false)}>
      <View style={{ gap: 16 }}>
        <RoutineField label="Start time (24-hour)" value={draft.time} maxLength={5} placeholder="07:00" onChangeText={time => change({ time })} />
        <RoutineField label="Description (optional)" value={draft.subtitle} maxLength={200} placeholder="e.g. Start the day calmly" onChangeText={subtitle => change({ subtitle })} />
        <FormError message={scheduleError} />
        <RoutineAction label="Done" onPress={() => {
          if (!validRoutineTime(draft.time)) { setScheduleError('Enter a time like 07:30 or 18:30.'); return; }
          setScheduleError(null); setScheduling(false);
        }} />
      </View>
    </RoutineModal>
    <RoutineModal visible={reusing} title="Reuse a step" onClose={() => setReusing(false)}>
      <View style={{ gap: 10 }}>
        {reusable.map(({ routine, step }) => <RoutineAction key={step.id} secondary label={step.title + ' · ' + routine}
          onPress={() => { change({ steps: [...draft.steps, { id: randomUUID(), title: step.title, minutes: step.minutes }] }); setReusing(false); }} />)}
        <RoutineAction label="Cancel" secondary onPress={() => setReusing(false)} />
      </View>
    </RoutineModal>
  </Screen>;
}
