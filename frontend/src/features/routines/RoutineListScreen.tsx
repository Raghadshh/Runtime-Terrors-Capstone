import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Screen, EmptyState, FormError } from '@/components/screen';
import { Header } from '@/components/header';
import { useMine } from '@/lib/dashboard';
import { formatClock } from '@/lib/format';
import { RoutineNavigation } from './RoutineNavigation';
import { useRoutines } from './RoutinesContext';
import { repeatDays, routineOccursOn } from './routineRules';
import { RoutineAction, RoutineModal, routineColors, routineStyles as s } from './RoutineControls';
import { routineArt } from './routineArt';

export default function RoutineListScreen() {
  const router = useRouter();
  const { user, child, children, chooseChild } = useMine();
  const { routines, today, loading, error, reload } = useRoutines();
  const [selecting, setSelecting] = useState(false);
  const parent = user?.accountType === 'parent';
  const visible = routines.filter(routine => parent ? !!child && routine.childId === child.id : routine.childId === null);

  return (
    <Screen bottomBar={<RoutineNavigation />}>
      <Header title="Routines" />
      <View style={{ position: 'relative', marginBottom: 20 }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -10 }}>
          <SvgXml xml={routineArt.leaf} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', right: 24, top: -4 }}>
          <SvgXml xml={routineArt.dot} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={parent ? 'Choose child for routines' : 'Your routines'}
          disabled={!parent}
          onPress={() => setSelecting(true)}
          style={[s.card, { paddingVertical: 12 }]}
        >
          <Text style={s.muted}>{parent ? 'Parent view' : 'Independent view'}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[s.heading, { fontSize: 16 }]}>
              {parent ? child?.name ?? 'Add a child profile' : user?.preferredName || user?.name || 'For you'}
            </Text>
            {parent ? <Text style={s.body}>⌄</Text> : null}
          </View>
        </Pressable>
      </View>

      <Text style={[s.heading, { marginBottom: 12 }]}>Your routines</Text>
      {loading ? <Text style={s.muted}>Loading routines…</Text> : null}
      <FormError message={error} />
      {error ? <RoutineAction label="Try again" secondary onPress={() => void reload()} /> : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title="Start with one small routine"
          body={parent && !child ? 'Add a child profile before assigning a routine.' : 'Add a few steps to make your day easier to follow.'}
        />
      ) : null}

      {visible.map((routine, index) => {
        const done = routine.steps.filter(step => step.completed).length;
        const duration = routine.steps.reduce((total, step) => total + step.minutes, 0);
        const tint = routineColors[index % routineColors.length];
        return (
          <Pressable
            key={routine.id}
            accessibilityRole="button"
            accessibilityLabel={'Open routine: ' + routine.name}
            onPress={() => router.push('/routines/' + routine.id)}
            style={[s.card, { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 12, overflow: 'hidden', minHeight: 92 }]}
          >
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, backgroundColor: tint }} />
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tint, justifyContent: 'center', alignItems: 'center', marginLeft: 5 }}>
              <Text style={[s.body, { fontSize: 30 }]}>+</Text>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.heading}>{routine.name}</Text>
              <Text style={s.muted}>{routine.steps.length} steps · {duration} min</Text>
              <Text style={[s.label, { color: '#2C7A4B', fontSize: 12 }]}>
                {done ? done + ' of ' + routine.steps.length + ' complete' : routineOccursOn(routine, today) ? 'Ready to start' : repeatDays(routine.days) + ' · ' + formatClock(routine.time)}
              </Text>
            </View>
            <Text style={[s.heading, { fontSize: 28 }]}>›</Text>
          </Pressable>
        );
      })}

      <View style={{ marginTop: 20, gap: 12 }}>
        <RoutineAction label="+ Create Routine" disabled={parent && !child} onPress={() => router.push('/routines/new')} />
        
        <RoutineAction
          label="Use a Template"
          secondary
          disabled={parent && !child}
          onPress={() => router.push('/routines/templates')}
        />

        {parent && !child ? <RoutineAction label="Add child profile" secondary onPress={() => router.push('/child-profile')} /> : null}
        <Text style={s.muted}>Small steps make routines easier to follow.</Text>
      </View>

      <RoutineModal visible={selecting} onClose={() => setSelecting(false)} title="Choose a child">
        <View style={{ gap: 10 }}>
          {children.map(profile => (
            <RoutineAction
              key={profile.id}
              secondary
              label={profile.name}
              onPress={() => { chooseChild(profile.id); setSelecting(false); }}
            />
          ))}
          <RoutineAction label="Cancel" secondary onPress={() => setSelecting(false)} />
        </View>
      </RoutineModal>
    </Screen>
  );
}