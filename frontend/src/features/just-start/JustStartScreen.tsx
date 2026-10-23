/**
 * F7 Just Start Mode (R12): a 5-minute countdown that starts right away, a tiny first step,
 * and friendly messages, with no pressure to finish the whole task.
 */
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/button";
import { Header } from "@/components/header";
import { FormError, Screen } from "@/components/screen";

import { useTasks } from "../tasks/TasksContext";
import { completionKey, occursOn } from "../tasks/taskRules";
import { CircularTimer, getTaskTimer, TimerStatus, useTimerTicks } from "../timer/countdownTimer";
import { encouragement, getJustStartTimer, JUST_START_MINUTES, tinyFirstStep } from "./justStart";

export default function JustStartScreen({ taskId, childView = false }: { taskId: string; childView?: boolean }) {
  const router = useRouter();
  const { tasks, done, today, setDone } = useTasks();
  const [error, setError] = useState<string | null>(null);
  const task = tasks.find((item) => item.id === taskId);
  const timer = getJustStartTimer(taskId);
  useTimerTicks(timer);

  // The timer starts as soon as the screen opens (TC-304). Coming back to a running or
  // paused session keeps it; a finished one starts fresh.
  useEffect(() => {
    if (timer.status === TimerStatus.IDLE || timer.status === TimerStatus.FINISHED) timer.restart();
  }, [timer]);

  if (!task) {
    return (
      <Screen>
        <Header title="Just Start" />
        <Text className="font-body text-[15px] text-ink">This task was not found. It may have been deleted.</Text>
      </Screen>
    );
  }

  const finished = timer.status === TimerStatus.FINISHED;
  const running = timer.status === TimerStatus.RUNNING;
  const canComplete = occursOn(task, today) && !done.has(completionKey(task.id, today));
  const taskPath = childView ? `/tasks/${task.id}?childView=1` : `/tasks/${task.id}`;

  function stopForNow() {
    timer.reset();
    router.back();
  }

  function keepGoing() {
    const full = getTaskTimer(task!);
    if (full.status !== TimerStatus.RUNNING) full.start();
    timer.reset();
    router.replace(taskPath);
  }

  async function markComplete() {
    try {
      setError(null);
      await setDone(task!.id, today, true);
      timer.reset();
      router.replace({ pathname: "/tasks/complete", params: { id: task!.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change was not saved. Try again.");
    }
  }

  return (
    <Screen>
      <Header title="Just Start" />

      <Text className="text-center font-strong text-[22px] text-ink">{task.title}</Text>
      <Text className="mt-1 text-center font-body text-[15px] text-mist">
        {JUST_START_MINUTES} minutes only. You don't have to finish.
      </Text>

      <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: "#FFF1B8" }}>
        <Text className="font-strong text-[12px] uppercase text-mist">Tiny first step</Text>
        <Text className="mt-1 font-strong text-[17px] text-ink">{tinyFirstStep(task)}</Text>
      </View>

      <View className="mt-6">
        <CircularTimer timer={timer} size={200} />
      </View>

      <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: finished ? "#E3F0DD" : "#DDECF4" }}>
        <Text accessibilityLiveRegion="polite" className="text-center font-strong text-[16px] text-ink">
          {encouragement(timer.status, timer.progress)}
        </Text>
      </View>

      <View className="mt-6 gap-3">
        {finished ? (
          <>
            <Button label="Keep going" onPress={keepGoing} />
            {canComplete ? <Button label="Mark Complete" variant="secondary" onPress={() => void markComplete()} /> : null}
            <Button label="Take a break" variant="quiet" onPress={stopForNow} />
          </>
        ) : (
          <>
            <Button label={running ? "Pause" : "Resume"} onPress={() => timer.toggle()} />
            <Button label="Stop for now" variant="quiet" onPress={stopForNow} />
          </>
        )}
        <FormError message={error} />
      </View>
    </Screen>
  );
}
