import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function getInitials(name = '') {
  return name.slice(0, 2).toUpperCase();
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/people',    label: 'People',    icon: '◎' },
  { to: '/accounts',  label: 'Accounts',  icon: '▤' },
  { to: '/expenses',  label: 'Expenses',  icon: '▧' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0F1729',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#F1F5F9',
    }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        background: '#0A1020',
        borderRight: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid #1E293B',
        }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: 8,
            background: '#6366F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>₹</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
            SplitMate
          </span>
        </div>

        {/* Main nav */}
        <nav style={{ padding: '14px 10px 0', flex: 1 }}>
          <div style={{
            fontSize: 10, color: '#334155', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0 8px 8px',
          }}>
            Main
          </div>

          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? '#818CF8' : '#64748B',
                background: isActive ? '#1E2D4A' : 'transparent',
                transition: 'all 0.12s',
              })}
            >
              <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User row */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid #1E293B',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {getInitials(user?.username)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#CBD5E1',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.username || 'You'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              style={{
                background: 'none', border: 'none',
                color: '#475569', cursor: 'pointer',
                fontSize: 16, padding: '2px 4px',
                borderRadius: 4, lineHeight: 1,
              }}
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main style={{
        marginLeft: 220,
        flex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  );
}

