import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [recentProjects, setRecentProjects] = useState([]);
  const [taskStatusBreakdown, setTaskStatusBreakdown] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getSummary();
      const data = response.data;
      
      setProjectCount(data.projectCount || 0);
      setTaskCount(data.taskCount || 0);
      setMemberCount(data.memberCount || 0);
      setRecentProjects(data.recentProjects || []);
      setTaskStatusBreakdown(data.taskStatusBreakdown || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-semibold text-gray-900">TaskManager</h1>
                <div className="flex space-x-4">
                  <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</Link>
                  <Link to="/projects" className="text-gray-700 hover:text-gray-900">Projects</Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user?.fullName || user?.email}</span>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">TaskManager</h1>
              <div className="flex space-x-4">
                <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</Link>
                <Link to="/projects" className="text-gray-700 hover:text-gray-900">Projects</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.fullName || user?.email}</span>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-2 text-gray-600">Welcome to your TaskManager dashboard! 🎉</p>
          
          {/* Summary Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">Projects</h3>
              <p className="text-3xl font-bold text-blue-600">{projectCount}</p>
              <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-800 inline-block mt-1">
                View all →
              </Link>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900">Tasks</h3>
              <p className="text-3xl font-bold text-green-600">{taskCount}</p>
              <span className="text-sm text-green-600">Across all projects</span>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900">Team Members</h3>
              <p className="text-3xl font-bold text-purple-600">{memberCount}</p>
              <span className="text-sm text-purple-600">Active members</span>
            </div>
          </div>

          {/* Task Status Breakdown*/}
          {taskStatusBreakdown.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Task Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {taskStatusBreakdown.map((item) => (
                  <div key={item.status} className="bg-gray-50 rounded-lg p-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'Done' ? 'bg-green-100 text-green-800' :
                      item.status === 'InProgress' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'Review' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-2xl font-bold text-gray-700 mt-1">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* recent Projects Section */}
          {recentProjects.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Projects</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow transition">
                    <h4 className="font-medium text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>{project.taskCount || 0} tasks</span>
                      <span>{project.memberCount || 1} members</span>
                    </div>
                    <Link 
                      to="/projects" 
                      className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                    >
                      View details →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;