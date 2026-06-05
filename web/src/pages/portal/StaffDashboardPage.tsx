import { useMemo, useState } from 'react';
import { Calendar, LogOut, Phone, User, Users, X } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StaffCalendar } from '../../components/StaffCalendar';
import { service } from '../../services/beFitNowService';
import type { Staff } from '../../types';

interface StaffSession {
  role: 'admin' | 'trainer';
  staff: Staff;
}

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const raw = sessionStorage.getItem('befitnow_staff');
  const session: StaffSession | null = raw ? JSON.parse(raw) : null;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);

  const trainings = useMemo(() => {
    if (!session) return [];
    if (session.role === 'admin') return service.getAllTrainings();
    return service.getTrainingsForTrainer(session.staff.name);
  }, [session, refresh]);

  if (!session) return <Navigate to="/portal" replace />;

  const selected = selectedId ? service.getTraining(selectedId) : null;
  const participants = selectedId ? service.getParticipants(selectedId) : [];
  const gym = selected ? service.getGym(selected.gymId) : null;

  const logout = () => {
    sessionStorage.removeItem('befitnow_staff');
    navigate('/portal');
  };

  const cancelBooking = (bookingId: number) => {
    service.adminCancelBooking(bookingId);
    setRefresh(r => r + 1);
  };

  return (
    <div className="portal-layout">
      <header className="portal-header">
        <div className="portal-header-left">
          <Calendar size={22} color="var(--accent)" />
          <div>
            <h1>BeFitNow Portal</h1>
            <p>{session.role === 'admin' ? 'Адміністратор' : 'Тренер'} · {session.staff.name}</p>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={logout}>
          <LogOut size={18} /> Вийти
        </button>
      </header>

      <div className="portal-content" key={refresh}>
        <main className="portal-calendar-panel">
          <h2 className="portal-section-title">Календар занять</h2>
          <StaffCalendar trainings={trainings} selectedId={selectedId} onSelect={setSelectedId} />
        </main>

        <aside className={`portal-detail-panel ${selected ? 'open' : ''}`}>
          {!selected ? (
            <div className="portal-detail-empty">
              <Users size={40} opacity={0.3} />
              <p>Оберіть заняття в календарі,<br />щоб переглянути записи клієнтів</p>
            </div>
          ) : (
            <>
              <div className="portal-detail-header">
                <h2>{selected.title}</h2>
                <button className="btn btn-ghost" onClick={() => setSelectedId(null)}><X size={20} /></button>
              </div>

              <div className="portal-detail-info">
                <p><strong>Дата:</strong> {selected.dateTime}</p>
                <p><strong>Тренер:</strong> {selected.trainer}</p>
                <p><strong>Тривалість:</strong> {selected.durationMinutes} хв</p>
                {gym && <p><strong>Клуб:</strong> {gym.name}, {gym.address}</p>}
                <p>
                  <strong>Заповненість:</strong>{' '}
                  <span className={service.freeSpots(selected) === 0 ? 'text-full' : 'text-free'}>
                    {selected.currentParticipants}/{selected.maxParticipants}
                  </span>
                </p>
              </div>

              <h3 className="portal-participants-title">
                <Users size={18} /> Записані клієнти ({participants.length})
              </h3>

              {participants.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Поки немає записів</p>
              ) : (
                <ul className="portal-participants-list">
                  {participants.map(p => {
                    const booking = service.getAllBookings().find(
                      b => b.userId === p.id && b.trainingId === selectedId && b.status === 'Confirmed'
                    );
                    return (
                      <li key={p.id} className="portal-participant-card">
                        <div className="participant-avatar"><User size={18} /></div>
                        <div className="participant-info">
                          <strong>{p.name}</strong>
                          <span>{p.email}</span>
                          {p.phone && <span><Phone size={12} /> {p.phone}</span>}
                          {booking && <span className="booking-code">BFN-{booking.id}</span>}
                        </div>
                        {session.role === 'admin' && booking && (
                          <button className="btn btn-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => cancelBooking(booking.id)}>
                            Скасувати
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
