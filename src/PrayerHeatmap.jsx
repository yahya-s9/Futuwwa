import { useMemo } from 'react';
import { getYearDays, getMonthDays, getDayMonthLabels, dateKey, isToday, computeStreak } from './lib/date.js';

const PRAYER_NAMES = ['Fajr', 'Duhr', 'Asr', 'Maghrib', 'Isha'];
const LEVEL_LABELS = ['Not prayed', 'Prayed', 'Prayed (made up)'];

function entryKey(key, prayerIndex) {
  return `${key}_${prayerIndex}`;
}

export default function PrayerHeatmap({ habit, entries, year, month, viewMode, onToggleCell, onDelete }) {
  const days = useMemo(
    () => (viewMode === 'month' ? getMonthDays(year, month) : getYearDays(year)),
    [viewMode, year, month]
  );
  const monthLabels = useMemo(() => getDayMonthLabels(days), [days]);

  const total = useMemo(
    () => Object.values(entries).filter((v) => v > 0).length,
    [entries]
  );

  // A day counts toward the streak only once every prayer is logged.
  const streak = useMemo(
    () =>
      computeStreak((date) => {
        const key = dateKey(date);
        return PRAYER_NAMES.every((_, pi) => (entries[entryKey(key, pi)] ?? 0) > 0);
      }),
    [entries]
  );

  return (
    <section className="habit-card">
      <div className="habit-card-header">
        <h2 className="habit-name">{habit.name}</h2>
        <span className="habit-total">
          {total} prayer{total === 1 ? '' : 's'} logged total
          <span className="habit-streak">streak: {streak}</span>
        </span>
        <button
          className="habit-delete"
          onClick={() => onDelete(habit.id)}
          aria-label={`Delete ${habit.name}`}
          title="Delete habit"
        >
          ×
        </button>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap">
          {viewMode === 'year' && (
            <div
              className="heatmap-months"
              style={{ gridTemplateColumns: `repeat(${days.length}, var(--cell-col))`, paddingLeft: 'var(--prayer-label-width)' }}
            >
              {days.map((_, i) => (
                <span key={i} className="heatmap-month-label">
                  {monthLabels[i] ?? ''}
                </span>
              ))}
            </div>
          )}
          <div className="heatmap-body">
            <div className="heatmap-daylabels prayer-labels">
              {PRAYER_NAMES.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <div className="heatmap-weeks">
              {days.map((date, di) => {
                const key = dateKey(date);
                const today = isToday(date);
                return (
                  <div className="heatmap-week" key={di}>
                    {PRAYER_NAMES.map((name, pi) => {
                      const level = entries[entryKey(key, pi)] ?? 0;
                      return (
                        <button
                          key={pi}
                          type="button"
                          className={`cell cell-level-${level}${today ? ' cell-today' : ''}`}
                          onClick={() => onToggleCell(habit.id, entryKey(key, pi))}
                          title={`${date.toDateString()} — ${name}: ${LEVEL_LABELS[level]}`}
                          aria-label={`${date.toDateString()}, ${name}, ${LEVEL_LABELS[level]}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
