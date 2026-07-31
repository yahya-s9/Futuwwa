const HABITS_KEY = 'habit-dashboard/habits';
const ENTRIES_KEY = 'habit-dashboard/entries';

// Returns null when nothing has ever been saved (so the caller can seed
// defaults), as opposed to a deliberately-emptied list.
export function loadHabits() {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveHabits(habits) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function loadEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}
