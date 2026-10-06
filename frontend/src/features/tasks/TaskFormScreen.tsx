/**
 * F1 create / edit task screen (R5, R6, R7, R8, R10 settings).
 * Uses F15's DurationPicker for "How long?".
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Button } from "@/components/button";
import { BellIcon } from "@/components/icons";
import { Header } from "@/components/header";
import { Input } from "@/components/input";
import { FormError, Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import { addDays, formatClock, formatLongDate, todayISO } from "@/lib/format";
import type { RepeatKind } from "@/lib/types";

import { Chip, ChipRow, FieldError, FieldLabel, Stepper } from "./TaskControls";
import { useTasks } from "./TasksContext";
import { DurationPicker } from "./timeDuration";
import {
  emptyTaskForm,
  formFromTask,
  REMINDER_OFFSETS,
  validateTaskForm,
  type TaskForm,
  type TaskFormErrors,
} from "./taskRules";

const REPEATS: { kind: RepeatKind; label: string }[] = [
  { kind: "none", label: "Once" },
  { kind: "daily", label: "Every day" },
  { kind: "weekdays", label: "Weekdays" },
  { kind: "custom", label: "Pick days" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function shiftTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${`${Math.floor(total / 60)}`.padStart(2, "0")}:${`${total % 60}`.padStart(2, "0")}`;
}

export default function TaskFormScreen({ taskId }: { taskId?: string }) {
  const router = useRouter();
  const { user, child, children } = useMine();
  const { tasks, saveTask } = useTasks();
  const existing = taskId ? tasks.find((task) => task.id === taskId) : undefined;
  const isParent = user?.accountType === "parent";
  const [form, setForm] = useState<TaskForm>(() =>
    existing ? formFromTask(existing) : emptyTaskForm(isParent ? child?.id ?? null : null),
  );
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const today = todayISO();

  if (taskId && !existing) {
    return (
      <Screen>
        <Header title="Edit Task" />
        <Text className="font-body text-[15px] text-ink">This task was not found. It may have been deleted.</Text>
      </Screen>
    );
  }

  const set = (patch: Partial<TaskForm>) => setForm((current) => ({ ...current, ...patch }));
  const toggleDay = (day: number) =>
    set({ repeatDays: form.repeatDays.includes(day) ? form.repeatDays.filter((d) => d !== day) : [...form.repeatDays, day] });

  async function save() {
    const found = validateTaskForm(form, user?.accountType ?? null);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveTask(form, existing?.id);
      if (existing) router.back();
      else router.replace(`/tasks/${saved.id}`);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "The task was not saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen footer={<Button label={saving ? "Saving…" : existing ? "Save Changes" : "Create Task"} onPress={() => void save()} disabled={saving} />}>
      <Header title={existing ? "Edit Task" : "Create Task"} />

      <View className="mb-4 rounded-[20px] bg-white p-4">
      <View className="mb-3 rounded-[16px] p-3" style={{ backgroundColor: "#FFF1B8" }}><Text className="font-strong text-[17px] text-ink">What needs to get done?</Text></View>
      <Input label="Task name" value={form.title} onChangeText={(title) => set({ title })} placeholder="e.g. Brush teeth" />
      <FieldError message={errors.title} />
      <View className="h-3" />
      <Input label="Details (optional)" value={form.description} onChangeText={(description) => set({ description })} placeholder="What does done look like?" multiline />
      <FieldError message={errors.description} />
      </View>
      <Text className="font-body text-[13px] text-mist">{isParent ? "Parent account — assign this task to a child below." : "Independent account — tasks are for you. Use a parent account to assign to a child."}</Text>

      {isParent ? (
        <>
          <FieldLabel>ASSIGNMENT</FieldLabel>
          <ChipRow>
            {children.map((profile) => (
              <Chip key={profile.id} label={profile.name} selected={form.childId === profile.id} onPress={() => set({ childId: profile.id })} />
            ))}
          </ChipRow>
          {children.length === 0 ? <Text className="font-body text-[14px] text-mist">Add a child profile first.</Text> : null}
          <FieldError message={errors.childId} />
        </>
      ) : null}

      <View className="mt-4 rounded-[20px] p-4" style={{ backgroundColor: "#DDECF4" }}>
      <Text className="mb-3 font-strong text-[17px] text-ink">When?</Text>
      <FieldLabel>DAY</FieldLabel>
      <ChipRow>
        <Chip label="Today" selected={form.date === today} onPress={() => set({ date: today })} />
        <Chip label="Tomorrow" selected={form.date === addDays(today, 1)} onPress={() => set({ date: addDays(today, 1) })} />
      </ChipRow>
      <View className="mt-2">
        <Stepper
          label="day"
          value={formatLongDate(form.date)}
          onMinus={() => set({ date: addDays(form.date, -1) < today && !existing ? today : addDays(form.date, -1) })}
          onPlus={() => set({ date: addDays(form.date, 1) })}
        />
      </View>
      <FieldError message={errors.date} />

      <FieldLabel>TIME</FieldLabel>
      <Text accessibilityLabel={`Time: ${formatClock(form.time)}`} className="mb-2 text-center font-strong text-[24px] text-ink">
        {formatClock(form.time)}
      </Text>
      <Stepper label="hour" value="Hour" onMinus={() => set({ time: shiftTime(form.time, -60) })} onPlus={() => set({ time: shiftTime(form.time, 60) })} />
      <View className="h-2" />
      <Stepper label="minute" value="Minute" onMinus={() => set({ time: shiftTime(form.time, -1) })} onPlus={() => set({ time: shiftTime(form.time, 1) })} />
      <FieldError message={errors.time} />
      </View>

      <View className="h-4" />
      <DurationPicker value={form.durationMinutes} onChange={(durationMinutes) => set({ durationMinutes })} showError={!!errors.durationMinutes} />
      <FieldError message={errors.durationMinutes} />

      <View className="mt-4 rounded-[20px] p-4" style={{ backgroundColor: "#F8D8CF" }}>
      <Text className="mb-3 font-strong text-[16px] text-ink">Repeat</Text>
      <ChipRow>
        {REPEATS.map((option) => (
          <Chip
            key={option.kind}
            label={option.label}
            selected={form.repeatKind === option.kind || (option.kind === "custom" && form.repeatKind === "weekly")}
            onPress={() => set({ repeatKind: option.kind, repeatDays: option.kind === "custom" && form.repeatDays.length === 0 ? [(new Date(`${form.date}T12:00:00`).getDay() + 6) % 7] : form.repeatDays })}
          />
        ))}
      </ChipRow>
      {form.repeatKind === "custom" || form.repeatKind === "weekly" ? (
        <View className="mt-2">
          <ChipRow>
            {DAYS.map((label, index) => (
              <Chip key={label} label={label} accessibilityLabel={DAY_NAMES[index]} selected={form.repeatDays.includes(index)} onPress={() => toggleDay(index)} />
            ))}
          </ChipRow>
        </View>
      ) : null}
      <FieldError message={errors.repeatDays} />
      </View>

      <FieldLabel>REMINDER</FieldLabel>
      <View className="flex-row items-center justify-between rounded-[20px] px-4 py-3" style={{ backgroundColor: "#DDECF4" }}>
        <View className="flex-row items-center gap-2"><BellIcon /><Text className="font-strong text-[16px] text-ink">{form.reminderEnabled ? "Remind me" : "No reminder"}</Text></View>
        <Switch accessibilityLabel="Reminder" value={form.reminderEnabled} onValueChange={(reminderEnabled) => set({ reminderEnabled })} />
      </View>
      {form.reminderEnabled ? (
        <View className="mt-2">
          <ChipRow>
            {REMINDER_OFFSETS.map((minutes) => (
              <Chip key={minutes} label={minutes === 0 ? "At start time" : `${minutes} min before`} selected={form.reminderOffset === minutes} onPress={() => set({ reminderOffset: minutes })} />
            ))}
          </ChipRow>
        </View>
      ) : null}

      <FieldLabel>POINTS FOR FINISHING</FieldLabel>
      <Stepper label="points" value={`${form.points} points`} onMinus={() => set({ points: Math.max(0, form.points - 1) })} onPlus={() => set({ points: Math.min(1000, form.points + 1) })} />
      <FieldError message={errors.points} />

      <View className="mt-4">
        <FormError message={saveError} />
      </View>
    </Screen>
  );
}