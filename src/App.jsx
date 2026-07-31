import { useEffect, useState } from 'react';
import HabitHeatmap from './HabitHeatmap.jsx';
import PrayerHeatmap from './PrayerHeatmap.jsx';
import Auth from './Auth.jsx';
import { supabase } from './lib/supabaseClient.js';
import {
  fetchHabits,
  insertHabit,
  deleteHabitRow,
  fetchEntries,
  upsertEntry,
  deleteEntry,
} from './lib/data.js';

const CURRENT_YEAR = new Date().getFullYear();

const CATEGORIES = [
  { key: 'mind', label: 'Sharpen the Mind' },
  { key: 'body', label: 'Harden the Body' },
  { key: 'heart', label: 'Soften the Heart' },
];
const DEFAULT_CATEGORY = CATEGORIES[0].key;

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [addingHabit, setAddingHabit] = useState(false);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(DEFAULT_CATEGORY);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoadingData(true);
    (async () => {
      let [habitRows, entryMap] = await Promise.all([fetchHabits(), fetchEntries()]);
      if (habitRows.length === 0) {
        const salah = await insertHabit({ name: 'Salah', type: 'prayer', category: 'heart' });
        habitRows = [salah];
      }
      if (!cancelled) {
        setHabits(habitRows);
        setEntries(entryMap);
        setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function addHabit(e) {
    e.preventDefault();
    const name = newHabitName.trim();
    if (!name || addingHabit) return;
    setAddingHabit(true);
    try {
      const habit = await insertHabit({ name, type: 'single', category: newHabitCategory });
      setHabits((prev) => [...prev, habit]);
      setNewHabitName('');
    } finally {
      setAddingHabit(false);
    }
  }

  async function deleteHabit(id) {
    const habit = habits.find((h) => h.id === id);
    if (habit && !window.confirm(`Delete "${habit.name}" and all its tracked days?`)) return;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setEntries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await deleteHabitRow(id);
  }

  function toggleCell(habitId, key) {
    setEntries((prev) => {
      const habitEntries = { ...(prev[habitId] ?? {}) };
      const next = ((habitEntries[key] ?? 0) + 1) % 3;
      if (next === 0) {
        delete habitEntries[key];
        deleteEntry(habitId, key).catch((err) => console.error(err));
      } else {
        habitEntries[key] = next;
        upsertEntry(habitId, key, next).catch((err) => console.error(err));
      }
      return { ...prev, [habitId]: habitEntries };
    });
  }

  if (session === undefined) {
    return <div className="auth-loading">Loading…</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Futuwwa</h1>
        <div className="header-right">
          <div className="year-picker">
            <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
              ‹
            </button>
            <span className="year-picker-value">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Next year"
              disabled={year >= CURRENT_YEAR}
            >
              ›
            </button>
          </div>
          <div className="header-account">
            <span className="header-email">{session.user.email}</span>
            <button className="sign-out-btn" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <form className="add-habit-form" onSubmit={addHabit}>
        <input
          type="text"
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          placeholder="Add a habit, e.g. Read, Gym, Meditate"
          aria-label="New habit name"
        />
        <select
          value={newHabitCategory}
          onChange={(e) => setNewHabitCategory(e.target.value)}
          aria-label="Habit section"
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={addingHabit}>
          {addingHabit ? 'Adding…' : 'Add habit'}
        </button>
      </form>

      {loadingData ? (
        <p className="empty-state">Loading your habits…</p>
      ) : (
        <>
          {habits.length === 0 && (
            <p className="empty-state">No habits yet — add one above to start tracking.</p>
          )}

          {CATEGORIES.map((category) => {
            const categoryHabits = habits.filter(
              (h) => (h.category ?? DEFAULT_CATEGORY) === category.key
            );
            if (habits.length === 0) return null;
            return (
              <section className={`category-section category-${category.key}`} key={category.key}>
                <h2 className="category-title">{category.label}</h2>
                {categoryHabits.length === 0 ? (
                  <p className="empty-state category-empty">No habits here yet.</p>
                ) : (
                  <div className="habit-list">
                    {categoryHabits.map((habit) => {
                      const HeatmapComponent = habit.type === 'prayer' ? PrayerHeatmap : HabitHeatmap;
                      return (
                        <HeatmapComponent
                          key={habit.id}
                          habit={habit}
                          entries={entries[habit.id] ?? {}}
                          year={year}
                          onToggleCell={toggleCell}
                          onDelete={deleteHabit}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
