import { useState, useEffect } from 'react';
import { Plus, Calendar, User, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TASK_STATUSES = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' }
];

const PRIORITY_COLORS = {
  low: 'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  high: 'text-red-400 bg-red-400/10'
};

export default function TaskBoard({ teamId, user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: ''
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
    
    // Listen for real-time task updates
    if (socket) {
      socket.on('task-update-received', handleTaskUpdate);
      
      return () => {
        socket.off('task-update-received', handleTaskUpdate);
      };
    }
    
    // Fallback polling
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [teamId, socket]);

  const fetchTasks = async () => {
    try {
      const response = await api.get(`/tasks/${teamId}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get(`/teams/${teamId}/members`);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleTaskUpdate = (data) => {
    if (data.teamId === parseInt(teamId)) {
      setTasks(prev => prev.map(task => 
        task.id === data.task.id ? data.task : task
      ));
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const response = await api.post(`/tasks/${teamId}`, newTask);
      setTasks(prev => [response.data, ...prev]);
      setNewTask({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
      setShowCreateForm(false);
      toast.success('Task created successfully');

      // Emit socket event
      if (socket) {
        socket.emit('task-updated', {
          teamId: parseInt(teamId),
          task: response.data
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await api.put(`/tasks/${teamId}/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(task => 
        task.id === taskId ? response.data : task
      ));

      // Emit socket event
      if (socket) {
        socket.emit('task-updated', {
          teamId: parseInt(teamId),
          task: response.data
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/tasks/${teamId}/${taskId}`);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffInDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) {
      return { text: `${Math.abs(diffInDays)} days overdue`, color: 'text-red-400' };
    } else if (diffInDays === 0) {
      return { text: 'Due today', color: 'text-yellow-400' };
    } else if (diffInDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-400' };
    } else {
      return { text: `Due in ${diffInDays} days`, color: 'text-gray-400' };
    }
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
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white">Task Board</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Task Board */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          {TASK_STATUSES.map((status) => (
            <div key={status.id} className="flex flex-col">
              {/* Column Header */}
              <div className="flex items-center space-x-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                <h3 className="font-semibold text-white">{status.title}</h3>
                <span className="text-gray-400 text-sm">
                  ({getTasksByStatus(status.id).length})
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {getTasksByStatus(status.id).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    teamMembers={teamMembers}
                    onStatusChange={handleUpdateTaskStatus}
                    onDelete={handleDeleteTask}
                    currentUser={user}
                  />
                ))}
                
                {getTasksByStatus(status.id).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-2 opacity-50">
                      {status.id === 'todo' && <Clock className="w-full h-full" />}
                      {status.id === 'in_progress' && <AlertCircle className="w-full h-full" />}
                      {status.id === 'done' && <CheckCircle className="w-full h-full" />}
                    </div>
                    <p className="text-sm">No {status.title.toLowerCase()} tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Task</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full input-field"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full input-field h-24 resize-none"
                  placeholder="Enter task description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Assign to
                </label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full input-field"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full input-field"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full input-field"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, teamMembers, onStatusChange, onDelete, currentUser }) {
  const assignedMember = teamMembers.find(member => member.id === task.assigned_to);
  const dueDateInfo = formatDueDate(task.due_date);
  const canDelete = task.created_by === currentUser.id;

  const handleStatusChange = (e) => {
    onStatusChange(task.id, e.target.value);
  };

  return (
    <div className="card task-card group">
      {/* Priority Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority.toUpperCase()}
        </span>
        {canDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Task Title */}
      <h4 className="font-semibold text-white mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Task Description */}
      {task.description && (
        <p className="text-gray-300 text-sm mb-3 line-clamp-3">
          {task.description}
        </p>
      )}

      {/* Due Date */}
      {dueDateInfo && (
        <div className={`flex items-center space-x-1 text-xs mb-3 ${dueDateInfo.color}`}>
          <Calendar className="w-3 h-3" />
          <span>{dueDateInfo.text}</span>
        </div>
      )}

      {/* Assigned User */}
      {assignedMember && (
        <div className="flex items-center space-x-2 mb-3">
          {assignedMember.picture ? (
            <img 
              src={assignedMember.picture} 
              alt={assignedMember.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="text-sm text-gray-300">{assignedMember.name}</span>
        </div>
      )}

      {/* Status Selector */}
      <select
        value={task.status}
        onChange={handleStatusChange}
        className="w-full text-xs bg-slate-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      {/* Created by */}
      <div className="mt-2 text-xs text-gray-500">
        Created {new Date(task.created_at).toLocaleDateString()}
      </div>
    </div>
  );

  function formatDueDate(dueDate) {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffInDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) {
      return { text: `${Math.abs(diffInDays)} days overdue`, color: 'text-red-400' };
    } else if (diffInDays === 0) {
      return { text: 'Due today', color: 'text-yellow-400' };
    } else if (diffInDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-400' };
    } else {
      return { text: `Due in ${diffInDays} days`, color: 'text-gray-400' };
    }
  }
}
