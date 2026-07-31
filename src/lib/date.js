export const DAY_MS = 24 * 60 * 60 * 1000;
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isToday(date, today = new Date()) {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// Builds a GitHub-style grid: an array of week columns, each with 7 entries
// (Sun..Sat). Cells outside [Jan 1, Dec 31] of `year` are null.
export function getYearGrid(year) {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const gridStart = new Date(jan1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(dec31);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const inYear = cursor.getFullYear() === year;
      week.push(inYear ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Returns { weekIndex -> month short name } for weeks where a new month begins.
export function getMonthLabels(weeks) {
  const labels = {};
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return;
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      labels[i] = MONTH_NAMES[month];
      lastMonth = month;
    }
  });
  return labels;
}

// Every calendar day in `year`, Jan 1 through Dec 31, in order.
export function getYearDays(year) {
  const days = [];
  const cursor = new Date(year, 0, 1);
  while (cursor.getFullYear() === year) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Builds the same week-column grid as getYearGrid, but scoped to one month.
// Cells outside the month (padding at the start/end of its first/last week)
// are null.
export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(last);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const inMonth = cursor.getMonth() === month && cursor.getFullYear() === year;
      week.push(inMonth ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Every calendar day in one month, in order.
export function getMonthDays(year, month) {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

// Returns { dayIndex -> month short name } for days that start a new month.
export function getDayMonthLabels(days) {
  const labels = {};
  let lastMonth = -1;
  days.forEach((date, i) => {
    const month = date.getMonth();
    if (month !== lastMonth) {
      labels[i] = MONTH_NAMES[month];
      lastMonth = month;
    }
  });
  return labels;
}

// Counts consecutive completed days walking back from today, per `isDone(date)`.
// If today isn't done yet, today doesn't break a streak still in progress —
// the count starts from yesterday instead.
export function computeStreak(isDone) {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!isDone(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let count = 0;
  while (isDone(cursor)) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
