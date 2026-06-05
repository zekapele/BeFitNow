import { useState } from 'react';
import { Award, Calendar, CheckCircle, Clock, MapPin, Star, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { service } from '../services/beFitNowService';
import { TRAINING_TYPE_LABELS } from '../types';

export function TrainingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const training = service.getTraining(Number(id));
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  if (!training || !user) return null;

  const gym = service.getGym(training.gymId);
  const trainer = service.getTrainerProfile(training.trainer);
  const free = service.freeSpots(training);
  const gymRating = service.getAverageRating('Gym', training.gymId);
  const reviews = service.getGymReviews(training.gymId);
  const alts = free === 0 ? service.findAlternatives(training.id) : [];

  const book = () => {
    const r = service.bookWorkout(user.id, training.id);
    if (r.success && r.bookingId) {
      setConfirmed(r.bookingId);
      setToast({ msg: r.message, type: 'success' });
    } else {
      setToast({ msg: r.message, type: 'error' });
    }
  };

  if (confirmed) {
    return (
      <div className="app-shell">
        <div className="page">
          <div className="card confirmation-box">
            <CheckCircle size={48} color="var(--primary)" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Миттєве підтвердження</p>
            <div className="confirmation-code">BFN-{confirmed}</div>
            <p><strong>{training.title}</strong></p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{training.dateTime}</p>
            {gym && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{gym.name}, {gym.address}</p>}
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} onClick={() => navigate('/app/bookings')}>
            Мої записи
          </button>
          <button className="btn btn-secondary btn-block" style={{ marginTop: '0.5rem' }} onClick={() => navigate('/app')}>
            На головну
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page">
        <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }} onClick={() => navigate(-1)}>← Назад</button>

        <span className="badge badge-green">{TRAINING_TYPE_LABELS[training.type]}</span>
        <h1 className="page-title" style={{ marginTop: '0.5rem' }}>{training.title}</h1>
        <p className="page-subtitle">{training.description}</p>

        <div className="card">
          <div className="training-meta" style={{ flexDirection: 'column', gap: '0.6rem' }}>
            <span><Calendar size={16} style={{ verticalAlign: -3 }} /> {training.dateTime}</span>
            <span><Clock size={16} style={{ verticalAlign: -3 }} /> {training.durationMinutes} хв</span>
            <span><Users size={16} style={{ verticalAlign: -3 }} /> {training.trainer}
              {trainer && <span className="rating" style={{ marginLeft: 8 }}><Star size={14} fill="#fbbf24" /> {trainer.averageRating}</span>}
            </span>
            {gym && <span><MapPin size={16} style={{ verticalAlign: -3 }} /> {gym.name} — {gym.address}
              {gymRating > 0 && <span className="rating" style={{ marginLeft: 8 }}>★ {gymRating.toFixed(1)}</span>}
            </span>}
          </div>
          <div className="spots-bar" style={{ marginTop: '1rem' }}>
            <div className="spots-fill" style={{ width: `${((training.maxParticipants - free) / training.maxParticipants) * 100}%` }} />
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {free > 0 ? `${free} вільних місць` : 'Заповнено'}
          </p>
        </div>

        {trainer && (
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={18} color="var(--primary)" /> Тренер
            </h3>
            <p style={{ fontSize: '0.9rem' }}>{trainer.qualifications}</p>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {trainer.certificates.map(c => <span key={c} className="badge badge-blue">{c}</span>)}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Відгуки про клуб</h3>
            {reviews.slice(0, 3).map(r => (
              <div key={r.id} style={{ marginBottom: '0.65rem', fontSize: '0.88rem' }}>
                <span className="rating">★ {r.rating}</span> <strong>{r.authorName}</strong>
                <p style={{ color: 'var(--text-muted)', marginTop: 2 }}>{r.comment}</p>
              </div>
            ))}
          </div>
        )}

        {alts.length > 0 && (
          <div className="card" style={{ borderColor: 'rgba(249, 115, 22, 0.3)' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Альтернативи</h3>
            {alts.map(a => (
              <button key={a.id} className="btn btn-secondary btn-block" style={{ marginBottom: '0.4rem', justifyContent: 'flex-start' }}
                onClick={() => navigate(`/app/training/${a.id}`)}>
                {a.title} — {a.dateTime}
              </button>
            ))}
          </div>
        )}

        {free > 0 ? (
          <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} onClick={book}>
            Записатися
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
            Оберіть альтернативу вище
          </p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
