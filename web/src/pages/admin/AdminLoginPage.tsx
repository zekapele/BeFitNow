import { Shield } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@befitnow.com' && password === 'admin') {
      sessionStorage.setItem('befitnow_admin', email);
      navigate('/admin/dashboard');
    } else {
      setError('Невірні дані адміністратора');
    }
  };

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingTop: '2rem' }}>
        <Link to="/" className="btn btn-ghost" style={{ paddingLeft: 0 }}>← На головну</Link>
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <Shield size={48} color="var(--accent)" />
          <h1 className="page-title" style={{ marginTop: '1rem' }}>Веб-панель</h1>
          <p className="page-subtitle">Керування розкладом та бронюваннями</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-group"><label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label>Пароль</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>Увійти</button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>demo: admin@befitnow.com / admin</p>
      </div>
    </div>
  );
}
