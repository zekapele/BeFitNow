import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { service } from '../../services/beFitNowService';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = service.staffLogin(email, password);
    if (session) {
      sessionStorage.setItem('befitnow_staff', JSON.stringify(session));
      navigate('/portal/dashboard');
    } else {
      setError('Невірний email або пароль');
    }
  };

  return (
    <div className="portal-login-page">
      <div className="portal-login-card">
        <div className="portal-login-brand">
          <CalendarDays size={40} color="var(--accent)" />
          <h1>BeFitNow Portal</h1>
          <p>Календар та записи клієнтів для персоналу клубу</p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>
            Увійти
          </button>
        </form>

        <div className="portal-demo-hints">
          <p><strong>Адмін:</strong> admin@befitnow.com / admin</p>
          <p><strong>Тренер:</strong> olena@fitzone.ua / trainer</p>
        </div>

        <p className="portal-client-link">
          Ви клієнт? <a href="/">Перейти до застосунку</a>
        </p>
      </div>
    </div>
  );
}
