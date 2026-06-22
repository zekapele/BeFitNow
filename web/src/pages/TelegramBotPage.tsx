import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, MoreVertical, Search, Send } from 'lucide-react';
import {
  GEO_ACTIONS,
  PAYMENT_ACTIONS_PREFIX,
  REPLY_KEYBOARD,
  getDiscoverWelcome,
  getGymRouteUrl,
  handleBotAction,
  handleBotText,
  handleNearbyLocation,
  initialDiscoverContext,
  type BotContext,
  type BotReply,
  type TgButton,
} from '../bot/telegramBotFlow';
import { useAuth } from '../context/AuthContext';

interface ChatMessage extends BotReply {
  id: number;
  role: 'bot' | 'user';
  time: string;
}

function nowTime() {
  return new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function formatText(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/&lt;b&gt;/g, '<b>')
    .replace(/&lt;\/b&gt;/g, '</b>')
    .replace(/\n/g, '<br />');
}

function Keyboard({ rows, onAction }: { rows?: TgButton[][]; onAction: (button: TgButton) => void }) {
  if (!rows?.length) return null;

  return (
    <div className="tg-inline-keyboard">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="tg-kb-row">
          {row.map(button => (
            <button key={button.id} className="tg-kb-btn" type="button" onClick={() => onAction(button)}>
              {button.text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Message({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction: (button: TgButton) => void;
}) {
  return (
    <div className={`tg-msg-row ${message.role}`}>
      {message.role === 'bot' && <div className="tg-avatar">BF</div>}
      <div className="tg-msg-col">
        <div className={`tg-bubble ${message.role}`}>
          <div
            className="tg-bubble-text"
            dangerouslySetInnerHTML={{ __html: formatText(message.text) }}
          />
          <span className="tg-bubble-time">{message.time}</span>
        </div>
        {message.role === 'bot' && <Keyboard rows={message.buttons} onAction={onAction} />}
      </div>
    </div>
  );
}

function ReplyKeyboard({ onAction }: { onAction: (button: TgButton) => void }) {
  return (
    <div className="tg-reply-keyboard">
      {REPLY_KEYBOARD.map(button => (
        <button key={button.id} className="tg-reply-btn" type="button" onClick={() => onAction(button)}>
          {button.text}
        </button>
      ))}
    </div>
  );
}

export function TelegramBotPage() {
  const { user, logout, rememberUser } = useAuth();
  const [ctx, setCtx] = useState<BotContext>(() => initialDiscoverContext());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcome = getDiscoverWelcome();
    return [{ id: 1, role: 'bot', time: nowTime(), ...welcome }];
  });
  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const nextId = useRef(2);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const actor = useMemo(() => ({
    id: user?.id ?? 0,
    name: user?.name ?? 'Гість',
    email: user?.email ?? 'guest@befitnow.local',
  }), [user]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const pushBotReplies = (replies: BotReply[]) => {
    const time = nowTime();
    setMessages(prev => [
      ...prev,
      ...replies
        .filter(reply => reply.text || reply.buttons?.length)
        .map(reply => ({ id: nextId.current++, role: 'bot' as const, time, ...reply })),
    ]);
    replies.forEach(reply => {
      if (reply.openUrl) window.open(reply.openUrl, '_blank', 'noopener,noreferrer');
    });
  };

  const pushUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: nextId.current++, role: 'user', time: nowTime(), text }]);
  };

  const runAction = (actionId: string, nextCtx = ctx, nextActor = actor) => {
    const result = handleBotAction(actionId, nextActor.id, nextActor.name, nextActor.email, nextCtx);
    setCtx(result.ctx);
    pushBotReplies(result.replies);
  };

  const handleGeoAction = () => {
    if (!navigator.geolocation) {
      pushBotReplies([{ text: '❌ Геолокація недоступна в цьому браузері.' }]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const result = handleNearbyLocation(position.coords.latitude, position.coords.longitude, ctx);
        setCtx(result.ctx);
        pushBotReplies(result.replies);
      },
      () => pushBotReplies([{ text: '❌ Не вдалося отримати геолокацію. Оберіть місто вручну.' }]),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleAction = (button: TgButton) => {
    pushUserMessage(button.text);

    if (button.id === 'auth_logout') {
      logout();
    }

    if (GEO_ACTIONS.has(button.id)) {
      handleGeoAction();
      return;
    }

    if (button.id.startsWith('route_gym_')) {
      const url = getGymRouteUrl(Number(button.id.slice(10)));
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (button.id.startsWith(PAYMENT_ACTIONS_PREFIX)) {
      // The flow also returns openUrl after booking; this keeps the UI close to Telegram's button behaviour.
      runAction(button.id);
      return;
    }

    runAction(button.id);
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    pushUserMessage(text);

    const result = handleBotText(text, actor.id, actor.name, actor.email, ctx);
    if (result.user) rememberUser(result.user);

    setCtx(result.ctx);
    pushBotReplies([result.reply]);

    if (result.resumeActionId && result.user) {
      const resumed = handleBotAction(
        result.resumeActionId,
        result.user.id,
        result.user.name,
        result.user.email,
        result.ctx,
      );
      setCtx(resumed.ctx);
      pushBotReplies(resumed.replies);
    }
  };

  return (
    <div className="tg-app">
      <header className="tg-header">
        <div className="tg-header-avatar">BF</div>
        <div className="tg-header-info">
          <strong>BeFitNow Bot</strong>
          <span>{user ? `${user.name} · ${user.phone}` : 'перегляд без реєстрації'}</span>
        </div>
        <button className="tg-header-btn" aria-label="Пошук" type="button" onClick={() => runAction('menu_discover')}>
          <Search size={20} />
        </button>
        {user && (
          <div className="tg-header-menu-wrap">
            <button className="tg-header-btn" aria-label="Меню" type="button" onClick={() => setMenuOpen(v => !v)}>
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="tg-header-dropdown">
                <button type="button" onClick={logout}><LogOut size={16} /> Вийти</button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="tg-chat" ref={chatRef}>
        <div className="tg-date-pill">сьогодні</div>
        {messages.map(message => (
          <Message key={message.id} message={message} onAction={handleAction} />
        ))}
      </div>

      <ReplyKeyboard onAction={handleAction} />

      <div className="tg-input-bar">
        <input
          className="tg-input"
          placeholder="Повідомлення"
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') handleSubmit();
          }}
        />
        <button className="tg-send-btn" aria-label="Надіслати" type="button" onClick={handleSubmit}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
