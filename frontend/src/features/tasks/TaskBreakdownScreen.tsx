
import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import {
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";

import { Header } from "@/components/header";
import { FormError, Screen } from "@/components/screen";
import type { TaskStep } from "@/lib/types";
import { useTasks } from "./TasksContext";

const MAX_STEP_LENGTH = 60;
const MAX_STEPS = 50;
const BADGE_COLORS = ["#D9EEDB", "#FFE9A6", "#F8DDE3", "#DDECF4"];

function normalizeStepText(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, MAX_STEP_LENGTH);
}

export default function TaskBreakdownScreen({
  taskId,
}: {
  taskId: string;
}) {
  const router = useRouter();
  const { tasks, saveSteps } = useTasks();
  const task = tasks.find((item) => item.id === taskId);

  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task && !initialized) {
      setSteps(task.steps.map((step) => ({ ...step })));
      setInitialized(true);
    }
  }, [task, initialized]);

  function addDraft() {
    const title = normalizeStepText(draft);

    if (!title) {
      setDraft("");
      setAdding(false);
      return;
    }

    if (steps.length >= MAX_STEPS) {
      setError("You can add up to 50 steps.");
      return;
    }

    setSteps((current) => [
      ...current,
      {
        id: Crypto.randomUUID(),
        taskId,
        title,
        position: current.length,
        completed: false,
      },
    ]);

    setDraft("");
    setAdding(false);
    setError(null);
  }

  function updateStep(id: string, title: string) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, title } : step)),
    );
  }

  function toggleStep(index: number) {
    setSteps((current) =>
      current.map((step, i) =>
        i === index ? { ...step, completed: !step.completed } : step,
      ),
    );
  }

  function moveStepUp(index: number) {
    if (index <= 0) return;

    setSteps((current) => {
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((step, position) => ({ ...step, position }));
    });
  }

  function removeStep(id: string) {
    setSteps((current) =>
      current
        .filter((step) => step.id !== id)
        .map((step, position) => ({ ...step, position })),
    );
  }

  async function handleSave() {
    const cleaned = steps
      .map((step) => ({
        ...step,
        title: normalizeStepText(step.title),
      }))
      .filter((step) => step.title.length > 0);

    setSaving(true);
    setError(null);

    try {
      await saveSteps(
        taskId,
        cleaned.map((step, position) => ({ ...step, position })),
      );
      router.back();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Steps could not be saved. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!task) {
    return (
      <Screen>
        <Header title="Break Down Task" />
        <Text className="font-body text-[15px] text-ink">
          This task could not be found. Go back and open it again.
        </Text>
      </Screen>
    );
  }

  const completed = steps.filter((step) => step.completed).length;
  const encouragement =
    steps.length === 1
      ? "One small step makes it easier."
      : steps.length === 0
        ? "Add small steps to make it easier."
        : `${steps.length} small steps make it easier.`;

  return (
    <Screen>
      <Header title="Break Down Task" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View
          className="flex-row items-center gap-4 rounded-[16px] p-4"
          style={{ backgroundColor: "#DDECF4" }}
        >
          <View
            className="h-[60px] w-[60px] items-center justify-center rounded-[12px]"
            style={{ backgroundColor: "#FFD66B" }}
          >
            <Text style={{ fontSize: 29 }}>✎</Text>
          </View>

          <View className="flex-1">
            <Text className="font-strong text-[11px] tracking-wider text-mist">
              TASK
            </Text>
            <Text className="mt-1 font-strong text-[21px] text-ink">
              {task.title}
            </Text>
            <Text className="mt-1 font-body text-[12px] text-ink">
              {encouragement}
            </Text>
          </View>
        </View>

        <View className="mb-3 mt-6 flex-row items-center justify-between">
          <Text className="font-strong text-[14px] text-ink">Steps</Text>
          {steps.length > 0 ? (
            <Text className="font-body text-[12px] text-mist">
              {completed} of {steps.length} complete
            </Text>
          ) : null}
        </View>

        {steps.length > 0 ? (
          <View
            className="rounded-[16px] p-3"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            {steps.map((step, index) => (
              <View
                key={step.id}
                className="mt-2 flex-row items-center rounded-[12px] py-3 pl-2 pr-3"
                style={{
                  marginTop: index === 0 ? 0 : 8,
                  backgroundColor: step.completed ? "#F9FCF8" : "#FBFCFD",
                  borderWidth: step.completed ? 0 : 1,
                  borderColor: "#C4D1D9",
                }}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: step.completed }}
                  accessibilityLabel={step.title}
                  onPress={() => toggleStep(index)}
                  className="flex-1 flex-row items-center"
                >
                  <View
                    className="mr-2 h-[22px] w-[22px] items-center justify-center rounded-full"
                    style={{
                      borderWidth: 2,
                      borderColor: step.completed ? "#6A9A78" : "#243B4A",
                      backgroundColor: step.completed ? "#6A9A78" : "transparent",
                    }}
                  >
                    {step.completed ? (
                      <Text style={{ color: "#FFFFFF", fontSize: 13 }}>✓</Text>
                    ) : null}
                  </View>

                  <View
                    className="mr-3 h-[26px] w-[26px] items-center justify-center rounded-full"
                    style={{
                      backgroundColor: BADGE_COLORS[index % BADGE_COLORS.length],
                    }}
                  >
                    <Text className="font-strong text-[12px] text-ink">
                      {index + 1}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text
                      className="font-strong text-[14px] text-ink"
                      style={{
                        textDecorationLine: step.completed ? "line-through" : "none",
                      }}
                    >
                      {step.title}
                    </Text>
                    <Text className="mt-1 font-body text-[11px] text-mist">
                      {step.completed ? "Completed" : "Not completed"}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${step.title} up`}
                  disabled={index === 0}
                  onPress={() => moveStepUp(index)}
                  hitSlop={8}
                  className="px-2 py-2"
                >
                  <Text style={{ color: index === 0 ? "#D5DADD" : "#7C909B", fontSize: 20 }}>
                    ↑
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${step.title}`}
                  onPress={() => removeStep(step.id)}
                  hitSlop={8}
                  className="px-1 py-2"
                >
                  <Text style={{ color: "#9C3D48", fontSize: 19 }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {adding ? (
          <View
            className="mt-5 h-[53px] flex-row items-center gap-3 rounded-[14px] border-2 px-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#6A9A78" }}
          >
            <View
              className="h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: "#D9EEDB" }}
            >
              <Text style={{ color: "#243B4A" }}>+</Text>
            </View>
            <TextInput
              accessibilityLabel="New step"
              autoFocus
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={addDraft}
              onBlur={() => {
                if (draft.trim()) addDraft();
              }}
              placeholder="e.g. Put books away"
              placeholderTextColor="#8A9AA2"
              maxLength={MAX_STEP_LENGTH}
              returnKeyType="done"
              className="h-full flex-1 font-body text-[14px] text-ink"
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (steps.length >= MAX_STEPS) {
                setError("You can add up to 50 steps.");
                return;
              }
              setError(null);
              setAdding(true);
            }}
            className="mt-5 h-[53px] flex-row items-center gap-3 rounded-[14px] border-2 px-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#6A9A78" }}
          >
            <View
              className="h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: "#D9EEDB" }}
            >
              <Text style={{ color: "#243B4A", fontSize: 17 }}>+</Text>
            </View>
            <Text className="font-strong text-[14px] text-ink">Add Step</Text>
          </Pressable>
        )}

        <View
          className="mt-6 rounded-[14px] px-4 py-4"
          style={{ backgroundColor: "#FFF0B8" }}
        >
          <Text className="mb-2 font-strong text-[13px] text-ink">
            Keep steps short and specific
          </Text>
          <Text className="mb-1 font-body text-[12px] text-ink">
            Clear steps are easier to start and finish.
          </Text>
          <Text className="font-body text-[12px] text-ink">
            Move steps up to change their order.
          </Text>
        </View>

        <FormError message={error} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void handleSave()}
          className="mb-5 mt-5 h-[51px] items-center justify-center rounded-[14px]"
          style={{ backgroundColor: saving ? "#B8C7BE" : "#47745D" }}
        >
          <Text className="font-strong text-[16px] text-white">
            {saving ? "Saving Steps..." : "Save Steps"}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
