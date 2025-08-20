import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      login(token);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } else {
      toast.error('Authentication failed');
      navigate('/');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <Loader2 className="w-12 h-12 text-white mx-auto" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Signing you in...</h2>
        <p className="text-gray-300">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
