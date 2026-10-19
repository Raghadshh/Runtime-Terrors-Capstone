import { requireSupabase, supabase } from '../accounts/supabase';
import type { CompletionRow, RoutineDraft, RoutineRow, StepRow } from './routineRules';

export async function fetchRoutineData(iso: string): Promise<{
  routines: RoutineRow[]; steps: StepRow[]; completions: CompletionRow[];
}> {
  const client = requireSupabase();
  const [routines, steps, completions] = await Promise.all([
    client.from('routines').select('id,user_id,child_id,name,subtitle,days,time').order('created_at'),
    client.from('routine_steps').select('id,routine_id,title,minutes,position').order('position'),
    client.from('routine_step_completions').select('step_id,occurrence_date').eq('occurrence_date', iso),
  ]);
  for (const result of [routines, steps, completions]) if (result.error) throw new Error(result.error.message);
  return { routines: (routines.data ?? []) as RoutineRow[], steps: (steps.data ?? []) as StepRow[],
    completions: (completions.data ?? []) as CompletionRow[] };
}

export async function saveRoutineRow(draft: RoutineDraft, id?: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('save_routine', {
    p_id: id ?? null, p_name: draft.name.trim(), p_subtitle: draft.subtitle.trim(),
    p_days: [...draft.days].sort(), p_time: draft.time, p_child_id: draft.childId,
    p_steps: draft.steps.map(step => ({ ...step, title: step.title.trim() })),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteRoutineRow(id: string): Promise<void> {
  const { data, error } = await requireSupabase().from('routines').delete().eq('id', id).select('id').single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Routine not found.');
}

export async function saveStepCompletion(stepId: string, iso: string, complete: boolean): Promise<void> {
  const query = requireSupabase().from('routine_step_completions');
  const { error } = complete
    ? await query.upsert({ step_id: stepId, occurrence_date: iso }, { onConflict: 'step_id,occurrence_date', ignoreDuplicates: true })
    : await query.delete().eq('step_id', stepId).eq('occurrence_date', iso);
  if (error) throw new Error(error.message);
}

export function subscribeToRoutines(userId: string, reload: () => void): () => void {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client.channel('routines-' + userId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routines', filter: 'user_id=eq.' + userId }, reload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_steps' }, reload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_step_completions' }, reload).subscribe();
  return () => { void client.removeChannel(channel); };
}
