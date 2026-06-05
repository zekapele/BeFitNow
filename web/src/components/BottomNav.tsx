import { Calendar, Home, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/app', icon: Home, label: 'Головна' },
  { path: '/app/bookings', icon: Calendar, label: 'Записи' },
  { path: '/app/chat', icon: MessageCircle, label: 'Чатбот' },
  { path: '/app/profile', icon: User, label: 'Профіль' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);
        return (
          <button key={path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}>
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
