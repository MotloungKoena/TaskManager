import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Avatar = ({ 
  user, 
  size = 'md', 
  showStatus = false,
  className = '',
  onClick = null 
}) => {
  const { user: currentUser } = useAuth();
  
  // Debug logging
  console.log('Avatar - user prop:', user);
  console.log('Avatar - profilePictureUrl:', user?.profilePictureUrl);
  
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return parts[0][0] || '?';
  };

  const getSize = () => {
    switch(size) {
      case 'xs': return 'w-6 h-6 text-xs';
      case 'sm': return 'w-8 h-8 text-sm';
      case 'md': return 'w-10 h-10 text-base';
      case 'lg': return 'w-14 h-14 text-xl';
      case 'xl': return 'w-20 h-20 text-2xl';
      case '2xl': return 'w-32 h-32 text-4xl';
      default: return 'w-10 h-10 text-base';
    }
  };

  const getStatusColor = () => {
    if (!showStatus) return '';
    return user?.isOnline ? 'bg-green-500' : 'bg-gray-400';
  };

  const getStatusSize = () => {
    switch(size) {
      case 'xs': return 'w-1.5 h-1.5';
      case 'sm': return 'w-2 h-2';
      case 'md': return 'w-2.5 h-2.5';
      case 'lg': return 'w-3.5 h-3.5';
      case 'xl': return 'w-4 h-4';
      default: return 'w-2.5 h-2.5';
    }
  };

  // Get the API URL from environment
  const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:7066';
  
  // Build the profile picture URL
  const profilePic = user?.profilePictureUrl 
    ? `${apiUrl}${user.profilePictureUrl}`
    : null;
  
  console.log('Avatar - API URL:', apiUrl);
  console.log('Avatar - Final profile pic URL:', profilePic);

  // Check if this is the current user's avatar
  const isCurrentUser = currentUser?.id === user?.id;

  return (
    <div 
      className={`relative inline-block ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {profilePic ? (
        <img
          src={profilePic}
          alt={user?.fullName || 'User'}
          className={`${getSize()} rounded-full object-cover border-2 border-white shadow-md`}
          onError={(e) => {
            console.log('Avatar - Image failed to load:', profilePic);
            e.target.style.display = 'none';
            const parent = e.target.parentElement;
            const fallback = parent.querySelector('.fallback-avatar');
            if (fallback) fallback.classList.remove('hidden');
          }}
          onLoad={() => {
            console.log('Avatar - Image loaded successfully:', profilePic);
          }}
        />
      ) : (
        <div className="fallback-avatar">
          {/* Show fallback immediately if no profilePic */}
        </div>
      )}
      
      <div className={`${profilePic ? 'hidden' : ''} fallback-avatar ${getSize()} rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white shadow-md`}>
        {getInitials(user?.fullName || user?.email)}
      </div>

      {showStatus && (
        <span className={`absolute bottom-0 right-0 ${getStatusSize()} rounded-full border-2 border-white ${getStatusColor()}`} />
      )}
    </div>
  );
};

export default Avatar;