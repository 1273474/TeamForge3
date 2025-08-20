import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import HomePage from './pages/Home';
import AuthSuccessPage from './pages/AuthSuccess';
import AuthFailedPage from './pages/AuthFailed';
import DashboardPage from './pages/Dashboard';
import TeamPage from './pages/Team';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth/success" element={<AuthSuccessPage />} />
              <Route path="/auth/failed" element={<AuthFailedPage />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/team/:teamId" 
                element={
                  <ProtectedRoute>
                    <TeamPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
