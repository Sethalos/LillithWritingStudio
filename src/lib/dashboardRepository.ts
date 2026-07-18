import { invoke } from "@tauri-apps/api/core";
import type { DailyFocus, DashboardTask } from "../domain/dashboard";

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const taskKey = (projectId: string) => `lillith:dashboard-tasks:v1:${projectId}`;
const focusKey = (projectId: string) => `lillith:daily-focus:v1:${projectId}`;

function localTasks(projectId: string): DashboardTask[] {
  try { return JSON.parse(localStorage.getItem(taskKey(projectId)) ?? "[]"); } catch { return []; }
}

export const loadDashboardTasks = (projectId: string): Promise<DashboardTask[]> =>
  isTauri() ? invoke("list_dashboard_tasks") : Promise.resolve(localTasks(projectId));

export async function saveDashboardTask(task: DashboardTask): Promise<DashboardTask> {
  if (isTauri()) return invoke("save_dashboard_task", { dashboardTask: task });
  const saved = { ...task, updatedAt: new Date().toISOString() };
  localStorage.setItem(taskKey(task.projectId), JSON.stringify([...localTasks(task.projectId).filter((item) => item.id !== task.id), saved]));
  return saved;
}

export const loadDailyFocus = (projectId: string): Promise<DailyFocus | undefined> => {
  if (isTauri()) return invoke<DailyFocus | null>("load_daily_focus").then((value) => value ?? undefined);
  try { return Promise.resolve(JSON.parse(localStorage.getItem(focusKey(projectId)) ?? "null") ?? undefined); } catch { return Promise.resolve(undefined); }
};

export async function saveDailyFocus(focus: DailyFocus): Promise<DailyFocus> {
  if (isTauri()) return invoke("save_daily_focus", { dailyFocus: focus });
  const saved = { ...focus, updatedAt: new Date().toISOString() };
  localStorage.setItem(focusKey(focus.projectId), JSON.stringify(saved));
  return saved;
}
