import { useState } from 'react';
import { Headphones, HelpCircle, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { service } from '../services/beFitNowService';

export function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faq = search ? service.searchFaq(search) : service.getFaq();

  const contact = () => {
    if (!user || !message) return;
    setToast(service.submitSupport(user.name, user.email, subject, message));
    setSubject(''); setMessage('');
  };

  const escalate = () => {
    if (!user || !message) return;
    setToast(service.escalateToHuman(user.name, user.email, message));
    setMessage('');
  };

  return (
    <div className="app-shell">
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      <div className="page">
        <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }} onClick={() => navigate('/app/profile')}>← Назад</button>
        <h1 className="page-title">Підтримка</h1>
        <p className="page-subtitle">FAQ та зв'язок з командою</p>

        <input className="input" placeholder="Пошук у FAQ..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem' }} />

        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <HelpCircle size={18} color="var(--primary)" /> FAQ
          </h3>
          {faq.map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '0.65rem 0' }}>
              <button className="btn btn-ghost" style={{ width: '100%', textAlign: 'left', padding: 0, fontWeight: 600, fontSize: '0.9rem' }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {f.question}
              </button>
              {openFaq === i && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>{f.answer}</p>}
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Headphones size={18} color="var(--primary)" /> Зв'язатися
          </h3>
          <input className="input" placeholder="Тема" value={subject} onChange={e => setSubject(e.target.value)} style={{ marginBottom: '0.5rem' }} />
          <textarea className="input" placeholder="Повідомлення..." rows={3} value={message} onChange={e => setMessage(e.target.value)} style={{ resize: 'vertical' }} />
          <button className="btn btn-primary btn-block" style={{ marginTop: '0.75rem' }} onClick={contact} disabled={!message}>
            Надіслати
          </button>
        </div>

        <div className="card" style={{ borderColor: 'rgba(249, 115, 22, 0.3)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={18} color="var(--accent)" /> Передати співробітнику
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Для складних або нестандартних запитів
          </p>
          <button className="btn btn-secondary btn-block" onClick={escalate} disabled={!message}>
            Потрібен менеджер
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
