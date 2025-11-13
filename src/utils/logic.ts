import { DerivedTask, Task } from '@/types';

// ----------------------------------------
// SAFE ROI CALCULATION (Fix for BUG 5)
// ----------------------------------------
export function computeROI(revenue: number, timeTaken: number): number | null {
  if (!Number.isFinite(revenue) || !Number.isFinite(timeTaken)) return null;
  if (timeTaken <= 0) return null;
  const result = revenue / timeTaken;
  return Number.isFinite(result) && result >= 0 ? result : null;
}

export function computePriorityWeight(priority: Task['priority']): 3 | 2 | 1 {
  switch (priority) {
    case 'High': return 3;
    case 'Medium': return 2;
    default: return 1;
  }
}

// Derived task
export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}

// ----------------------------------------
// FIX FOR BUG 3: Stable deterministic sorting
// ----------------------------------------
export function sortTasks(tasks: ReadonlyArray<DerivedTask>): DerivedTask[] {
  return [...tasks].sort((a, b) => {
    const aROI = a.roi ?? -Infinity;
    const bROI = b.roi ?? -Infinity;
    if (bROI !== aROI) return bROI - aROI;

    if (b.priorityWeight !== a.priorityWeight) {
      return b.priorityWeight - a.priorityWeight;
    }

    // Title alphabetical
    const at = a.title.toLowerCase();
    const bt = b.title.toLowerCase();
    if (at !== bt) return at < bt ? -1 : 1;

    // Created date
    const atime = new Date(a.createdAt).getTime();
    const btime = new Date(b.createdAt).getTime();
    if (atime !== btime) return atime - btime;

    // ID stable fallback
    return a.id.localeCompare(b.id);
  });
}

// ----------------------------------------
// Metrics (safe against NaN/Infinity)
// ----------------------------------------
export function computeTotalRevenue(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((sum, t) => sum + (Number.isFinite(t.revenue) ? t.revenue : 0), 0);
}

export function computeTotalTimeTaken(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((sum, t) => sum + (Number.isFinite(t.timeTaken) ? t.timeTaken : 0), 0);
}

export function computeTimeEfficiency(tasks: ReadonlyArray<Task>): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'Done').length;
  return (done / tasks.length) * 100;
}

export function computeRevenuePerHour(tasks: ReadonlyArray<Task>): number {
  const revenue = computeTotalRevenue(tasks);
  const time = computeTotalTimeTaken(tasks);
  if (time <= 0) return 0;
  const r = revenue / time;
  return Number.isFinite(r) ? r : 0;
}

export function computeAverageROI(tasks: ReadonlyArray<Task>): number {
  const rois = tasks
    .map(t => computeROI(t.revenue, t.timeTaken))
    .filter((v): v is number => typeof v === 'number');

  if (rois.length === 0) return 0;

  const sum = rois.reduce((s, r) => s + r, 0);
  return Number.isFinite(sum / rois.length) ? sum / rois.length : 0;
}

export function computePerformanceGrade(avgROI: number): 'Excellent' | 'Good' | 'Needs Improvement' {
  if (avgROI > 500) return 'Excellent';
  if (avgROI >= 200) return 'Good';
  return 'Needs Improvement';
}

// Remaining analytics unchanged
export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

// ---------------------------
// FUNNEL (Todo / In Progress / Done counts)
// ---------------------------
export function computeFunnel(tasks) {
  return {
    todo: tasks.filter(t => t.status === "Todo").length,
    inProgress: tasks.filter(t => t.status === "In Progress").length,
    done: tasks.filter(t => t.status === "Done").length,
  };
}

// ---------------------------
// WEEKLY THROUGHPUT (completed tasks per week)
// ---------------------------
export function computeThroughputByWeek(tasks) {
  const map = new Map();

  tasks.forEach(t => {
    if (!t.completedAt) return;
    const week = new Date(t.completedAt).toISOString().slice(0, 10); // YYYY-MM-DD

    if (!map.has(week)) map.set(week, { week, count: 0, revenue: 0 });
    const entry = map.get(week);
    entry.count++;
    entry.revenue += t.revenue || 0;
  });

  return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week));
}

// ---------------------------
// WEIGHTED PIPELINE (weighted revenue)
// ---------------------------
export function computeWeightedPipeline(tasks) {
  const weight = {
    High: 0.9,
    Medium: 0.6,
    Low: 0.3,
  };

  return tasks.reduce((sum, t) => {
    return sum + (t.revenue || 0) * (weight[t.priority] || 0.5);
  }, 0);
}

// ---------------------------
// FORECASTING (simple moving projection)
// ---------------------------
export function computeForecast(weekly, weeksAhead = 4) {
  if (!weekly.length) return [];

  const lastRevenue = weekly[weekly.length - 1].revenue || 0;
  const lastWeek = weekly[weekly.length - 1].week;

  const startDate = new Date(lastWeek);

  const result = [];

  for (let i = 1; i <= weeksAhead; i++) {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7 * i);

    result.push({
      week: newDate.toISOString().slice(0, 10),
      revenue: Math.round(lastRevenue * (1 + i * 0.05)), // +5% trend
    });
  }

  return result;
}

// ---------------------------
// VELOCITY BY PRIORITY
// (avg time from createdAt → completedAt)
// ---------------------------
export function computeVelocityByPriority(tasks) {
  const groups = {
    High: [],
    Medium: [],
    Low: [],
  };

  tasks.forEach(t => {
    if (t.completedAt) {
      const days =
        (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);

      groups[t.priority].push(days);
    }
  });

  function avg(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  return {
    High: { avgDays: avg(groups.High) },
    Medium: { avgDays: avg(groups.Medium) },
    Low: { avgDays: avg(groups.Low) },
  };
}


// (Other analytics functions stay unchanged; they don’t affect ROI)
