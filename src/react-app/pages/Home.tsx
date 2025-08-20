import { useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import { Code2, Users, MessageSquare, CheckSquare, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && user) {
      navigate('/dashboard');
    }
  }, [user, isPending, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TeamForge</span>
          </div>
          <button
            onClick={redirectToLogin}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-6 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Build Together,
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Ship Faster
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Real-time collaboration tool for developer teams. Chat, manage tasks, and get AI assistance - all in one place.
            </p>
            <button
              onClick={redirectToLogin}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2 mx-auto"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8" />}
              title="Real-time Chat"
              description="Instant messaging with your team, mentions, and code formatting support"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="AI Assistant"
              description="Get instant help with @ai mentions, code suggestions, and conversation summaries"
            />
            <FeatureCard
              icon={<CheckSquare className="w-8 h-8" />}
              title="Task Management"
              description="Kanban-style boards to track progress from todo to done"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Team Collaboration"
              description="Create teams, invite members, and collaborate seamlessly"
            />
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to supercharge your team?
              </h2>
              <p className="text-gray-300 mb-8">
                Join thousands of developer teams using TeamForge to build better software together.
              </p>
              <button
                onClick={redirectToLogin}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                Start Collaborating Now
              </button>
            </div>
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200">
      <div className="text-purple-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}
