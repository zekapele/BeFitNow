import { Clock, MapPin, Users } from 'lucide-react';
import type { Training } from '../types';
import { TRAINING_TYPE_LABELS } from '../types';
import { service } from '../services/beFitNowService';

interface Props {
  trainings: Training[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function StaffCalendar({ trainings, selectedId, onSelect }: Props) {
  const byDate = trainings.reduce<Record<string, Training[]>>((acc, t) => {
    const date = t.dateTime.split(' ')[0];
    (acc[date] ??= []).push(t);
    return acc;
  }, {});

  const dates = Object.keys(byDate).sort();

  if (!dates.length) {
    return <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>Немає занять у календарі</p>;
  }

  return (
    <div className="staff-calendar">
      {dates.map(date => (
        <div key={date} className="calendar-day">
          <h3 className="calendar-date">{formatDate(date)}</h3>
          <div className="calendar-slots">
            {byDate[date].sort((a, b) => a.dateTime.localeCompare(b.dateTime)).map(t => {
              const gym = service.getGym(t.gymId);
              const free = service.freeSpots(t);
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  className={`calendar-slot ${active ? 'active' : ''} ${free === 0 ? 'full' : ''} ${t.lowEnrollmentCancelled ? 'cancelled' : ''}`}
                  onClick={() => onSelect(t.id)}
                >
                  <div className="slot-time">{t.dateTime.split(' ')[1]}</div>
                  <div className="slot-body">
                    <strong>{t.title}</strong>
                    <span className="slot-meta">{TRAINING_TYPE_LABELS[t.type]} · {t.trainer}</span>
                    {gym && <span className="slot-meta"><MapPin size={12} /> {gym.name}</span>}
                    <span className="slot-occupancy">
                      <Users size={12} /> {t.currentParticipants}/{t.maxParticipants}
                      {free > 0 ? ` · ${free} вільно` : ' · Заповнено'}
                    </span>
                  </div>
                  <Clock size={14} className="slot-duration" />
                  <span className="slot-dur-text">{t.durationMinutes} хв</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
}
