import { Client } from "../types/Client"

export const mockClients: Client[] = [
  {
    id: 1,
    name: "John Doe",
    company: "Acme Inc.",
    lastCall: "2023-05-15",
    tasks: { completed: 3, incomplete: 2 },
  },
  {
    id: 2,
    name: "Jane Smith",
    company: "Globex Corp",
    lastCall: "2023-05-14",
    tasks: { completed: 5, incomplete: 0 },
  },
  {
    id: 3,
    name: "Bob Johnson",
    company: "Initech",
    lastCall: "2023-05-12",
    tasks: { completed: 2, incomplete: 4 },
  },
  {
    id: 4,
    name: "Alice Williams",
    company: "Umbrella Corp",
    lastCall: "2023-05-10",
    tasks: { completed: 7, incomplete: 1 },
  },
  {
    id: 5,
    name: "Charlie Brown",
    company: "Stark Industries",
    lastCall: "2023-05-08",
    tasks: { completed: 0, incomplete: 3 },
  },
]