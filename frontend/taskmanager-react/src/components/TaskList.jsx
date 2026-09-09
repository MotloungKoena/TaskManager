import React, { useState, useEffect } from 'react';
import { tasksApi } from '../services/api';
import toast from 'react-hot-toast';

const TaskList = ({ projectId, onTaskChange }) => {  // ← Add onTaskChange prop
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Todo');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (projectId) {
      loadTasks();
    }
  }, [projectId]);

  const loadTasks = async () => {
    try {
      const response = await tasksApi.getByProject(projectId);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await tasksApi.create({
        projectId,
        title,
        description,
        priority,
        status,
        dueDate: dueDate || null
      });
      toast.success('Task created!');
      setShowModal(false);
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('Todo');
      setDueDate('');
      await loadTasks();
      // Notify parent component to refresh project count
      if (onTaskChange) onTaskChange();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(id);
      toast.success('Task deleted');
      await loadTasks();
      // Notify parent component to refresh project count
      if (onTaskChange) onTaskChange();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await tasksApi.updateStatus(id, newStatus);
      toast.success('Status updated');
      await loadTasks();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-green-100 text-green-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-orange-100 text-orange-800',
      Urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.Medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      Todo: 'bg-gray-100 text-gray-800',
      InProgress: 'bg-blue-100 text-blue-800',
      Review: 'bg-purple-100 text-purple-800',
      Done: 'bg-green-100 text-green-800'
    };
    return colors[status] || colors.Todo;
  };

  if (loading) {
    return <div className="text-gray-600">Loading tasks...</div>;
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Tasks ({tasks.length})</h4>
        <button
          onClick={() => setShowModal(true)}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
        >
          + Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-xs">No tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="bg-gray-50 border rounded-lg p-3 hover:shadow transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{task.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    {task.dueDate && (
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                    {task.assignedTo && (
                      <span>Assigned to: {task.assignedTo.fullName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="text-xs border rounded px-1 py-0.5"
                  >
                    <option value="Todo">Todo</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Todo">Todo</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;