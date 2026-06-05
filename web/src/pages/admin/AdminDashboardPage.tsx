import { BarChart3, Calendar, Headphones, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Toast } from '../../components/Toast';
import { service } from '../../services/beFitNowService';
import type { TrainingType } from '../../types';
import { TRAINING_TYPE_LABELS } from '../../types';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const admin = sessionStorage.getItem('befitnow_admin');
  const [tab, setTab] = useState<'schedule' | 'bookings' | 'trainers' | 'support' | 'stats'>('schedule');
  const [toast, setToast] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const [newTraining, setNewTraining] = useState({
    gymId: 1, title: '', trainer: '', description: '', dateTime: '', type: 'Yoga' as TrainingType,
    durationMinutes: 60, maxParticipants: 12, minParticipants: 3, bookingDeadlineHours: 2, price: 250,
  });

  if (!admin) return <Navigate to="/admin" replace />;

  const logout = () => { sessionStorage.removeItem('befitnow_admin'); navigate('/admin'); };

  const createTraining = () => {
    if (!newTraining.title || !newTraining.trainer || !newTraining.dateTime) {
      setToast('Заповніть назву, тренера та дату'); return;
    }
    service.createTraining(newTraining);
    setToast('Тренування додано');
    setRefresh(r => r + 1);
  };

  const deleteTraining = (id: number) => {
    if (!service.deleteTraining(id)) setToast('Не можна видалити — є активні записи');
    else { setToast('Видалено'); setRefresh(r => r + 1); }
  };

  const tabs = [
    { id: 'schedule' as const, label: 'Розклад', icon: Calendar },
    { id: 'bookings' as const, label: 'Записи', icon: Users },
    { id: 'trainers' as const, label: 'Тренери', icon: Users },
    { id: 'support' as const, label: 'Підтримка', icon: Headphones },
    { id: 'stats' as const, label: 'Заповненість', icon: BarChart3 },
  ];

  return (
    <div className="app-shell admin-shell">
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      <header className="admin-header">
        <div>
          <span className="badge badge-orange">Admin</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginTop: 4 }}>BeFitNow Panel</h1>
        </div>
        <button className="btn btn-ghost" onClick={logout}>Вийти</button>
      </header>

      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="page admin-page" key={refresh}>
        {tab === 'schedule' && (
          <>
            <h2 className="section-title">Розклад клубів</h2>
            {service.getAllTrainings().map(t => {
              const gym = service.getGym(t.gymId);
              return (
                <div className="card" key={t.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{t.title}</strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.dateTime} · {gym?.name}</p>
                      <p style={{ fontSize: '0.82rem' }}>{t.currentParticipants}/{t.maxParticipants} · {t.trainer}</p>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => deleteTraining(t.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            <h2 className="section-title" style={{ marginTop: '1.5rem' }}><Plus size={18} /> Додати тренування</h2>
            <div className="card">
              <input className="input" placeholder="Назва" value={newTraining.title} onChange={e => setNewTraining({ ...newTraining, title: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="input" placeholder="Тренер" value={newTraining.trainer} onChange={e => setNewTraining({ ...newTraining, trainer: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="input" placeholder="Дата YYYY-MM-DD HH:MM" value={newTraining.dateTime} onChange={e => setNewTraining({ ...newTraining, dateTime: e.target.value })} style={{ marginBottom: 8 }} />
              <select className="input" value={newTraining.gymId} onChange={e => setNewTraining({ ...newTraining, gymId: +e.target.value })} style={{ marginBottom: 8 }}>
                {service.getGyms().map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className="input" value={newTraining.type} onChange={e => setNewTraining({ ...newTraining, type: e.target.value as TrainingType })} style={{ marginBottom: 8 }}>
                {Object.entries(TRAINING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn btn-primary btn-block" onClick={createTraining}>Створити</button>
            </div>
          </>
        )}

        {tab === 'bookings' && (
          <>
            <h2 className="section-title">Усі бронювання</h2>
            {service.getAllBookings().filter(b => b.status === 'Confirmed').map(b => {
              const t = service.getTraining(b.trainingId);
              const user = service.getUsers().find(u => u.id === b.userId);
              return (
                <div className="card" key={b.id}>
                  <strong>#{b.id} BFN-{b.id}</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.name} · {t?.title} · {t?.dateTime}</p>
                  <button className="btn btn-danger" style={{ marginTop: 8, fontSize: '0.82rem' }} onClick={() => { service.adminCancelBooking(b.id); setRefresh(r => r + 1); setToast('Скасовано'); }}>
                    Скасувати (адмін)
                  </button>
                </div>
              );
            })}
          </>
        )}

        {tab === 'trainers' && (
          <>
            <h2 className="section-title">Тренери</h2>
            {service.getTrainers().map(t => (
              <div className="card" key={t.name}>
                <strong>{t.name}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.qualifications}</p>
                <span className={`badge ${t.available ? 'badge-green' : 'badge-orange'}`}>{t.available ? 'Доступний' : 'Недоступний'}</span>
              </div>
            ))}
          </>
        )}

        {tab === 'support' && (
          <>
            <h2 className="section-title">Запити підтримки</h2>
            {service.getSupportTickets().length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Запитів немає</p>
            ) : service.getSupportTickets().map(t => (
              <div className="card" key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>#{t.id} {t.subject}</strong>
                  {t.escalated && <span className="badge badge-orange">Ескалація</span>}
                </div>
                <p style={{ fontSize: '0.85rem' }}>{t.userName} · {t.userEmail}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{t.message}</p>
              </div>
            ))}
          </>
        )}

        {tab === 'stats' && (
          <>
            <h2 className="section-title">Заповненість</h2>
            {service.getOccupancyStats().map(s => (
              <div className="card" key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.9rem' }}>{s.title}</strong>
                  <span>{s.pct}%</span>
                </div>
                <div className="spots-bar"><div className="spots-fill" style={{ width: `${s.pct}%` }} /></div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.occupied}/{s.capacity} · {s.dateTime}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
