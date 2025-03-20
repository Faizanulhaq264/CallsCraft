import { DashboardData } from "../types/Dashboard"

export const mockDashboardData: DashboardData = {
  totalCalls: 24,
  callsThisMonth: 8,
  averageDuration: "32 min",
  tasks: {
    completed: 18,
    incomplete: 7,
  },
  recentCall: {
    id: 1,
    clientName: "John Doe",
    date: "2023-05-15",
    duration: "45 min",
    tasks: {
      completed: 3,
      incomplete: 2,
    },
  },
}