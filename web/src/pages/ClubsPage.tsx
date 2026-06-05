import { MapPin, Star } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { service } from '../services/beFitNowService';

export function ClubsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const clubs = search ? service.searchGyms(search) : service.getGyms();

  return (
    <div className="app-shell">
      <div className="page">
        <button className="btn btn-ghost" style={{ paddingLeft: 0 }} onClick={() => navigate('/app')}>← Назад</button>
        <h1 className="page-title">Клуби</h1>
        <p className="page-subtitle">Знайдіть зал за локацією</p>
        <input className="input" placeholder="Пошук клубу..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />

        {clubs.map(gym => {
          const rating = service.getAverageRating('Gym', gym.id);
          const slots = service.searchTrainings({ gymId: gym.id, onlyAvailable: true }).length;
          return (
            <div className="card" key={gym.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/app?gym=${gym.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'var(--font-display)' }}>{gym.name}</h3>
                {rating > 0 && <span className="rating"><Star size={14} fill="#fbbf24" /> {rating.toFixed(1)}</span>}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
                <MapPin size={14} style={{ verticalAlign: -2 }} /> {gym.address}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>{gym.description}</p>
              <span className="badge badge-green" style={{ marginTop: '0.5rem' }}>{slots} вільних слотів</span>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
