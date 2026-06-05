import { Dumbbell } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { service } from '../../services/beFitNowService';

export function TrainerLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trainer = service.trainerLogin(email, password);
    if (trainer) {
      sessionStorage.setItem('befitnow_trainer', JSON.stringify(trainer));
      navigate('/trainer/portal');
    } else setError('Невірні дані');
  };

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingTop: '2rem' }}>
        <Link to="/" className="btn btn-ghost" style={{ paddingLeft: 0 }}>← На головну</Link>
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <Dumbbell size={48} color="var(--primary)" />
          <h1 className="page-title" style={{ marginTop: '1rem' }}>Портал тренера</h1>
          <p className="page-subtitle">Розклад, учасники, нагадування</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-group"><label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Пароль</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Увійти</button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>demo: olena@fitzone.ua / trainer</p>
      </div>
    </div>
  );
}
