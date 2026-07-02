import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';

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

function PersonRow({ person, selected, onSelect }) {
  const owedToYou = person.balance > 0;
  const settled = person.balance === 0;

  return (
    <button
      onClick={() => onSelect(person)}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: selected ? '#1A2D4A' : 'none',
        border: 'none',
        borderBottom: '1px solid #1A2540',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = '#1A2D4A';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'none';
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: avatarGradient(person.username),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {getInitials(person.username)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {person.username}
        </div>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
          {settled ? 'Settled up' : owedToYou ? 'owes you' : 'you owe'}
        </div>
      </div>
      {!settled && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: owedToYou ? '#22C55E' : '#F43F5E' }}>
            ₹{formatAmount(person.balance)}
          </div>
        </div>
      )}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1A2540' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#263348', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '40%', height: 12, background: '#263348', borderRadius: 4, marginBottom: 6 }} />
        <div style={{ width: '25%', height: 9, background: '#1E293B', borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettleUp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [paidBy, setPaidBy] = useState(null);
  const [paidTo, setPaidTo] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, [id]);

  async function fetchBalances() {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get(`/accounts/${id}/expenses/balances`);
      setBalances(response.data.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Could not load balances. Is the backend running?'
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePaidBySelect(person) {
    setPaidBy(person);
    setPaidTo(null); // Reset recipient
  }

  function handlePaidToSelect(person) {
    setPaidTo(person);
  }

  function validateForm() {
    if (!paidBy) {
      setError('Please select who is paying');
      return false;
    }
    if (!paidTo) {
      setError('Please select who is receiving');
      return false;
    }
    if (paidBy.user_id === paidTo.user_id) {
      setError('Cannot settle with yourself');
      return false;
    }
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      await client.post(`/accounts/${id}/settlements`, {
        paid_by_user_id: paidBy.user_id,
        paid_to_user_id: paidTo.user_id,
        amount: parseFloat(amount),
        note: note.trim() || null,
      });

      // Success — show message and reset form
      alert('Settlement recorded! ✓');
      setPaidBy(null);
      setPaidTo(null);
      setAmount('');
      setNote('');

      // Refresh balances
      fetchBalances();
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to record settlement. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 700, width: '100%' }}>
      {/* Back link */}
      <button
        onClick={() => navigate(`/accounts/${id}`)}
        style={{
          background: 'none', border: 'none', color: '#64748B',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        ← Back to account
      </button>

      <h1 style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
        color: '#F1F5F9', margin: 0, marginBottom: 8,
      }}>
        Settle up
      </h1>
      <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px 0' }}>
        Record a payment between two people.
      </p>

      {error && (
        <div style={{
          background: '#450A0A', border: '1px solid #7F1D1D',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: 13, color: '#FCA5A5',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Who is paying? */}
      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Who is paying?
        </label>
        <Card>
          {loading && [1, 2, 3].map(i => <SkeletonRow key={i} />)}
          {!loading && balances.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: 12 }}>
              No members to settle with.
            </div>
          )}
          {!loading && balances.map(person => (
            <PersonRow
              key={person.user_id}
              person={person}
              selected={paidBy?.user_id === person.user_id}
              onSelect={handlePaidBySelect}
            />
          ))}
        </Card>
      </div>

      {/* Who is receiving? */}
      {paidBy && (
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block', fontSize: 12, fontWeight: 600,
            color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Who is receiving?
          </label>
          <Card>
            {balances
              .filter(p => p.user_id !== paidBy.user_id)
              .map(person => (
                <PersonRow
                  key={person.user_id}
                  person={person}
                  selected={paidTo?.user_id === person.user_id}
                  onSelect={handlePaidToSelect}
                />
              ))}
          </Card>
        </div>
      )}

      {/* Amount */}
      {paidBy && paidTo && (
        <>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Amount (₹)
            </label>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0F172A',
                border: '1px solid #263348',
                borderRadius: 8,
                color: '#F1F5F9',
                fontSize: 14,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Goa trip, Lunch, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0F172A',
                border: '1px solid #263348',
                borderRadius: 8,
                color: '#F1F5F9',
                fontSize: 14,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Summary */}
          <Card style={{ marginBottom: 24 }}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: avatarGradient(paidBy.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(paidBy.username)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
                    {paidBy.username}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#64748B' }}>pays</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
                    {paidTo.username}
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: avatarGradient(paidTo.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(paidTo.username)}
                  </div>
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                fontSize: 24, fontWeight: 800, color: '#6366F1',
                letterSpacing: '-0.02em',
              }}>
                ₹{formatAmount(amount || 0)}
              </div>
            </div>
          </Card>

          <button
            onClick={handleSubmit}
            disabled={!amount.trim() || submitting}
            style={{
              width: '100%',
              background: amount.trim() && !submitting ? '#6366F1' : '#334155',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 600, fontSize: 14,
              padding: '11px 16px', cursor: amount.trim() && !submitting ? 'pointer' : 'not-allowed',
              opacity: amount.trim() && !submitting ? 1 : 0.5,
            }}
          >
            {submitting ? 'Recording...' : 'Record settlement'}
          </button>
        </>
      )}
    </div>
  );
}
