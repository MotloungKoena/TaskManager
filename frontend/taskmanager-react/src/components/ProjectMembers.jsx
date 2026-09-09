import React, { useState, useEffect } from 'react';
import { projectsApi } from '../services/api';
import toast from 'react-hot-toast';

const ProjectMembers = ({ projectId }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadMembers();
    }
  }, [projectId]);

  const loadMembers = async () => {
    try {
      const response = await projectsApi.getMembers(projectId);
      setMembers(response.data);
    } catch (error) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async (searchEmail) => {
    setEmail(searchEmail);
    if (searchEmail.length < 2) {
      setAvailableUsers([]);
      return;
    }

    try {
      setSearching(true);
      const response = await projectsApi.getAvailableUsers(projectId);
      const users = response.data.filter(u => 
        u.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setAvailableUsers(users.slice(0, 5));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    try {
      await projectsApi.addMember(projectId, selectedUser.email, role);
      toast.success(`${selectedUser.fullName} added to project!`);
      setShowModal(false);
      setEmail('');
      setSelectedUser(null);
      setAvailableUsers([]);
      loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId, fullName) => {
    if (!confirm(`Remove ${fullName} from this project?`)) return;
    try {
      await projectsApi.removeMember(projectId, userId);
      toast.success(`${fullName} removed from project`);
      loadMembers();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading members...</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Team Members ({members.length})
        </h4>
        <button
          onClick={() => setShowModal(true)}
          className="px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
        >
          + Add Member
        </button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {member.fullName?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {member.fullName}
                  {member.isCreator && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                      Creator
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{member.email}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">{member.role}</span>
              {!member.isCreator && (
                <button
                  onClick={() => handleRemoveMember(member.userId, member.fullName)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search User
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => handleSearchUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type email or name..."
              />
              
              {searching && (
                <div className="text-sm text-gray-500 mt-1">Searching...</div>
              )}
              
              {availableUsers.length > 0 && (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                        selectedUser?.id === user.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => {
                        setSelectedUser(user);
                        setEmail(user.email);
                        setAvailableUsers([]);
                      }}
                    >
                      <div className="text-sm font-medium">{user.fullName || 'Unnamed'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="mt-2 text-sm text-green-600">
                  Selected: {selectedUser.fullName} ({selectedUser.email})
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEmail('');
                  setSelectedUser(null);
                  setAvailableUsers([]);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedUser}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMembers;