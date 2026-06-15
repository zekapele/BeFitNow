import { useMemo, useState } from 'react';
import { Building2, MessageCircle, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { TrainingCard } from '../components/TrainingCard';
import { useAuth } from '../context/AuthContext';
import { service } from '../services/beFitNowService';
import type { TimeOfDay, TrainingType } from '../types';
import { TRAINING_TYPE_LABELS } from '../types';

const TYPES: (TrainingType | 'all')[] = [
  'all', 'Yoga', 'HIIT', 'Pilates', 'CrossFit', 'Strength',
  'Spinning', 'Boxing', 'Dance', 'TRX', 'Meditation', 'Aqua',
  'Stretching', 'Bodybuilding', 'Functional',
];
const TIMES: { id: TimeOfDay | 'all'; label: string }[] = [
  { id: 'all', label: 'Весь день' },
  { id: 'morning', label: 'Ранок' },
  { id: 'afternoon', label: 'День' },
  { id: 'evening', label: 'Вечір' },
];

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TrainingType | 'all'>('all');
  const [gymId, setGymId] = useState<number | 'all'>(params.get('gym') ? +params.get('gym')! : 'all');
  const [date, setDate] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | 'all'>('all');

  const slots = useMemo(() => {
    return service.searchTrainings({
      keyword: search || undefined,
      type: type === 'all' ? undefined : type,
      gymId: gymId === 'all' ? undefined : gymId,
      date: date || undefined,
      timeOfDay: timeOfDay === 'all' ? undefined : timeOfDay,
      onlyAvailable: true,
    });
  }, [search, type, gymId, date, timeOfDay]);

  return (
    <div className="app-shell">
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Привіт, {user?.name.split(' ')[0]}! 👋</h1>
            <p className="page-subtitle">Знайдіть тренування та запишіться</p>
          </div>
          <button className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem' }} onClick={() => navigate('/app/ai')}>
            <MessageCircle size={16} /> AI
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Тренування, тренер, клуб..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
          <select className="input" value={timeOfDay} onChange={e => setTimeOfDay(e.target.value as TimeOfDay | 'all')} style={{ flex: 1 }}>
            {TIMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div className="filter-scroll">
          {TYPES.map(t => (
            <button key={t} className={`btn ${type === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
              onClick={() => setType(t)}>
              {t === 'all' ? 'Всі' : TRAINING_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 0' }}>
          <select className="input" style={{ flex: 1 }} value={gymId} onChange={e => setGymId(e.target.value === 'all' ? 'all' : +e.target.value)}>
            <option value="all">Всі клуби</option>
            {service.getGyms().map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => navigate('/app/clubs')} style={{ padding: '0.6rem' }}>
            <Building2 size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Слоти ({slots.length})</h2>
          <button className="btn btn-ghost" style={{ fontSize: '0.85rem', color: 'var(--primary)' }} onClick={() => navigate('/app/trainers')}>Тренери →</button>
        </div>

        {slots.length === 0 ? (
          <div className="empty-state">
            <p>Немає слотів. Спробуйте інші фільтри або <button className="btn btn-ghost" style={{ color: 'var(--primary)' }} onClick={() => navigate('/app/chat')}>чатбот</button></p>
          </div>
        ) : slots.map(t => <TrainingCard key={t.id} training={t} />)}
      </div>
      <BottomNav />
    </div>
  );
}
