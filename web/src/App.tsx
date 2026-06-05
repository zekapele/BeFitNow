import { Navigate, Route, Routes } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WelcomePage } from './pages/WelcomePage';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { TrainingDetailPage } from './pages/TrainingDetailPage';
import { BookingsPage } from './pages/BookingsPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { TrainersPage } from './pages/TrainersPage';
import { ClubsPage } from './pages/ClubsPage';
import { SupportPage } from './pages/SupportPage';
import { StaffLoginPage } from './pages/portal/StaffLoginPage';
import { StaffDashboardPage } from './pages/portal/StaffDashboardPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <PhoneFrame>
      <Routes>
        {/* Клієнтський застосунок */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/app" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/app/training/:id" element={<PrivateRoute><TrainingDetailPage /></PrivateRoute>} />
        <Route path="/app/bookings" element={<PrivateRoute><BookingsPage /></PrivateRoute>} />
        <Route path="/app/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/app/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/app/trainers" element={<PrivateRoute><TrainersPage /></PrivateRoute>} />
        <Route path="/app/clubs" element={<PrivateRoute><ClubsPage /></PrivateRoute>} />
        <Route path="/app/support" element={<PrivateRoute><SupportPage /></PrivateRoute>} />

        {/* Окремий сайт для персоналу (адмін + тренер) */}
        <Route path="/portal" element={<StaffLoginPage />} />
        <Route path="/portal/dashboard" element={<StaffDashboardPage />} />

        {/* Редіректи зі старих URL */}
        <Route path="/admin" element={<Navigate to="/portal" replace />} />
        <Route path="/admin/*" element={<Navigate to="/portal" replace />} />
        <Route path="/trainer" element={<Navigate to="/portal" replace />} />
        <Route path="/trainer/*" element={<Navigate to="/portal" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </PhoneFrame>
    </AuthProvider>
  );
}
