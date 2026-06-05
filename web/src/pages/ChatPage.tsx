import { useRef, useState } from 'react';
import { Bot, Send, UserRound } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { service } from '../services/beFitNowService';

interface Message { role: 'user' | 'bot'; text: string; }

const SUGGESTIONS = ['знайти йогу завтра вечером', 'записатися на 2', 'рекомендація для початківців', 'потрібен співробітник'];

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Привіт! Я чатбот BeFitNow. Допоможу знайти тренування, записатися, скасувати або перенести запис. Напишіть «допомога».' },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setTimeout(() => {
      const reply = service.processAI(user.id, text);
      setMessages(m => [...m, { role: 'bot', text: reply }]);
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  return (
    <div className="app-shell">
      <div className="page" style={{ display: 'flex', flexDirection: 'column', paddingBottom: '5rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={28} color="var(--primary)" /> AI-помічник
        </h1>
        <p className="page-subtitle">Альтернатива класичному UI — запитуйте природною мовою</p>

        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.role === 'bot' && <Bot size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />}
              {m.role === 'user' && <UserRound size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />}
              {m.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <input className="input" placeholder="Напишіть повідомлення..." value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)} />
          <button className="btn btn-primary" style={{ padding: '0.85rem' }} onClick={() => send(input)}>
            <Send size={20} />
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
