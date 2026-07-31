import { useMemo } from 'react';
import { getYearGrid, getMonthLabels, dateKey, isToday, computeStreak } from './lib/date.js';

const LEVEL_LABELS = ['Not done', 'Done', 'Done (extra)'];

export default function HabitHeatmap({ habit, entries, year, onToggleCell, onDelete }) {
  const weeks = useMemo(() => getYearGrid(year), [year]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  const total = useMemo(
    () => Object.values(entries).filter((v) => v > 0).length,
    [entries]
  );

  const streak = useMemo(
    () => computeStreak((date) => (entries[dateKey(date)] ?? 0) > 0),
    [entries]
  );

  return (
    <section className="habit-card">
      <div className="habit-card-header">
        <h2 className="habit-name">{habit.name}</h2>
        <span className="habit-total">
          {total} day{total === 1 ? '' : 's'} in {year}
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
          <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell-col))` }}>
            {weeks.map((_, i) => (
              <span key={i} className="heatmap-month-label">
                {monthLabels[i] ?? ''}
              </span>
            ))}
          </div>
          <div className="heatmap-body">
            <div className="heatmap-daylabels">
              <span />
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
            </div>
            <div className="heatmap-weeks">
              {weeks.map((week, wi) => (
                <div className="heatmap-week" key={wi}>
                  {week.map((date, di) => {
                    if (!date) return <div className="cell cell-empty-slot" key={di} />;
                    const key = dateKey(date);
                    const level = entries[key] ?? 0;
                    const today = isToday(date);
                    return (
                      <button
                        key={di}
                        type="button"
                        className={`cell cell-level-${level}${today ? ' cell-today' : ''}`}
                        onClick={() => onToggleCell(habit.id, key)}
                        title={`${date.toDateString()} — ${LEVEL_LABELS[level]}`}
                        aria-label={`${date.toDateString()}, ${LEVEL_LABELS[level]}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
