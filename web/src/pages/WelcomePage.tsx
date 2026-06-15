import { Bot, CalendarCheck, Smartphone, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function WelcomePage() {
  return (
    <div className="app-shell">
      <div className="hero">
        <div className="hero-logo">BeFitNow</div>
        <p className="hero-tagline">
          Знайдіть і запишіться на тренування<br />за кілька кліків. Без дзвінків менеджеру.
        </p>
      </div>

      <div style={{ padding: '0 1.25rem 2rem' }}>
        <div className="feature-grid">
          <div className="feature-tile"><Zap size={28} /><strong>Швидко</strong><span>Миттєве підтвердження</span></div>
          <div className="feature-tile"><Bot size={28} /><strong>AI-чатбот</strong><span>Або класичний UI</span></div>
          <div className="feature-tile"><CalendarCheck size={28} /><strong>Self-service</strong><span>Запис 24/7</span></div>
          <div className="feature-tile"><Smartphone size={28} /><strong>Mobile-first</strong><span>Зручно на телефоні</span></div>
        </div>

        <Link to="/login" className="btn btn-primary btn-block">Увійти</Link>
        <Link to="/register" className="btn btn-secondary btn-block" style={{ marginTop: '0.75rem' }}>Створити акаунт</Link>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1.25rem' }}>
          Демо: +380501112233 · код 1234
        </p>
      </div>
    </div>
  );
}
