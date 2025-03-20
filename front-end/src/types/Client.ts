export interface Client {
  id: number;
  name: string;
  company: string;
  lastCall: string;
  tasks: {
    completed: number;
    incomplete: number;
  };
}