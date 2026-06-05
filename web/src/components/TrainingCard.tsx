import { Clock, MapPin, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Training } from '../types';
import { TRAINING_TYPE_LABELS } from '../types';
import { service } from '../services/beFitNowService';

interface Props {
  training: Training;
}

export function TrainingCard({ training }: Props) {
  const navigate = useNavigate();
  const gym = service.getGym(training.gymId);
  const free = service.freeSpots(training);
  const pct = ((training.maxParticipants - free) / training.maxParticipants) * 100;
  const rating = service.getAverageRating('Training', training.id, training.title);
  const trainer = service.getTrainerProfile(training.trainer);

  return (
    <div className="card training-card" onClick={() => navigate(`/app/training/${training.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="badge badge-green">{TRAINING_TYPE_LABELS[training.type]}</span>
          <h3 style={{ marginTop: '0.5rem' }}>{training.title}</h3>
        </div>
        {free > 0 ? (
          <span className="badge badge-green">{free} місць</span>
        ) : (
          <span className="badge badge-orange">Заповнено</span>
        )}
      </div>
      <div className="training-meta">
        <span><Clock size={14} style={{ verticalAlign: -2 }} /> {training.dateTime}</span>
        <span><Users size={14} style={{ verticalAlign: -2 }} /> {training.trainer}</span>
        {trainer && trainer.averageRating > 0 && (
          <span className="rating"><Star size={14} fill="#fbbf24" stroke="#fbbf24" style={{ verticalAlign: -2 }} /> {trainer.averageRating}</span>
        )}
        {rating > 0 && <span className="rating">★ {rating.toFixed(1)}</span>}
      </div>
      {gym && (
        <div className="training-meta">
          <span><MapPin size={14} style={{ verticalAlign: -2 }} /> {gym.name}</span>
        </div>
      )}
      <div className="spots-bar">
        <div className="spots-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
