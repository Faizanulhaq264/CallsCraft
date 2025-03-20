export interface ClientTask {
  id: number;
  text: string;
  completed: boolean;
}

export interface AnalyticsData {
  time: string;
  value: number;
}

export interface ClientAnalytics {
  attention: AnalyticsData[];
  mood: AnalyticsData[];
  valueInternalization: AnalyticsData[];
  cognitiveResonance: AnalyticsData[];
}

export interface ClientDetails {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  lastCall: {
    date: string;
    duration: string;
    notes: string;
  };
  tasks: ClientTask[];
  analytics: ClientAnalytics;
}