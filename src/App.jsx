import { useEffect, useState } from 'react';
import HabitHeatmap from './HabitHeatmap.jsx';
import PrayerHeatmap from './PrayerHeatmap.jsx';
import Auth from './Auth.jsx';
import { supabase } from './lib/supabaseClient.js';
import { MONTH_NAMES } from './lib/date.js';
import {
  fetchHabits,
  insertHabit,
  deleteHabitRow,
  fetchEntries,
  upsertEntry,
  deleteEntry,
} from './lib/data.js';

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth();

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
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'year'
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(DEFAULT_CATEGORY);

  const isAtLatest =
    viewMode === 'month'
      ? year === CURRENT_YEAR && month === CURRENT_MONTH
      : year === CURRENT_YEAR;

  function goPrev() {
    if (viewMode === 'month') {
      if (month === 0) {
        setYear((y) => y - 1);
        setMonth(11);
      } else {
        setMonth((m) => m - 1);
      }
    } else {
      setYear((y) => y - 1);
    }
  }

  function goNext() {
    if (isAtLatest) return;
    if (viewMode === 'month') {
      if (month === 11) {
        setYear((y) => y + 1);
        setMonth(0);
      } else {
        setMonth((m) => m + 1);
      }
    } else {
      setYear((y) => y + 1);
    }
  }

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, year, month]);

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
      // Salah always gets the per-prayer (Fajr..Isha) layout, regardless of
      // the chosen section, so re-adding it after deletion isn't a plain
      // once-a-day heatmap.
      const isSalah = name.toLowerCase() === 'salah';
      const habit = await insertHabit(
        isSalah
          ? { name, type: 'prayer', category: 'heart' }
          : { name, type: 'single', category: newHabitCategory }
      );
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
          <div className="view-mode-toggle" role="group" aria-label="View granularity">
            <button
              type="button"
              className={viewMode === 'month' ? 'active' : ''}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              type="button"
              className={viewMode === 'year' ? 'active' : ''}
              onClick={() => setViewMode('year')}
            >
              Year
            </button>
          </div>
          <div className="year-picker">
            <button type="button" onClick={goPrev} aria-label={viewMode === 'month' ? 'Previous month' : 'Previous year'}>
              ‹
            </button>
            <span className="year-picker-value">
              {viewMode === 'month' ? `${MONTH_NAMES[month]} ${year}` : year}
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label={viewMode === 'month' ? 'Next month' : 'Next year'}
              disabled={isAtLatest}
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

          <div className={viewMode === 'month' ? 'category-columns' : 'category-rows'}>
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
                            month={month}
                            viewMode={viewMode}
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
          </div>
        </>
      )}
    </div>
  );
}
