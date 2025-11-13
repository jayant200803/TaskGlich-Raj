// src/hooks/useTasks.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Task, DerivedTask, Metrics, TaskInput } from "@/types";
import {
  withDerived,
  sortTasks,
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
} from "@/utils/logic";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(Date.now());

  // Load tasks.json
  useEffect(() => {
    fetch("/tasks.json")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load tasks.json");
        return res.json();
      })
      .then((data: Task[]) => {
        setTasks(data);
        setFetchedAt(Date.now());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Derived + Sorted tasks
  const derivedSorted = useMemo<DerivedTask[]>(() => {
    const derived = tasks.map((t) => withDerived(t));
    return sortTasks(derived);
  }, [tasks]);

  // Metrics
  const metrics: Metrics = useMemo(() => {
    return {
      totalRevenue: computeTotalRevenue(tasks),
      totalTimeTaken: tasks.reduce((sum, t) => sum + t.timeTaken, 0),
      timeEfficiencyPct: computeTimeEfficiency(tasks),
      revenuePerHour: computeRevenuePerHour(tasks),
      averageROI: computeAverageROI(tasks),
      performanceGrade: computePerformanceGrade(computeAverageROI(tasks)),
    };
  }, [tasks]);

  // Add Task
  const addTask = (payload: TaskInput) => {
    const nowIso = new Date().toISOString();
    const newTask: Task = {
      id: crypto.randomUUID(),
      createdAt: nowIso, // ISO string to match types.Task
      completedAt: payload.status === "Done" ? nowIso : undefined, // optional string
      ...payload,
    };
    setTasks((prev) => [...prev, newTask]);
  };

  // Update Task
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated: Task = { ...t, ...patch };

        // auto-set completedAt if changed to Done and wasn't set
        if (patch.status === "Done" && !t.completedAt) {
          updated.completedAt = new Date().toISOString();
        }

        // if status changed away from Done, clear completedAt
        if (patch.status && patch.status !== "Done") {
          updated.completedAt = undefined;
        }

        return updated;
      })
    );
  }, []);

  // Delete Task
  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const found = prev.find((t) => t.id === id) || null;
      setLastDeleted(found);
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  // Undo Delete
  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks((prev) => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  const clearLastDeleted = useCallback(() => {
    setLastDeleted(null);
  }, []);

  // Return final API
  return {
    tasks,
    loading,
    error,
    derivedSorted,
    metrics,
    lastDeleted,
    fetchedAt,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
    clearLastDeleted,
  } as const;
}
