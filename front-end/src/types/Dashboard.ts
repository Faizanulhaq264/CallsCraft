export interface RecentCall {
  id: number;
  clientName: string;
  date: string;
  duration: string;
  tasks: {
    completed: number;
    incomplete: number;
  };
}

export interface DashboardData {
  totalCalls: number;
  callsThisMonth: number;
  averageDuration: string;
  tasks: {
    completed: number;
    incomplete: number;
  };
  recentCall: RecentCall | null;
}