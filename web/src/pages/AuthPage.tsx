import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props { mode: 'login' | 'register'; }

export function AuthPage({ mode }: Props) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = mode === 'login'
      ? login(email, password)
      : register(name, email, password, phone);
    if (ok) navigate('/app');
    else setError(mode === 'login' ? 'Невірний email або пароль' : 'Помилка реєстрації');
  };

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingTop: '2rem' }}>
        <Link to="/" className="btn btn-ghost" style={{ marginBottom: '1rem', paddingLeft: 0 }}>← Назад</Link>
        <h1 className="page-title">{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h1>
        <p className="page-subtitle">
          {mode === 'login' ? 'Ласкаво просимо назад!' : 'Створіть акаунт за хвилину'}
        </p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Ім'я</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label>Телефон</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." />
            </div>
          )}
          <div className="form-group">
            <label>Пароль</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }}>
            {mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {mode === 'login' ? (
            <>Немає акаунту? <Link to="/register" style={{ color: 'var(--primary)' }}>Реєстрація</Link></>
          ) : (
            <>Вже є акаунт? <Link to="/login" style={{ color: 'var(--primary)' }}>Увійти</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
