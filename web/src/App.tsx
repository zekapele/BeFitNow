import { Navigate, Route, Routes } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { AuthProvider } from './context/AuthContext';
import { TelegramBotPage } from './pages/TelegramBotPage';
import { StaffLoginPage } from './pages/portal/StaffLoginPage';
import { StaffDashboardPage } from './pages/portal/StaffDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <PhoneFrame>
        <Routes>
          {/* Telegram-бот — єдиний клієнтський інтерфейс */}
          <Route path="/" element={<TelegramBotPage />} />

          {/* Портал персоналу (адмін + тренер) */}
          <Route path="/portal" element={<StaffLoginPage />} />
          <Route path="/portal/dashboard" element={<StaffDashboardPage />} />

          {/* Редіректи зі старих URL застосунку */}
          <Route path="/app" element={<Navigate to="/" replace />} />
          <Route path="/app/*" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
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
