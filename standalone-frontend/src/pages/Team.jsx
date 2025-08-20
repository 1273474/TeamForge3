import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckSquare, Users, Settings, Copy } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';
import TaskBoard from '../components/TaskBoard';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const [teamResponse, membersResponse] = await Promise.all([
        api.get(`/teams/${teamId}`),
        api.get(`/teams/${teamId}/members`)
      ]);
      
      setTeam(teamResponse.data);
      setTeamMembers(membersResponse.data);
    } catch (error) {
      console.error('Error fetching team data:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied to this team');
      } else if (error.response?.status === 404) {
        toast.error('Team not found');
      } else {
        toast.error('Failed to load team data');
      }
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (team?.invite_code) {
      navigator.clipboard.writeText(team.invite_code);
      toast.success('Invite code copied to clipboard!');
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;

    try {
      await api.delete(`/teams/${teamId}/leave`);
      toast.success('Left team successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving team:', error);
      toast.error(error.response?.data?.error || 'Failed to leave team');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Team not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>{teamMembers.length} members</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    team.role === 'admin' 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {team.role}
                  </span>
                  {team.role === 'admin' && (
                    <button
                      onClick={copyInviteCode}
                      className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Code: {team.invite_code}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'chat'
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === 'tasks'
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Tasks</span>
                </button>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-white transition-colors p-2"
                title="Team Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-80px)]">
        {activeTab === 'chat' ? (
          <ChatPanel teamId={parseInt(teamId)} user={user} />
        ) : (
          <TaskBoard teamId={parseInt(teamId)} user={user} />
        )}
      </main>

      {/* Team Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-6">Team Settings</h3>
            
            {/* Team Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Team Name
                </label>
                <div className="input-field bg-slate-700/50">
                  {team.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Invite Code
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 input-field bg-slate-700/50 font-mono">
                    {team.invite_code}
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="btn-secondary px-3 py-3"
                    title="Copy invite code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Members ({teamMembers.length})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 bg-slate-700/30 rounded">
                      {member.picture ? (
                        <img 
                          src={member.picture} 
                          alt={member.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm text-white">{member.name}</div>
                        <div className="text-xs text-gray-400">{member.email}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full btn-secondary"
              >
                Close
              </button>
              
              <button
                onClick={handleLeaveTeam}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Leave Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
