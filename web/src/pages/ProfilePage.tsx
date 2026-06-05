import { useState } from 'react';
import { Bell, CreditCard, HelpCircle, LogOut, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { service } from '../services/beFitNowService';
import type { NotificationPreferences, ReminderSettings } from '../types';
import { DEFAULT_NOTIFICATION_PREFS } from '../types';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <div className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} />;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profile = user ? service.getProfile(user.id) : null;
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    user ? service.getPreferences(user.id) : DEFAULT_NOTIFICATION_PREFS
  );

  if (!user) return null;

  const updatePref = (key: keyof Omit<NotificationPreferences, 'reminderTimes'>, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    service.updatePreferences(user.id, next);
  };

  const updateReminder = (key: keyof ReminderSettings, val: boolean) => {
    const next = { ...prefs, reminderTimes: { ...prefs.reminderTimes, [key]: val } };
    setPrefs(next);
    service.updatePreferences(user.id, next);
  };

  return (
    <div className="app-shell">
      <div className="page">
        <h1 className="page-title">Профіль</h1>
        <p className="page-subtitle">Особистий кабінет</p>

        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 0.75rem',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
          }}>
            {user.name.charAt(0)}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)' }}>{user.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{user.email}</p>
        </div>

        {profile?.membership ? (
          <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <CreditCard size={20} color="var(--primary)" />
              <strong>{profile.membership.typeName}</strong>
            </div>
            <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary)' }}>
              {profile.membership.remaining} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>тренувань залишилось</span>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              Дійсний до: {profile.membership.validUntil}
            </p>
          </div>
        ) : (
          <div className="card">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Активного абонемента немає</p>
          </div>
        )}

        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={18} /> Сповіщення
          </h3>
          {([
            ['reminders', 'Нагадування про тренування'],
            ['scheduleChanges', 'Зміни в розкладі'],
            ['freeSpots', 'Вільні місця'],
            ['slotAlerts', 'Алерти доступності слотів'],
            ['newWorkouts', 'Нові тренування'],
            ['promotions', 'Акції та промо'],
          ] as const).map(([key, label]) => (
            <div className="toggle-row" key={key}>
              <span style={{ fontSize: '0.88rem' }}>{label}</span>
              <Toggle on={prefs[key]} onChange={v => updatePref(key, v)} />
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Час нагадувань</h3>
          {([
            ['before24h', 'За 24 години'],
            ['before2h', 'За 2 години'],
            ['before30m', 'За 30 хвилин'],
          ] as const).map(([key, label]) => (
            <div className="toggle-row" key={key}>
              <span style={{ fontSize: '0.88rem' }}>{label}</span>
              <Toggle on={prefs.reminderTimes[key]} onChange={v => updateReminder(key, v)} />
            </div>
          ))}
        </div>

        <Link to="/app/support" className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '0.75rem' }}>
          <HelpCircle size={20} color="var(--primary)" />
          <span>FAQ та підтримка</span>
        </Link>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageSquare size={20} color="var(--accent)" />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Складні питання — через підтримку або чатбот</span>
        </div>

        <button className="btn btn-secondary btn-block" style={{ marginTop: '1rem' }} onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={18} /> Вийти
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
