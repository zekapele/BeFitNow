import { useMemo, useState } from 'react';
import { service } from '../../services/beFitNowService';
import { TRAINING_TYPE_LABELS, type Staff, type TrainingType } from '../../types';

export interface StaffSession {
  role: 'admin' | 'trainer';
  staff: Staff;
}

interface SectionProps {
  session: StaffSession;
  gymId?: number;
  refresh: number;
  onRefresh: () => void;
  toast: (message: string) => void;
}

interface ScheduleSectionProps extends SectionProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

const WORKOUT_TYPES: TrainingType[] = ['Yoga', 'HIIT', 'Pilates', 'CrossFit', 'Strength', 'Boxing', 'Spinning', 'Aqua'];

function formatMoney(value: number) {
  return `${value.toLocaleString('uk-UA')} грн`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="portal-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ScheduleSection({ gymId, selectedId, onSelect, onRefresh, toast }: ScheduleSectionProps) {
  const [title, setTitle] = useState('Нове тренування');
  const [type, setType] = useState<TrainingType>('Yoga');
  const [dateTime, setDateTime] = useState('2026-06-12 18:00');
  const [price, setPrice] = useState(250);

  const trainings = service.getPortalTrainings(gymId)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const selected = selectedId ? service.getTraining(selectedId) : trainings[0];
  const gym = selected ? service.getGym(selected.gymId) : null;

  const create = () => {
    const targetGym = gymId ?? service.getGyms()[0]?.id;
    if (!targetGym) return;
    service.createTraining({
      gymId: targetGym,
      title,
      trainer: '—',
      description: 'Тренування створено в порталі персоналу',
      dateTime,
      type,
      durationMinutes: 60,
      maxParticipants: 12,
      minParticipants: 2,
      bookingDeadlineHours: 1,
      price,
      active: true,
    });
    toast('Тренування створено');
    onRefresh();
  };

  return (
    <section className="portal-section">
      <div className="portal-section-header">
        <div>
          <h2>Розклад</h2>
          <p>Створення та перегляд тренувань клубу.</p>
        </div>
      </div>

      <div className="portal-grid">
        <div className="portal-card">
          <h3>Тренування</h3>
          {trainings.slice(0, 12).map(t => (
            <button
              key={t.id}
              className={`portal-support-item ${selected?.id === t.id ? 'active' : ''}`}
              type="button"
              onClick={() => onSelect(t.id)}
            >
              <strong>{t.title}</strong>
              <span>{t.dateTime} · {service.freeSpots(t)}/{t.maxParticipants} місць</span>
            </button>
          ))}
        </div>

        <div className="portal-card">
          <h3>Деталі</h3>
          {selected ? (
            <>
              <p><strong>{selected.title}</strong></p>
              <p>{selected.dateTime}</p>
              <p>{gym?.name} · {gym?.city}</p>
              <p>{TRAINING_TYPE_LABELS[selected.type]} · {formatMoney(selected.price)}</p>
            </>
          ) : <p>Оберіть тренування.</p>}

          <hr />
          <h3>Створити тренування</h3>
          <div className="portal-form-grid">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
            <select className="input" value={type} onChange={e => setType(e.target.value as TrainingType)}>
              {WORKOUT_TYPES.map(item => <option key={item} value={item}>{TRAINING_TYPE_LABELS[item]}</option>)}
            </select>
            <input className="input" value={dateTime} onChange={e => setDateTime(e.target.value)} />
            <input className="input" type="number" value={price} onChange={e => setPrice(+e.target.value)} />
          </div>
          <button className="btn btn-primary" type="button" onClick={create}>Створити</button>
        </div>
      </div>
    </section>
  );
}

export function BookingsSection({ session, gymId, onRefresh, toast }: SectionProps) {
  const trainer = session.role === 'trainer' ? session.staff.name : undefined;
  const bookings = service.getBookingsForPortal(gymId, trainer);

  const cancel = (bookingId: number) => {
    toast(service.adminCancelBooking(bookingId));
    onRefresh();
  };

  return (
    <section className="portal-section">
      <h2>Бронювання</h2>
      <div className="portal-card">
        {bookings.slice(0, 20).map(item => (
          <div key={item.id} className="portal-row">
            <div>
              <strong>BFN-{item.id}</strong> · {item.user?.name ?? 'Клієнт'}
              <p>{item.training.title} · {item.training.dateTime}</p>
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => cancel(item.id)}>Скасувати</button>
          </div>
        ))}
        {!bookings.length && <p>Бронювань немає.</p>}
      </div>
    </section>
  );
}

