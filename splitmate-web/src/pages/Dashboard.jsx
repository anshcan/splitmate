import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n));
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  ['#3B82F6', '#1D4ED8'],
  ['#8B5CF6', '#6D28D9'],
  ['#EC4899', '#BE185D'],
  ['#F59E0B', '#B45309'],
  ['#10B981', '#065F46'],
  ['#06B6D4', '#0E7490'],
];

function avatarGradient(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  const [a, b] = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#1E293B',
      border: '1px solid #263348',
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <div style={{
        fontSize: 11, color: '#475569', fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 800,
        color: color || '#F1F5F9',
        letterSpacing: '-0.03em', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: '#475569', marginTop: 5 }}>{sub}</div>
      )}
    </div>
  );
}

function PersonRow({ person, onClick }) {
  const owedToYou = person.net_balance > 0;
  const settled   = person.net_balance === 0;

  return (
    <button
      onClick={() => onClick(person)}
      style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid #1A2540',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1A2D4A'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: avatarGradient(person.name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {getInitials(person.name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person.name}
          </div>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>
            {person.account_count} {person.account_count === 1 ? 'account' : 'accounts'}
          </div>
        </div>

        {settled ? (
          <span style={{ fontSize: 11, color: '#475569', background: '#0F172A', borderRadius: 6, padding: '3px 8px' }}>
            Settled up
          </span>
        ) : (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: owedToYou ? '#22C55E' : '#F43F5E', letterSpacing: '-0.02em' }}>
              ₹{formatAmount(person.net_balance)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 500, color: owedToYou ? '#16A34A' : '#DC2626', marginTop: 1 }}>
              {owedToYou ? 'owes you' : 'you owe'}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

function AccountRow({ account, onClick }) {
  const isGroup = account.type === 'GROUP';
  return (
    <button
      onClick={() => onClick(account)}
      style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid #1A2540',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1A2D4A'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: isGroup ? '#1E2D4A' : '#2D1B3D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>
          {isGroup ? '👥' : '🤝'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {account.name}
          </div>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>
            {isGroup ? 'Group' : 'Personal'} · {account.member_count ?? '?'} members
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
          background: isGroup ? '#1E2D4A' : '#2D1B3D',
          color: isGroup ? '#818CF8' : '#C084FC',
          flexShrink: 0,
        }}>
          {isGroup ? 'Group' : 'Personal'}
        </span>
      </div>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1A2540' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#263348', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '40%', height: 12, background: '#263348', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ width: '25%', height: 9, background: '#1E293B', borderRadius: 4 }} />
      </div>
      <div style={{ width: 60, height: 14, background: '#263348', borderRadius: 4 }} />
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#1E293B',
      border: '1px solid #263348',
      borderRadius: 12,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, count, action, onAction }) {
  return (
    <div style={{
      padding: '11px 16px',
      borderBottom: '1px solid #263348',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </span>
        {count !== undefined && (
          <span style={{ fontSize: 10, color: '#334155' }}>{count}</span>
        )}
      </div>
      {action && (
        <button
          onClick={onAction}
          style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 11, fontWeight: 500, cursor: 'pointer', padding: 0 }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function EmptyCard({ icon, message }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#334155' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12 }}>{message}</div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  const [people,   setPeople]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, accRes] = await Promise.all([
        client.get('/dashboard'),
        client.get('/accounts/'),
      ]);

      setPeople(dashRes.data.data?.people || []);
      setAccounts(accRes.data.data?.accounts || []);
      setTimeline(dashRes.data.data?.recent_activity || []);
    } catch {
      setError('Could not load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  const totalOwed = people.filter(p => p.net_balance > 0).reduce((s, p) => s + p.net_balance, 0);
  const totalOwe  = people.filter(p => p.net_balance < 0).reduce((s, p) => s + Math.abs(p.net_balance), 0);
  const net       = totalOwed - totalOwe;

  const sortedPeople = [...people].sort((a, b) => {
    const aa = Math.abs(a.net_balance), bb = Math.abs(b.net_balance);
    if (aa === 0 && bb !== 0) return 1;
    if (bb === 0 && aa !== 0) return -1;
    return bb - aa;
  });

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 960, width: '100%' }}>

      {/* Page heading */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Dashboard
        </h1>
        <button
          onClick={() => navigate('/accounts/new')}
          style={{
            background: '#6366F1', border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 600, fontSize: 13,
            padding: '9px 18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> New account
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#450A0A', border: '1px solid #7F1D1D',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: 13, color: '#FCA5A5',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ background: '#1E293B', border: '1px solid #263348', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ width: '50%', height: 10, background: '#263348', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ width: '70%', height: 24, background: '#263348', borderRadius: 6 }} />
            </div>
          ))
        ) : (
          <>
            <MetricCard label="You are owed"  value={`₹${formatAmount(totalOwed)}`} sub={`across ${people.filter(p => p.net_balance > 0).length} people`} color="#22C55E" />
            <MetricCard label="You owe"       value={`₹${formatAmount(totalOwe)}`}  sub={`across ${people.filter(p => p.net_balance < 0).length} people`} color={totalOwe > 0 ? '#F43F5E' : '#475569'} />
            <MetricCard label="Net balance"   value={net === 0 ? 'All settled' : `${net > 0 ? '+' : '−'}₹${formatAmount(net)}`} sub={`${accounts.length} active accounts`} color={net > 0 ? '#22C55E' : net < 0 ? '#F43F5E' : '#475569'} />
          </>
        )}
      </div>

      {/* People + Accounts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card>
          <CardHeader title="People" count={!loading ? sortedPeople.length : undefined} action="View all" onAction={() => navigate('/people')} />
          {loading && [1,2,3,4].map(i => <SkeletonRow key={i} />)}
          {!loading && sortedPeople.length === 0 && <EmptyCard icon="🤝" message="No shared expenses yet" />}
          {!loading && sortedPeople.slice(0, 5).map(p => (
            <PersonRow key={p.user_id} person={p} onClick={() => navigate(`/ledger/${p.user_id}`)} />
          ))}
        </Card>

        <Card>
          <CardHeader title="Accounts" count={!loading ? accounts.length : undefined} action="View all" onAction={() => navigate('/accounts')} />
          {loading && [1,2,3,4].map(i => <SkeletonRow key={i} />)}
          {!loading && accounts.length === 0 && <EmptyCard icon="📂" message="No accounts yet" />}
          {!loading && accounts.slice(0, 5).map(a => (
            <AccountRow key={a.id} account={a} onClick={() => navigate(`/accounts/${a.id}`)} />
          ))}
        </Card>
      </div>

      {/* Recent activity */}
      {!loading && timeline.length > 0 && (
        <Card>
          <CardHeader title="Recent activity" />
          {timeline.slice(0, 6).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid #1A2540' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: item.type === 'settlement' ? '#14532D' : '#1E2D4A',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              }}>
                {item.type === 'settlement' ? '✓' : '₹'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.4 }}>{item.description}</div>
                <div style={{ fontSize: 10, color: '#334155', marginTop: 3 }}>{item.time_ago}</div>
              </div>
              {item.amount_effect !== undefined && (
                <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 3, color: item.amount_effect > 0 ? '#22C55E' : '#F43F5E' }}>
                  {item.amount_effect > 0 ? '+' : '−'}₹{formatAmount(item.amount_effect)}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
