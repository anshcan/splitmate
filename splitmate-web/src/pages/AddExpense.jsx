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

const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Travel',
  'Other',
];

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

function MemberCheckbox({ member, checked, onToggle }) {
  return (
    <button
      onClick={() => onToggle(member)}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: checked ? '#1A2D4A' : 'none',
        border: 'none',
        borderBottom: '1px solid #1A2540',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!checked) e.currentTarget.style.background = '#1A2D4A';
      }}
      onMouseLeave={(e) => {
        if (!checked) e.currentTarget.style.background = 'none';
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 4,
        border: `2px solid ${checked ? '#6366F1' : '#334155'}`,
        background: checked ? '#6366F1' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: avatarGradient(member.username),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {getInitials(member.username)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
          {member.username}
        </div>
      </div>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1A2540' }}>
      <div style={{ width: 20, height: 20, background: '#263348', borderRadius: 4, flexShrink: 0 }} />
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#263348', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '40%', height: 12, background: '#263348', borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AddExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [paidBy, setPaidBy] = useState(null);
  const [splitAmong, setSplitAmong] = useState([]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [id]);

  async function fetchMembers() {
    try {
      setLoadingMembers(true);
      setError(null);
      const response = await client.get(`/accounts/${id}`);
      const memberList = response.data.data.members || [];
      setMembers(memberList);

      // Auto-select current user as payer
      const currentUserMember = memberList.find(m => m.user_id === user?.user_id);
      if (currentUserMember) {
        setPaidBy(currentUserMember);
      }

      // Auto-select all members for split
      setSplitAmong(memberList);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Could not load members. Is the backend running?'
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  function handleToggleSplitMember(member) {
    setSplitAmong(prev => {
      const isSelected = prev.some(m => m.user_id === member.user_id);
      if (isSelected) {
        return prev.filter(m => m.user_id !== member.user_id);
      } else {
        return [...prev, member];
      }
    });
  }

  function validateForm() {
    if (!description.trim()) {
      setError('Please enter a description');
      return false;
    }
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (!paidBy) {
      setError('Please select who paid');
      return false;
    }
    if (splitAmong.length === 0) {
      setError('Please select at least one person to split with');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const totalAmount = parseFloat(amount);
      const splits = splitAmong.map(member => ({
        owed_by_user_id: member.user_id,
        amount_owed: totalAmount / splitAmong.length,
      }));

      await client.post(`/accounts/${id}/expenses/`, {
        paid_by_user_id: paidBy.user_id,
        total_amount: totalAmount,
        description: description.trim(),
        category,
        expense_date: expenseDate,
        splits,
      });

      // Success — navigate back
      alert('Expense added! ✓');
      navigate(`/accounts/${id}`);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to add expense. Please try again.'
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
        Add expense
      </h1>
      <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px 0' }}>
        Record who paid and how to split it.
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

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          What for?
        </label>
        <input
          type="text"
          placeholder="e.g., Dinner at Taj, Movie tickets"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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

      {/* Amount */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Total amount (₹)
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

      {/* Category */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
            cursor: 'pointer',
          }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat} style={{ background: '#0F172A', color: '#F1F5F9' }}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Date
        </label>
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
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
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Who paid? */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Who paid?
        </label>
        <Card>
          {loadingMembers && [1, 2, 3].map(i => <SkeletonRow key={i} />)}
          {!loadingMembers && members.map(member => (
            <button
              key={member.user_id}
              onClick={() => setPaidBy(member)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: paidBy?.user_id === member.user_id ? '#1A2D4A' : 'none',
                border: 'none',
                borderBottom: '1px solid #1A2540',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (paidBy?.user_id !== member.user_id) e.currentTarget.style.background = '#1A2D4A';
              }}
              onMouseLeave={(e) => {
                if (paidBy?.user_id !== member.user_id) e.currentTarget.style.background = 'none';
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 4,
                border: `2px solid ${paidBy?.user_id === member.user_id ? '#6366F1' : '#334155'}`,
                background: paidBy?.user_id === member.user_id ? '#6366F1' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {paidBy?.user_id === member.user_id && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: avatarGradient(member.username),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {getInitials(member.username)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
                  {member.username}
                </div>
              </div>
            </button>
          ))}
        </Card>
      </div>

      {/* Split among */}
      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: 'block', fontSize: 12, fontWeight: 600,
          color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Split among
        </label>
        <Card>
          {loadingMembers && [1, 2, 3].map(i => <SkeletonRow key={i} />)}
          {!loadingMembers && members.map(member => (
            <MemberCheckbox
              key={member.user_id}
              member={member}
              checked={splitAmong.some(m => m.user_id === member.user_id)}
              onToggle={handleToggleSplitMember}
            />
          ))}
        </Card>
      </div>

      {/* Split summary */}
      {amount && splitAmong.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Each person owes
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#6366F1', letterSpacing: '-0.02em' }}>
              ₹{formatAmount(parseFloat(amount) / splitAmong.length)}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 8 }}>
              Split equally among {splitAmong.length} {splitAmong.length === 1 ? 'person' : 'people'}
            </div>
          </div>
        </Card>
      )}

      <button
        onClick={handleSubmit}
        disabled={!description.trim() || !amount.trim() || submitting}
        style={{
          width: '100%',
          background: description.trim() && amount.trim() && !submitting ? '#6366F1' : '#334155',
          border: 'none', borderRadius: 10,
          color: '#fff', fontWeight: 600, fontSize: 14,
          padding: '11px 16px', cursor: description.trim() && amount.trim() && !submitting ? 'pointer' : 'not-allowed',
          opacity: description.trim() && amount.trim() && !submitting ? 1 : 0.5,
        }}
      >
        {submitting ? 'Adding...' : 'Add expense'}
      </button>
    </div>
  );
}
