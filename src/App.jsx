import { useEffect, useState } from 'react';
import HabitHeatmap from './HabitHeatmap.jsx';
import PrayerHeatmap from './PrayerHeatmap.jsx';
import { loadHabits, saveHabits, loadEntries, saveEntries } from './lib/storage.js';

const CURRENT_YEAR = new Date().getFullYear();

const CATEGORIES = [
  { key: 'mind', label: 'Sharpen the Mind' },
  { key: 'body', label: 'Harden the Body' },
  { key: 'heart', label: 'Soften the Heart' },
];
const DEFAULT_CATEGORY = CATEGORIES[0].key;

const DEFAULT_HABITS = [{ id: 'salah', name: 'Salah', type: 'prayer', category: 'heart' }];

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [habits, setHabits] = useState(() => loadHabits() ?? DEFAULT_HABITS);
  const [entries, setEntries] = useState(() => loadEntries());
  const [year, setYear] = useState(CURRENT_YEAR);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(DEFAULT_CATEGORY);

  useEffect(() => saveHabits(habits), [habits]);
  useEffect(() => saveEntries(entries), [entries]);

  function addHabit(e) {
    e.preventDefault();
    const name = newHabitName.trim();
    if (!name) return;
    setHabits((prev) => [...prev, { id: makeId(), name, type: 'single', category: newHabitCategory }]);
    setNewHabitName('');
  }

  function deleteHabit(id) {
    const habit = habits.find((h) => h.id === id);
    if (habit && !window.confirm(`Delete "${habit.name}" and all its tracked days?`)) return;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setEntries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function toggleCell(habitId, key) {
    setEntries((prev) => {
      const habitEntries = { ...(prev[habitId] ?? {}) };
      const next = ((habitEntries[key] ?? 0) + 1) % 3;
      if (next === 0) delete habitEntries[key];
      else habitEntries[key] = next;
      return { ...prev, [habitId]: habitEntries };
    });
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Habit Heatmaps</h1>
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
        <button type="submit">Add habit</button>
      </form>

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
    </div>
  );
}
