//routine template - wireframe 21A - F6 - R16
import { useRouter } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { Screen } from '@/components/screen';
import { Header } from '@/components/header';
import { RoutineNavigation } from './RoutineNavigation';
import { ROUTINE_TEMPLATES } from './routineTemplates';
import { RoutineAction, routineColors, routineStyles as s } from './RoutineControls';

export default function RoutineTemplatesScreen() {
  const router = useRouter();

  return (
    <Screen bottomBar={<RoutineNavigation />}>
      <Header title="Routine Templates" />
      <View style={{ gap: 16 }}>
        <View style={{ marginBottom: 4 }}>
          <Text style={[s.heading, { fontSize: 20 }]}>Choose a starting point</Text>
          <Text style={s.muted}>Make it your own before saving.</Text>
        </View>

        {ROUTINE_TEMPLATES.map((template, index) => {
          const totalDuration = template.steps.reduce((acc, step) => acc + step.minutes, 0);
          const tint = routineColors[index % routineColors.length];

          return (
            <View
              key={template.id}
              style={[
                s.card,
                {
                  borderLeftWidth: 8,
                  borderLeftColor: tint,
                  gap: 12,
                  paddingVertical: 14,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: tint,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[s.heading, { fontSize: 18, color: '#294A60' }]}>
                    {template.badgeText}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.heading}>{template.name}</Text>
                  <Text style={s.muted}>
                    {template.steps.length} steps · {totalDuration} min
                  </Text>
                </View>
              </View>

              <Text style={s.body}>{template.description}</Text>

              <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Use ' + template.name + ' template'}
                  onPress={() => router.push(`/routines/new?templateId=${template.id}`)}
                  style={{
                    backgroundColor: '#65A878',
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                    Use Template
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={[s.card, { backgroundColor: '#EBF4EC', gap: 4, marginTop: 4 }]}>
          <Text style={[s.heading, { fontSize: 15 }]}>Your routine, your way</Text>
          <Text style={s.muted}>Edit steps, times, repeat days, and assignment.</Text>
        </View>

        <RoutineAction
          label="Create from scratch"
          secondary
          onPress={() => router.push('/routines/new')}
        />
      </View>
    </Screen>
  );
}