import { useState, useEffect } from 'react';
import { Plus, User, Calendar, Flag } from 'lucide-react';
import type { Task } from '@/shared/types';
import type { MochaUser } from '@getmocha/users-service/shared';

interface TaskBoardProps {
  teamId: number;
  user: MochaUser;
}

const statusColumns = [
  { id: 'todo', title: 'To Do', color: 'border-gray-500' },
  { id: 'in_progress', title: 'In Progress', color: 'border-yellow-500' },
  { id: 'done', title: 'Done', color: 'border-green-500' },
];

const priorityColors = {
  low: 'text-blue-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

export default function TaskBoard({ teamId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [teamId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Task Board</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex space-x-6 min-w-full">
          {statusColumns.map((column) => (
            <div key={column.id} className="flex-1 min-w-80">
              <div className={`border-t-4 ${column.color} bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">{column.title}</h3>
                  <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-full">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {getTasksByStatus(column.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(status) => updateTaskStatus(task.id, status)}
                    />
                  ))}
                  
                  {getTasksByStatus(column.id).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📝</div>
                      <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          teamId={teamId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (status: string) => void }) {
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg p-4 hover:bg-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-white flex-1">{task.title}</h4>
        <Flag className={`w-4 h-4 ml-2 ${priorityColors[task.priority as keyof typeof priorityColors]}`} />
      </div>
      
      {task.description && (
        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          {task.assigned_to && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{task.assigned_to.slice(-6)}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Dropdown */}
      <div className="mt-3">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full bg-slate-700 border border-gray-600 rounded text-white text-xs px-2 py-1"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  );
}

function CreateTaskModal({ teamId, onClose, onSuccess }: { 
  teamId: number; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/teams/${teamId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_date: dueDate || undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create task');
      }
    } catch (error) {
      setError('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Create New Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Enter task description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
