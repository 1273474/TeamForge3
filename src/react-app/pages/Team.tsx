import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MessageSquare, CheckSquare } from 'lucide-react';
import ChatPanel from '@/react-app/components/ChatPanel';
import TaskBoard from '@/react-app/components/TaskBoard';
import type { Team } from '@/shared/types';

export default function TeamPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !user) {
      navigate('/');
      return;
    }

    if (user && teamId) {
      fetchTeam();
    }
  }, [user, isPending, navigate, teamId]);

  const fetchTeam = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const teams = await response.json();
        const currentTeam = teams.find((t: Team) => t.id === parseInt(teamId!));
        if (currentTeam) {
          setTeam(currentTeam);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
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
                <p className="text-sm text-gray-400">
                  {team.role === 'admin' ? 'Team Admin' : 'Team Member'}
                </p>
              </div>
            </div>

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-80px)]">
        {activeTab === 'chat' ? (
          <ChatPanel teamId={parseInt(teamId!)} user={user!} />
        ) : (
          <TaskBoard teamId={parseInt(teamId!)} user={user!} />
        )}
      </main>
    </div>
  );
}