export function ClientsSection({ gymId, refresh }: { gymId?: number; refresh: number }) {
  const clients = useMemo(() => service.getClientDatabase(gymId), [gymId, refresh]);
  return (
    <section className="portal-section">
      <h2>Клієнти</h2>
      <div className="portal-card">
        {clients.map(client => (
          <div key={client.id} className="portal-row">
            <div>
              <strong>{client.name}</strong> · {client.phone}
              <p>Активних записів: {client.confirmedBookings} {client.blacklisted ? '· blacklist' : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsSection({ gymId, refresh }: { gymId?: number; refresh: number }) {
  const kpis = useMemo(() => service.getPortalKPIs(gymId), [gymId, refresh]);
  const payments = useMemo(() => service.getPaymentStats(gymId), [gymId, refresh]);
  return (
    <section className="portal-section">
      <h2>Аналітика</h2>
      <div className="portal-kpi-grid">
        <StatCard label="Заповненість" value={`${kpis.occupancyPct}%`} />
        <StatCard label="Активні записи" value={kpis.confirmedBookings} />
        <StatCard label="Скасування" value={kpis.cancelledBookings} />
        <StatCard label="Дохід" value={formatMoney(payments.total)} />
      </div>
    </section>
  );
}

export function SupportSection({ session, refresh, onRefresh, toast }: SectionProps) {
  const [activeTicket, setActiveTicket] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const tickets = useMemo(() => service.getSupportTickets(), [refresh]);
  const active = tickets.find(ticket => ticket.id === activeTicket) ?? tickets[0];

  const send = () => {
    if (!active || !reply.trim()) return;
    service.adminReplySupport(active.id, session.staff.name, reply);
    setReply('');
    toast('Відповідь надіслано');
    onRefresh();
  };

  return (
    <section className="portal-section">
      <h2>Підтримка</h2>
      <div className="portal-grid">
        <div className="portal-card">
          {tickets.map(ticket => (
            <button
              key={ticket.id}
              className={`portal-support-item ${active?.id === ticket.id ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTicket(ticket.id)}
            >
              <strong>{ticket.subject}</strong>
              <span>{ticket.userName} · {ticket.status}</span>
            </button>
          ))}
          {!tickets.length && <p>Нових звернень немає.</p>}
        </div>
        <div className="portal-card">
          {active ? (
            <>
              <h3>{active.subject}</h3>
              <p>{active.message}</p>
              {(active.replies ?? []).map((item, index) => (
                <p key={`${item.at}-${index}`}><strong>{item.from}:</strong> {item.text}</p>
              ))}
              <textarea className="input" value={reply} onChange={e => setReply(e.target.value)} />
              <button className="btn btn-primary" type="button" onClick={send}>Відповісти</button>
            </>
          ) : <p>Оберіть звернення.</p>}
        </div>
      </div>
    </section>
  );
}

export function SettingsSection({ gymId, onRefresh, toast }: SectionProps) {
  const gyms = service.getGyms();
  const selectedGym = gymId ? service.getGym(gymId) : gyms[0];

  const toggleCrm = () => {
    if (!selectedGym) return;
    service.toggleCrmConnection(selectedGym.id, !selectedGym.crmConnected);
    toast('Налаштування CRM оновлено');
    onRefresh();
  };

  return (
    <section className="portal-section">
      <h2>Налаштування</h2>
      <div className="portal-card">
        {selectedGym ? (
          <>
            <p><strong>{selectedGym.name}</strong></p>
            <p>CRM: {selectedGym.crmConnected ? 'підключено' : 'вимкнено'}</p>
            <button className="btn btn-primary" type="button" onClick={toggleCrm}>Перемкнути CRM</button>
          </>
        ) : <p>Клуб не обрано.</p>}
      </div>
    </section>
  );
}
