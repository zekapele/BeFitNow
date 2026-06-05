import { Award, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { service } from '../services/beFitNowService';

export function TrainersPage() {
  const navigate = useNavigate();
  const trainers = service.getTrainers();

  return (
    <div className="app-shell">
      <div className="page">
        <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }} onClick={() => navigate('/app')}>← Назад</button>
        <h1 className="page-title">Тренери</h1>
        <p className="page-subtitle">Кваліфікація та сертифікати</p>

        {trainers.map(t => {
          const trainings = service.searchTrainings({ trainer: t.name }).filter(x => service.freeSpots(x) > 0);
          return (
            <div className="card" key={t.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontFamily: 'var(--font-display)' }}>{t.name}</h3>
                {t.averageRating > 0 && (
                  <span className="rating"><Star size={16} fill="#fbbf24" /> {t.averageRating}</span>
                )}
              </div>
              {t.qualifications && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem' }}>{t.qualifications}</p>}
              {t.certificates.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Award size={14} color="var(--primary)" />
                  {t.certificates.map(c => <span key={c} className="badge badge-blue">{c}</span>)}
                </div>
              )}
              {trainings.length > 0 && (
                <button className="btn btn-primary btn-block" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
                  onClick={() => navigate(`/app/training/${trainings[0].id}`)}>
                  Записатися — {trainings[0].title}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
