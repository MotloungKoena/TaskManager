import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../services/api';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { user, logout, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setProfileLoading(true);
        try {
            const response = await usersApi.getProfile();
            const data = response.data;
            setFullName(data.fullName || '');
            setEmail(data.email || '');
            setProfilePicture(data.profilePictureUrl || null);

            console.log('Profile loaded:', data);
            console.log('Profile picture URL:', data.profilePictureUrl);
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await usersApi.updateProfile({ fullName, email });

            // Update auth context
            const updatedUser = {
                ...user,
                fullName,
                email,
                profilePictureUrl: profilePicture
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Force refresh the user in context
            // We need to trigger a re-login or refresh the user state
            window.location.reload(); // Simple solution - refresh the page

            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a valid image (JPG, PNG, GIF, WEBP)');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size cannot exceed 5MB');
            return;
        }

        setUploading(true);
        try {
            const response = await usersApi.uploadAvatar(file);
            console.log('Upload response:', response.data);

            const newProfilePicture = response.data.profilePictureUrl;
            setProfilePicture(newProfilePicture);

            // Update auth context
            const updatedUser = {
                ...user,
                profilePictureUrl: newProfilePicture
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success('Profile picture uploaded!');

            // Refresh the profile to show the new picture
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload picture');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteAvatar = async () => {
        if (!confirm('Remove your profile picture?')) return;

        try {
            await usersApi.deleteAvatar();
            setProfilePicture(null);

            // Update auth context
            const updatedUser = { ...user, profilePictureUrl: null };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            toast.success('Profile picture removed');

            // Refresh the page to update the UI
            setTimeout(() => {
                window.location.reload();
            }, 500);

        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to remove profile picture');
        }
    };

    if (profileLoading) {
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
                                    <Link to="/profile" className="text-blue-600 hover:text-blue-800 font-medium">Profile</Link>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Avatar user={user} size="sm" showStatus={true} />
                                    <span className="text-gray-700">Welcome, {user?.fullName || user?.email}</span>
                                </div>
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
                    <div className="text-gray-600">Loading profile...</div>
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
                                <Link to="/profile" className="text-blue-600 hover:text-blue-800 font-medium">Profile</Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Avatar user={user} size="sm" showStatus={true} />
                                <span className="text-gray-700">Welcome, {user?.fullName || user?.email}</span>
                            </div>
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>

                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-200">
                        <Avatar
                            user={{
                                ...user,
                                profilePictureUrl: profilePicture || user?.profilePictureUrl
                            }}
                            size="2xl"
                            showStatus={true}
                            className="mb-4"
                        />

                        <div className="flex space-x-3">
                            <label
                                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer ${uploading ? 'opacity-50' : ''}`}
                            >
                                {uploading ? 'Uploading...' : 'Upload New Picture'}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>

                            {(profilePicture || user?.profilePictureUrl) && (
                                <button
                                    onClick={handleDeleteAvatar}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Max size: 5MB • JPG, PNG, GIF, WEBP</p>

                        {/* Debug info */}
                        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
                            <p>Profile Picture URL: {profilePicture || user?.profilePictureUrl || 'None'}</p>
                            <p>Full URL: {profilePicture || user?.profilePictureUrl ? `https://localhost:7066${profilePicture || user?.profilePictureUrl}` : 'None'}</p>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleUpdateProfile}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your email"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Account Info */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Information</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>User ID: {user?.id}</p>
                            <p>Account Created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;