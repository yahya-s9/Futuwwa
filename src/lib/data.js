import { supabase } from './supabaseClient.js';

export async function fetchHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertHabit({ name, type = 'single', category = 'mind' }) {
  const { data, error } = await supabase
    .from('habits')
    .insert({ name, type, category })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHabitRow(id) {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

// Returns { [habitId]: { [entryKey]: level } }, matching the shape the
// heatmap components expect.
export async function fetchEntries() {
  const { data, error } = await supabase.from('entries').select('habit_id, entry_key, level');
  if (error) throw error;
  const byHabit = {};
  for (const row of data) {
    if (!byHabit[row.habit_id]) byHabit[row.habit_id] = {};
    byHabit[row.habit_id][row.entry_key] = row.level;
  }
  return byHabit;
}

export async function upsertEntry(habitId, entryKey, level) {
  const { error } = await supabase
    .from('entries')
    .upsert(
      { habit_id: habitId, entry_key: entryKey, level, updated_at: new Date().toISOString() },
      { onConflict: 'habit_id,entry_key' }
    );
  if (error) throw error;
}

export async function deleteEntry(habitId, entryKey) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .match({ habit_id: habitId, entry_key: entryKey });
  if (error) throw error;
}
