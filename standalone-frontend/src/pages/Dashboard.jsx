import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, Code, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      const response = await api.post('/teams', { name: newTeamName.trim() });
      setTeams(prev => [response.data, ...prev]);
      setNewTeamName('');
      setShowCreateTeam(false);
      toast.success('Team created successfully!');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      const response = await api.post('/teams/join', { invite_code: inviteCode.trim().toUpperCase() });
      setTeams(prev => [response.data, ...prev]);
      setInviteCode('');
      setShowJoinTeam(false);
      toast.success('Joined team successfully!');
    } catch (error) {
      console.error('Error joining team:', error);
      toast.error(error.response?.data?.error || 'Failed to join team');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">TeamForge</h1>
                <p className="text-sm text-gray-400">Welcome back, {user?.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.picture && (
                  <img 
                    src={user.picture} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-white font-medium">{user?.name}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors p-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Your Teams</h2>
          <p className="text-gray-300">Manage your teams and start collaborating</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowCreateTeam(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Team</span>
          </button>
          
          <button
            onClick={() => setShowJoinTeam(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Users className="w-5 h-5" />
            <span>Join Team</span>
          </button>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-6">
              <Users className="w-24 h-24 mx-auto" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">No teams yet</h3>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Create your first team or join an existing one to start collaborating with your colleagues.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowCreateTeam(true)}
                className="btn-primary"
              >
                Create Your First Team
              </button>
              <button
                onClick={() => setShowJoinTeam(true)}
                className="btn-secondary"
              >
                Join a Team
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard 
                key={team.id} 
                team={team} 
                onClick={() => navigate(`/team/${team.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Team</h3>
            
            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full input-field"
                  placeholder="Enter team name"
                  required
                  maxLength={100}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={!newTeamName.trim()}
                >
                  Create Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTeam(false);
                    setNewTeamName('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Join Team</h3>
            
            <form onSubmit={handleJoinTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full input-field"
                  placeholder="Enter invite code"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ask your team admin for the invite code
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={!inviteCode.trim()}
                >
                  Join Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinTeam(false);
                    setInviteCode('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}

function TeamCard({ team, onClick }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div 
      onClick={onClick}
      className="card cursor-pointer group transition-all duration-200 hover:scale-105"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
            {team.name}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{team.member_count} members</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={`px-2 py-1 rounded-full text-xs ${
                team.role === 'admin' 
                  ? 'bg-purple-500/20 text-purple-300' 
                  : 'bg-gray-500/20 text-gray-300'
              }`}>
                {team.role}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-gradient">
          <Code className="w-6 h-6" />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        {team.role === 'admin' && (
          <div className="mb-1">
            <span className="font-medium">Invite Code:</span> {team.invite_code}
          </div>
        )}
        <div>
          Created {formatDate(team.created_at)}
        </div>
      </div>
    </div>
  );
}
