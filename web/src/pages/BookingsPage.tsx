import { useState } from 'react';
import { CalendarX, History, RefreshCw, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { service } from '../services/beFitNowService';

export function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);

  if (!user) return null;
  const upcoming = service.getUserBookings(user.id);
  const history = service.getBookingHistory(user.id);

  const cancel = (id: number) => {
    setToast({ msg: service.cancelBooking(user.id, id), type: 'success' });
    setRefresh(r => r + 1);
  };

  const reschedule = (bookingId: number, newTrainingId: number) => {
    setToast({ msg: service.rescheduleBooking(user.id, bookingId, newTrainingId), type: 'success' });
    setRescheduleId(null);
    setRefresh(r => r + 1);
  };

  const repeat = (bookingId: number) => {
    const r = service.repeatBooking(user.id, bookingId);
    setToast({ msg: r.message, type: r.success ? 'success' : 'error' });
    if (r.success && r.trainingId) navigate(`/app/training/${r.trainingId}`);
    setRefresh(x => x + 1);
  };

  const renderBooking = (b: typeof upcoming[0], isHistory: boolean) => {
    const t = service.getTraining(b.trainingId);
    const gym = t ? service.getGym(t.gymId) : null;
    return (
      <div className="card" key={b.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className={`badge ${isHistory ? 'badge-orange' : 'badge-green'}`}>BFN-{b.id}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.createdAt}</span>
        </div>
        <h3 style={{ marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>{t?.title ?? '—'}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{t?.dateTime} · {t?.trainer}</p>
        {gym && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{gym.name}</p>}

        {!isHistory && rescheduleId === b.id ? (
          <div style={{ marginTop: '0.75rem' }}>
            {service.getAvailableSlots().filter(s => s.id !== b.trainingId).slice(0, 4).map(s => (
              <button key={s.id} className="btn btn-secondary btn-block" style={{ marginBottom: 4, fontSize: '0.82rem' }}
                onClick={() => reschedule(b.id, s.id)}>{s.title} — {s.dateTime}</button>
            ))}
            <button className="btn btn-ghost" onClick={() => setRescheduleId(null)}>Скасувати</button>
          </div>
        ) : !isHistory ? (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => setRescheduleId(b.id)}>
              <RefreshCw size={14} /> Перенести
            </button>
            <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => cancel(b.id)}>
              <CalendarX size={14} /> Скасувати
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-block" style={{ marginTop: '0.75rem', fontSize: '0.82rem' }} onClick={() => repeat(b.id)}>
            <Repeat size={14} /> Повторити запис
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page" key={refresh}>
        <h1 className="page-title">Мої записи</h1>
        <p className="page-subtitle">Керування та історія</p>

        <div className="admin-tabs" style={{ marginBottom: '1rem' }}>
          <button className={`admin-tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
            <CalendarX size={16} /> Майбутні ({upcoming.length})
          </button>
          <button className={`admin-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <History size={16} /> Історія ({history.length})
          </button>
        </div>

        {tab === 'upcoming' && (upcoming.length === 0 ? (
          <div className="empty-state">
            <CalendarX size={48} />
            <p>Немає активних записів</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/app')}>Знайти тренування</button>
          </div>
        ) : upcoming.map(b => renderBooking(b, false)))}

        {tab === 'history' && (history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Історія порожня</p>
        ) : history.map(b => renderBooking(b, true)))}
      </div>
      <BottomNav />
    </div>
  );
}
