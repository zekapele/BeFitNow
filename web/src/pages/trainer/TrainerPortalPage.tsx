import { Bell, Calendar, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { Staff } from '../../types';
import { service } from '../../services/beFitNowService';

export function TrainerPortalPage() {
  const navigate = useNavigate();
  const raw = sessionStorage.getItem('befitnow_trainer');
  const trainer: Staff | null = raw ? JSON.parse(raw) : null;
  const [tab, setTab] = useState<'schedule' | 'participants' | 'notifications'>('schedule');
  const [selectedTraining, setSelectedTraining] = useState<number | null>(null);
  const [available, setAvailable] = useState(trainer ? service.getTrainerProfile(trainer.name)?.available ?? true : true);
  const [refresh, setRefresh] = useState(0);

  if (!trainer) return <Navigate to="/trainer" replace />;

  const logout = () => { sessionStorage.removeItem('befitnow_trainer'); navigate('/trainer'); };
  const trainings = service.getTrainingsForTrainer(trainer.name);
  const notifications = service.getStaffNotifications(trainer.email);

  const toggleAvailability = () => {
    service.setTrainerAvailability(trainer.name, !available);
    setAvailable(!available);
    setRefresh(r => r + 1);
  };

  return (
    <div className="app-shell">
      <header className="admin-header">
        <div>
          <span className="badge badge-green">Тренер</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginTop: 4 }}>{trainer.name}</h1>
        </div>
        <button className="btn btn-ghost" onClick={logout}>Вийти</button>
      </header>

      <div className="page" key={refresh}>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Доступність для записів</span>
          <button className="btn btn-ghost" onClick={toggleAvailability}>
            {available ? <ToggleRight size={28} color="var(--primary)" /> : <ToggleLeft size={28} color="var(--text-muted)" />}
          </button>
        </div>

        <div className="admin-tabs" style={{ marginTop: '1rem' }}>
          {[
            { id: 'schedule' as const, label: 'Розклад', icon: Calendar },
            { id: 'participants' as const, label: 'Учасники', icon: Users },
            { id: 'notifications' as const, label: 'Сповіщення', icon: Bell },
          ].map(t => (
            <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'schedule' && trainings.map(t => (
          <div className="card" key={t.id}>
            <strong>{t.title}</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.dateTime}</p>
            <span className="badge badge-green">{t.currentParticipants}/{t.maxParticipants} записано</span>
          </div>
        ))}

        {tab === 'participants' && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Оберіть тренування:</p>
            {trainings.map(t => (
              <button key={t.id} className={`btn ${selectedTraining === t.id ? 'btn-primary' : 'btn-secondary'} btn-block`}
                style={{ marginBottom: 6, fontSize: '0.85rem', justifyContent: 'flex-start' }}
                onClick={() => setSelectedTraining(t.id)}>
                {t.title} — {t.dateTime}
              </button>
            ))}
            {selectedTraining && (
              <div className="card" style={{ marginTop: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Список учасників</h3>
                {service.getParticipants(selectedTraining).map(p => (
                  <p key={p.id} style={{ fontSize: '0.88rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                    {p.name} · {p.phone || p.email}
                  </p>
                ))}
                {service.getParticipants(selectedTraining).length === 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>Поки немає записів</p>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'notifications' && (
          notifications.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Сповіщень немає</p> :
          notifications.map(n => (
            <div className="card" key={n.id}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{n.sentAt}</p>
              <p style={{ fontSize: '0.9rem' }}>{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
