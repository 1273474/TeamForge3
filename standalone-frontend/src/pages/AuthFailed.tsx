import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthFailed() {
  const navigate = useNavigate();

  const handleRetry = () => {
    toast.error('Authentication failed. Please try again.');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">Authentication Failed</h2>
          <p className="text-gray-300">
            We couldn't sign you in. This might be due to a temporary issue or cancelled authentication.
          </p>
        </div>
        
        <button
          onClick={handleRetry}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
