import { useLocation } from 'react-router-dom';

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isPortal = pathname.startsWith('/portal');

  if (isPortal) return <>{children}</>;

  const now = new Date();
  const time = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="device-stage">
      <div className="device-frame">
        <div className="device-status-bar">
          <span className="device-time">{time}</span>
          <div className="device-notch" aria-hidden />
          <div className="device-status-icons" aria-hidden>
            <span className="device-signal" />
            <span className="device-wifi" />
            <span className="device-battery" />
          </div>
        </div>
        <div className="device-screen">
          {children}
        </div>
        <div className="device-home-indicator" aria-hidden />
      </div>
      <p className="device-caption">BeFitNow · Клієнтський застосунок</p>
    </div>
  );
}
