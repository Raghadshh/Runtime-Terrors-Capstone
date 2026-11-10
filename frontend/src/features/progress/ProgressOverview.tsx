/**
 * F5 progress dashboard cards (R19, R20), shared by the parent's Child Progress screen
 * and the independent user's My Progress screen.
 */
import { Text, View } from "react-native";

import { Card } from "@/components/card";
import { ProgressBar } from "@/components/progress";
import { formatLongDate } from "@/lib/format";

import { consistencyMessage } from "./progressRules";
import { useProgress } from "./useProgress";

export function ProgressOverview({ ownerId }: { ownerId: string | null }) {
  const { summary, loading, error } = useProgress(ownerId);
  const { week } = summary;
  const taskPercent = week.tasksScheduled === 0 ? 0 : Math.round((week.tasksDone / week.tasksScheduled) * 100);
  const tallest = Math.max(1, ...summary.weekBars.map((bar) => bar.count));

  return (
    <View>
      {loading ? <Text className="mb-2 font-body text-[12px] text-mist">Loading progress...</Text> : null}
      {error ? <Text className="mb-2 font-body text-[12px] text-[#9C3D48]">{error}</Text> : null}

      {/* R19: consistency over time instead of a streak that resets. */}
      <Card className="mb-4">
        <Text className="font-strong text-[11px] text-mist">CONSISTENCY - LAST 4 WEEKS</Text>
        <Text className="my-1 font-strong text-[26px] text-ink">{summary.consistencyPercent}%</Text>
        <ProgressBar percent={summary.consistencyPercent} />
        <Text className="mt-2 font-body text-[12px] text-ink">
          Active on {summary.activeDays} of {summary.windowDays} days
        </Text>
        <Text className="mt-1 font-strong text-[13px] text-sprout">{consistencyMessage(summary)}</Text>
        <Text className="mt-1 font-body text-[11px] text-mist">A missed day never resets your progress.</Text>
      </Card>

      <Text className="mb-2 font-strong text-[14px] text-ink">This week</Text>
      <View className="mb-4 flex-row gap-3">
        <Card className="flex-1">
          <Text className="font-strong text-[11px] text-mist">TASKS COMPLETE</Text>
          <Text className="my-1 font-strong text-[22px] text-ink">
            {week.tasksDone} / {week.tasksScheduled}
          </Text>
          <Text className="font-body text-[11px] text-sprout">{taskPercent}% completed</Text>
        </Card>
        <Card className="flex-1">
          <Text className="font-strong text-[11px] text-mist">ROUTINES</Text>
          <Text className="my-1 font-strong text-[22px] text-ink">
            {week.routinesDone} / {week.routinesScheduled}
          </Text>
          <Text className="font-body text-[11px] text-mist">finished this week</Text>
        </Card>
      </View>

      <Card className="mb-4">
        <Text className="font-strong text-[13px] text-ink">All-time progress</Text>
        <Text className="mt-1 font-body text-[13px] text-ink">
          {summary.totalTasksDone} tasks and {summary.totalRoutinesDone} routines completed
        </Text>
        <Text className="mt-1 font-body text-[11px] text-mist">This total only goes up.</Text>
      </Card>

      <Card className="mb-4">
        <Text className="mb-4 font-strong text-[13px] text-ink">Weekly activity</Text>
        <View className="flex-row items-end justify-between px-2 pt-4" style={{ height: 120 }}>
          {summary.weekBars.map((bar) => (
            <View key={bar.date} className="items-center" accessibilityLabel={`${bar.label}: ${bar.count} completed`}>
              <Text className="mb-1 font-body text-[10px] text-mist">{bar.count}</Text>
              <View
                className="w-7 rounded-t-[6px]"
                style={{ height: Math.max(6, Math.round((bar.count / tallest) * 80)), backgroundColor: "#6A9A78" }}
              />
              <Text className="mt-2 font-strong text-[11px] text-mist">{bar.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card className="mb-4">
        <Text className="mb-2 font-strong text-[13px] text-ink">Recently completed</Text>
        {summary.recent.length === 0 ? (
          <Text className="font-body text-[12px] text-mist">Nothing completed yet.</Text>
        ) : (
          summary.recent.map((item, index) => (
            <View key={`${item.kind}-${item.title}-${item.date}-${index}`} className="flex-row justify-between py-1">
              <Text className="flex-1 font-body text-[13px] text-ink">
                {item.kind === "routine" ? "Routine: " : ""}
                {item.title}
              </Text>
              <Text className="font-body text-[11px] text-mist">{formatLongDate(item.date)}</Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
