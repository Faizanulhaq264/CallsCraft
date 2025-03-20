import { Check } from "lucide-react"
import Card from "../Card"
import Button from "../Button"
import { ClientTask } from "../../types/ClientDetails"

interface TasksListProps {
  tasks: ClientTask[];
  onToggleTask: (taskId: number) => void;
}

const TasksList = ({ tasks, onToggleTask }: TasksListProps) => {
  return (
    <Card className="mb-8 p-6">
      <h3 className="text-xl font-bold mb-4">Tasks</h3>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`
              flex items-center gap-3 p-3 rounded-md transition-all duration-200
              ${task.completed ? "bg-purple-900/20 border border-purple-800/30" : "bg-gray-900/50 border border-gray-800 hover:border-gray-700"}
            `}
          >
            <button
              onClick={() => onToggleTask(task.id)}
              className={`
                flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${task.completed ? "border-purple-500 bg-purple-500/20" : "border-gray-600 hover:border-gray-500"}
              `}
            >
              {task.completed && <Check className="h-4 w-4 text-purple-500" />}
            </button>
            <span className={`${task.completed ? "text-gray-400 line-through" : "text-white"}`}>{task.text}</span>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No tasks found for this client</p>
          <Button className="mt-4">Add First Task</Button>
        </div>
      )}
    </Card>
  )
}

export default TasksList