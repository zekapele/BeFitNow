import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Calendar, Headphones, LogOut, Settings, Users,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { service } from '../../services/beFitNowService';
import {
  AnalyticsSection,
  BookingsSection,
  ClientsSection,
  ScheduleSection,
  SettingsSection,
  SupportSection,
  type StaffSession,
} from './PortalSections';

type PortalTab = 'schedule' | 'bookings' | 'clients' | 'analytics' | 'support' | 'settings';

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const raw = sessionStorage.getItem('befitnow_staff');
  const session: StaffSession | null = raw ? JSON.parse(raw) : null;
  const [tab, setTab] = useState<PortalTab>('schedule');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [gymFilter, setGymFilter] = useState<number | undefined>(undefined);

  const gymId = useMemo(() => {
    if (!session) return undefined;
    if (session.role === 'trainer') return session.staff.gymId;
    return gymFilter;
  }, [session, gymFilter]);

  useEffect(() => {
    if (session) {
      service.runPortalMaintenance(gymId);
    }
  }, [session, gymId, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!session) return <Navigate to="/portal" replace />;

  const logout = () => {
    sessionStorage.removeItem('befitnow_staff');
    navigate('/portal');
  };

  const onRefresh = () => setRefresh(r => r + 1);
  const showToast = (msg: string) => setToast(msg);

  const sectionProps = { session, gymId, refresh, onRefresh, toast: showToast };

  const tabs: { id: PortalTab; label: string; icon: typeof Calendar; adminOnly?: boolean }[] = [
    { id: 'schedule', label: 'Розклад', icon: Calendar },
    { id: 'bookings', label: 'Бронювання', icon: Users },
    { id: 'clients', label: 'Клієнти', icon: Users, adminOnly: true },
    { id: 'analytics', label: 'Аналітика', icon: BarChart3 },
    { id: 'support', label: 'Підтримка', icon: Headphones },
    { id: 'settings', label: 'Налаштування', icon: Settings, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(t => !t.adminOnly || session.role === 'admin');

  return (
    <div className="portal-layout portal-layout-full">
      {toast && <div className="portal-toast">{toast}</div>}

      <header className="portal-header">
        <div className="portal-header-left">
          <Calendar size={22} color="var(--accent)" />
          <div>
            <h1>BeFitNow Portal</h1>
            <p>{session.role === 'admin' ? 'Адміністратор' : 'Тренер'} · {session.staff.name}</p>
          </div>
        </div>
        <div className="portal-header-actions">
          {session.role === 'admin' && (
            <select className="input portal-gym-select" value={gymFilter ?? ''} onChange={e => setGymFilter(e.target.value ? +e.target.value : undefined)}>
              <option value="">Усі клуби</option>
              {service.getGyms().map(g => <option key={g.id} value={g.id}>{g.name} · {g.city}</option>)}
            </select>
          )}
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut size={18} /> Вийти
          </button>
        </div>
      </header>

      <nav className="portal-tabs">
        {visibleTabs.map(t => (
          <button key={t.id} className={`portal-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </nav>

      <div className="portal-body">
        {tab === 'schedule' && (
          <ScheduleSection {...sectionProps} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {tab === 'bookings' && <BookingsSection {...sectionProps} />}
        {tab === 'clients' && session.role === 'admin' && <ClientsSection gymId={gymId} refresh={refresh} />}
        {tab === 'analytics' && <AnalyticsSection gymId={gymId} refresh={refresh} />}
        {tab === 'support' && <SupportSection {...sectionProps} />}
        {tab === 'settings' && session.role === 'admin' && <SettingsSection {...sectionProps} />}
      </div>
    </div>
  );
}
