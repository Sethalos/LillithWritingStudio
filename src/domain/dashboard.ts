export interface DashboardTask {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "completed";
  dueAt?: string;
  linkedNodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyFocus {
  projectId: string;
  documentId?: string;
  title: string;
  note: string;
  wordTarget?: number;
  updatedAt: string;
}
