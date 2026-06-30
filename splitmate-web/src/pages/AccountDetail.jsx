import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n));
}

function getInitials(name = '') {
  return name.slice(0, 2).toUpperCase();
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

function formatDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
        {count !== undefined && <span style={{ fontSize: 10, color: '#334155' }}>{count}</span>}
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

function MemberRow({ member }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      borderBottom: '1px solid #1A2540',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: avatarGradient(member.username),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {getInitials(member.username)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {member.username}
        </div>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>{member.email}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
        background: member.role === 'owner' ? '#1E2D4A' : '#1A2540',
        color: member.role === 'owner' ? '#818CF8' : '#64748B',
        textTransform: 'capitalize',
        flexShrink: 0,
      }}>
        {member.role}
      </span>
    </div>
  );
}

function BalanceRow({ person }) {
  const owedToYou = person.balance > 0;
  const settled = person.balance === 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      borderBottom: '1px solid #1A2540',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: avatarGradient(person.username),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {getInitials(person.username)}
      </div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
        {person.username}
      </div>
      {settled ? (
        <span style={{ fontSize: 11, color: '#475569', background: '#0F172A', borderRadius: 6, padding: '3px 8px' }}>
          Settled up
        </span>
      ) : (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: owedToYou ? '#22C55E' : '#F43F5E' }}>
            ₹{formatAmount(person.balance)}
          </div>
          <div style={{ fontSize: 10, fontWeight: 500, color: owedToYou ? '#16A34A' : '#DC2626' }}>
            {owedToYou ? 'owes you' : 'you owe'}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineRow({ entry }) {
  const isSettlement = entry.type === 'settlement';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 16px',
      borderBottom: '1px solid #1A2540',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: isSettlement ? '#14532D' : '#1E2D4A',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
      }}>
        {isSettlement ? '✓' : '₹'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.4 }}>
          {entry.summary}
        </div>
        <div style={{ fontSize: 10, color: '#334155', marginTop: 3 }}>
          {formatDate(entry.date)}
          {entry.type === 'expense' && entry.data?.expense?.category && (
            <> · {entry.data.expense.category}</>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1A2540' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#263348', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '40%', height: 12, background: '#263348', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ width: '25%', height: 9, background: '#1E293B', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function EmptyCard({ icon, message }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: '#334155' }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12 }}>{message}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [details, setDetails]   = useState(null);   // from GET /accounts/:id
  const [balances, setBalances] = useState([]);      // from GET /accounts/:id/expenses/balances
  const [timeline, setTimeline] = useState([]);       // from GET /accounts/:id/timeline
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const [detailsRes, balancesRes, timelineRes] = await Promise.all([
        client.get(`/accounts/${id}`),
        client.get(`/accounts/${id}/expenses/balances`),
        client.get(`/accounts/${id}/timeline`),
      ]);

      setDetails(detailsRes.data.data);
      setBalances(balancesRes.data.data || []);
      setTimeline(timelineRes.data.data?.timeline || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Could not load this account. Is the backend running?'
      );
    } finally {
      setLoading(false);
    }
  }

  function copyInviteCode() {
    if (!details?.account?.invite_code) return;
    navigator.clipboard.writeText(details.account.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isGroup = details?.account?.type === 'GROUP';
  const yourBalance = details?.your_balance ?? 0;

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 960, width: '100%' }}>

      {/* Back link */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: 'none', border: 'none', color: '#64748B',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        ← Back to dashboard
      </button>

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

      {/* Header */}
      {loading ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 200, height: 28, background: '#263348', borderRadius: 6, marginBottom: 10 }} />
          <div style={{ width: 140, height: 14, background: '#1E293B', borderRadius: 4 }} />
        </div>
      ) : details && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: isGroup ? '#1E2D4A' : '#2D1B3D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>
              {isGroup ? '👥' : '🤝'}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                {details.account.name}
              </h1>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{isGroup ? 'Group' : 'Personal'} · {details.members.length} members · {details.expense_count} expenses</span>
                {isGroup && details.account.invite_code && (
                  <button
                    onClick={copyInviteCode}
                    style={{
                      background: '#1E293B', border: '1px solid #334155',
                      borderRadius: 6, color: '#94A3B8', fontSize: 11,
                      padding: '2px 8px', cursor: 'pointer', fontFamily: 'monospace',
                    }}
                  >
                    {copied ? '✓ Copied' : `Invite: ${details.account.invite_code}`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(`/accounts/${id}/settle`)}
              style={{
                background: '#1E293B', border: '1px solid #334155', borderRadius: 10,
                color: '#E2E8F0', fontWeight: 600, fontSize: 13,
                padding: '9px 16px', cursor: 'pointer',
              }}
            >
              Settle up
            </button>
            <button
              onClick={() => navigate(`/accounts/${id}/expenses/new`)}
              style={{
                background: '#6366F1', border: 'none', borderRadius: 10,
                color: '#fff', fontWeight: 600, fontSize: 13,
                padding: '9px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add expense
            </button>
          </div>
        </div>
      )}

      {/* Your balance banner */}
      {!loading && details && (
        <div style={{
          background: yourBalance === 0 ? '#1E293B' : yourBalance > 0
            ? 'linear-gradient(135deg, #14532D 0%, #166534 100%)'
            : 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
          border: `1px solid ${yourBalance === 0 ? '#334155' : yourBalance > 0 ? '#166534' : '#991B1B'}`,
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>
            Your balance in this account
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: yourBalance === 0 ? '#64748B' : '#fff', letterSpacing: '-0.02em' }}>
            {yourBalance === 0 ? 'All settled' : `${yourBalance > 0 ? '+' : '−'}₹${formatAmount(yourBalance)}`}
          </div>
        </div>
      )}

      {/* Two-column grid: Members + Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card>
          <CardHeader title="Members" count={!loading ? details?.members.length : undefined} />
          {loading && [1, 2, 3].map(i => <SkeletonRow key={i} />)}
          {!loading && details?.members.map(m => (
            <MemberRow key={m.user_id} member={m} />
          ))}
        </Card>

        <Card>
          <CardHeader title="Balances" count={!loading ? balances.length : undefined} />
          {loading && [1, 2, 3].map(i => <SkeletonRow key={i} />)}
          {!loading && balances.length === 0 && (
            <EmptyCard icon="🎉" message="No balances — everything's settled" />
          )}
          {!loading && balances.map(b => (
            <BalanceRow key={b.user_id} person={b} />
          ))}
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader title="Timeline" count={!loading ? timeline.length : undefined} />
        {loading && [1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        {!loading && timeline.length === 0 && (
          <EmptyCard icon="📋" message="No activity yet — add your first expense" />
        )}
        {!loading && timeline.map(entry => (
          <TimelineRow key={entry.entry_id} entry={entry} />
        ))}
      </Card>
    </div>
  );
}
