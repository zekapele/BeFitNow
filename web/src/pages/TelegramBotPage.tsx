import { useMemo, useState } from 'react';
import { LogOut, MoreVertical, Search, Send } from 'lucide-react';
import { service } from '../services/beFitNowService';
import { TRAINING_TYPE_LABELS, type Training, type TrainingType } from '../types';
import { useAuth } from '../context/AuthContext';

type Step = 'welcome' | 'location' | 'types' | 'gyms' | 'dates' | 'slots' | 'details' | 'register' | 'done';

const DEMO_TODAY = '2026-06-05';
const WORKOUT_TYPES: TrainingType[] = ['Yoga', 'HIIT', 'Pilates', 'CrossFit', 'Strength', 'Boxing', 'Spinning', 'Aqua'];

function timeLabel(dateTime: string) {
  return dateTime.split(' ')[1]?.slice(0, 5) ?? '';
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function nextDate(days: number) {
  const date = new Date(DEMO_TODAY);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function Message({ children, role = 'bot' }: { children: React.ReactNode; role?: 'bot' | 'user' }) {
  return (
    <div className={`tg-msg-row ${role}`}>
      {role === 'bot' && <div className="tg-avatar">BF</div>}
      <div className="tg-msg-col">
        <div className={`tg-bubble ${role}`}>
          <div className="tg-bubble-text">{children}</div>
          <span className="tg-bubble-time">13:45</span>
        </div>
      </div>
    </div>
  );
}

function Keyboard({ rows }: { rows: { id: string; text: string; onClick: () => void }[][] }) {
  return (
    <div className="tg-inline-keyboard">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="tg-kb-row">
          {row.map(button => (
            <button key={button.id} className="tg-kb-btn" type="button" onClick={button.onClick}>
              {button.text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function TelegramBotPage() {
  const { user, logout, rememberUser } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [city, setCity] = useState(service.getCities()[0] ?? 'Київ');
  const [type, setType] = useState<TrainingType | null>(null);
  const [gymId, setGymId] = useState<number | null>(null);
  const [date, setDate] = useState(DEMO_TODAY);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const selectedGym = gymId ? service.getGym(gymId) : null;
  const selectedTraining = selectedTrainingId ? service.getTraining(selectedTrainingId) : null;

  const gyms = useMemo(() => {
    if (!type) return [];
    return service.getGymsByCity(city).filter(g =>
      service.searchTrainings({ city, gymId: g.id, type, onlyAvailable: true }).length > 0,
    );
  }, [city, type]);

  const slots = useMemo(() => {
    if (!type || !gymId) return [];
    return service.searchTrainings({ city, type, gymId, date, onlyAvailable: true })
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [city, date, gymId, type]);

  const startBooking = (training: Training) => {
    setSelectedTrainingId(training.id);
    setNotice('');
    setStep(user?.phone ? 'details' : 'register');
  };

  const completeRegistration = () => {
    if (!selectedTraining) return;
    const registered = service.ensureUser(guestName, guestPhone);
    if (!registered) {
      setNotice('❌ Введіть імʼя та телефон у форматі +380XXXXXXXXX');
      return;
    }
    rememberUser(registered);
    setStep('details');
    setNotice('✅ Дані збережено. Можна підтвердити запис.');
  };

  const confirmBooking = () => {
    if (!selectedTraining || !user) return;
    const result = service.bookWorkout(user.id, selectedTraining.id, true, true);
    setNotice(result.message);
    setStep(result.success ? 'done' : 'details');
  };

  const resetSearch = () => {
    setStep('types');
    setType(null);
    setGymId(null);
    setSelectedTrainingId(null);
    setNotice('');
  };

  const cities = service.getCities();
  const dates = [0, 1, 2, 3, 4, 5, 6].map(nextDate);

  return (
    <div className="tg-app">
      <header className="tg-header">
        <div className="tg-header-avatar">BF</div>
        <div className="tg-header-info">
          <strong>BeFitNow Bot</strong>
          <span>{user ? `${user.name} · ${user.phone}` : 'перегляд без реєстрації'}</span>
        </div>
        <button className="tg-header-btn" aria-label="Пошук" type="button"><Search size={20} /></button>
        {user && (
          <div className="tg-header-menu-wrap">
            <button className="tg-header-btn" aria-label="Меню" type="button" onClick={() => setMenuOpen(v => !v)}>
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="tg-header-dropdown">
                <button type="button" onClick={logout}><LogOut size={16} /> Вийти</button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="tg-chat">
        <div className="tg-date-pill">сьогодні</div>

        {step === 'welcome' && (
          <Message>
            <strong>👋 BeFitNow Bot</strong>
            {'\n\n'}Привіт!
            {'\n\n'}Дивіться клуби та тренування <strong>без реєстрації</strong>.
            <Keyboard rows={[[{ id: 'start', text: '▶️ Почати', onClick: () => setStep('location') }]]} />
          </Message>
        )}

        {step === 'location' && (
          <Message>
            <strong>📍 Оберіть місто</strong>
            {'\n\n'}Без реєстрації — одразу переглядайте клуби та тренування.
            <Keyboard rows={cities.map(item => ([{
              id: item,
              text: item === city ? `${item} ✓` : item,
              onClick: () => { setCity(item); setStep('types'); },
            }]))} />
          </Message>
        )}

        {step === 'types' && (
          <Message>
            <strong>🏋️ Оберіть тип тренування</strong>
            {'\n'}📍 {city}
            <Keyboard rows={WORKOUT_TYPES.map(item => ([{
              id: item,
              text: TRAINING_TYPE_LABELS[item],
              onClick: () => { setType(item); setStep('gyms'); },
            }]))} />
          </Message>
        )}

        {step === 'gyms' && type && (
          <Message>
            <strong>🏢 Оберіть клуб</strong>
            {'\n'}{TRAINING_TYPE_LABELS[type]} · {city}
            <Keyboard rows={[
              ...gyms.map(g => ([{
                id: `${g.id}`,
                text: `${g.name} (${service.searchTrainings({ city, gymId: g.id, type, onlyAvailable: true }).length})`,
                onClick: () => { setGymId(g.id); setStep('dates'); },
              }])),
              [{ id: 'type-back', text: '◀️ Змінити тип', onClick: () => setStep('types') }],
            ]} />
          </Message>
        )}

        {step === 'dates' && type && selectedGym && (
          <Message>
            <strong>📅 Оберіть дату</strong>
            {'\n'}{TRAINING_TYPE_LABELS[type]} · {selectedGym.name}
            <Keyboard rows={[
              ...dates.map(item => ([{
                id: item,
                text: item === DEMO_TODAY ? `Сьогодні (${dateLabel(item)})` : dateLabel(item),
                onClick: () => { setDate(item); setStep('slots'); },
              }])),
              [{ id: 'gym-back', text: '◀️ Змінити клуб', onClick: () => setStep('gyms') }],
            ]} />
          </Message>
        )}

        {step === 'slots' && (
          <Message>
            <strong>✅ Доступні слоти</strong>
            {'\n'}{dateLabel(date)} · {slots.length} слотів
            {slots.length === 0 && '\n\nНемає вільних слотів. Спробуйте іншу дату або клуб.'}
            <Keyboard rows={[
              ...slots.slice(0, 8).map(t => ([{
                id: `${t.id}`,
                text: `${timeLabel(t.dateTime)} ${t.title} · ${service.freeSpots(t)}/${t.maxParticipants} · ${t.price} грн`,
                onClick: () => startBooking(t),
              }])),
              [{ id: 'date-back', text: '◀️ Інша дата', onClick: () => setStep('dates') }],
            ]} />
          </Message>
        )}

        {step === 'register' && selectedTraining && (
          <Message>
            <strong>📝 Enter details</strong>
            {'\n'}Для запису введіть імʼя та телефон.
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <input className="tg-input" placeholder="Імʼя або alias" value={guestName} onChange={e => setGuestName(e.target.value)} />
              <input className="tg-input" placeholder="+380XXXXXXXXX" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
              <button className="tg-kb-btn" type="button" onClick={completeRegistration}>Продовжити</button>
            </div>
          </Message>
        )}

        {(step === 'details' || step === 'done') && selectedTraining && (
          <Message>
            <strong>📋 {selectedTraining.title}</strong>
            {'\n'}📅 {selectedTraining.dateTime}
            {'\n'}👤 {selectedTraining.trainer}
            {'\n'}📍 {service.getGym(selectedTraining.gymId)?.name}
            {'\n'}👥 {service.freeSpots(selectedTraining)}/{selectedTraining.maxParticipants}
            {'\n'}💰 {selectedTraining.price} грн
            {'\n\n'}{selectedTraining.description}
            {notice && `\n\n${notice}`}
            <Keyboard rows={[
              ...(step === 'details' ? [[{ id: 'confirm', text: '✅ Підтвердити запис', onClick: confirmBooking }]] : []),
              [{ id: 'new', text: '🗓 Новий пошук', onClick: resetSearch }],
            ]} />
          </Message>
        )}
      </div>

      <div className="tg-input-bar">
        <input className="tg-input" placeholder="Повідомлення" readOnly />
        <button className="tg-send-btn" aria-label="Надіслати" type="button"><Send size={18} /></button>
      </div>
    </div>
  );
}
