//Focus mode view - F3 - R16 - FigmaWireframe: 30
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '@/components/screen';
import { Header } from '@/components/header';
import { CountdownTimer, formatClock } from '../timer/countdownTimer';
import { RoutineAction, routineStyles as s } from './RoutineControls';
import type { RoutineStep } from '@/lib/types';

interface FocusModeViewProps {
  step: RoutineStep;
  timer: CountdownTimer;
  onPauseToggle: () => void;
  onFinishStep: () => void;
  onExit: () => void;
}

export function FocusModeView({
  step,
  timer,
  onPauseToggle,
  onFinishStep,
  onExit,
}: FocusModeViewProps) {
  const size = 180;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <Screen>
      <Header title="Focus Timer" />
      <View style={{ alignItems: 'center', gap: 16, marginTop: 10 }}>
        <Text style={[s.heading, { fontSize: 22, textAlign: 'center' }]}>{step.title}</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>{step.minutes} minute focus session</Text>

        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={center} cy={center} r={radius} stroke="#E6F1E0" strokeWidth={stroke} fill="white" />
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#75A67C"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={circumference * (1 - timer.progress)}
            />
          </Svg>
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[s.heading, { fontSize: 38, fontVariant: ['tabular-nums'], color: '#2E3B4E' }]}>
              {formatClock(timer.remainingSeconds)}
            </Text>
            <Text style={[s.muted, { fontSize: 12 }]}>remaining</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, width: '100%', paddingHorizontal: 12 }}>
          <View style={{ flex: 1 }}>
            <RoutineAction
              label={timer.status === 'running' ? 'Pause' : 'Resume'}
              secondary
              onPress={onPauseToggle}
            />
          </View>
          <View style={{ flex: 1 }}>
            <RoutineAction
              label="Finish"
              onPress={onFinishStep}
            />
          </View>
        </View>

        <View style={{ backgroundColor: '#E3F0DD', padding: 16, borderRadius: 14, width: '100%', alignItems: 'center', marginTop: 10 }}>
          <Text style={[s.label, { color: '#2C7A4B', textAlign: 'center' }]}>Stay with this one step.</Text>
          <Text style={[s.muted, { textAlign: 'center', marginTop: 4 }]}>You can pause whenever you need.</Text>
        </View>

        <View style={{ width: '100%', marginTop: 20 }}>
          <RoutineAction label="Exit focus mode" secondary onPress={onExit} />
        </View>
      </View>
    </Screen>
  );
}