import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function TypeButton({ type, title, description, icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '20px 16px',
        background: selected ? '#1E2D4A' : '#1E293B',
        border: `2px solid ${selected ? '#6366F1' : '#263348'}`,
        borderRadius: 12,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = '#334155';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = '#263348';
      }}
    >
      <div style={{
        fontSize: 32,
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: selected ? '#2D1B3D' : '#0F172A',
        borderRadius: 10,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ textAlign: 'left', flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#64748B' }}>
          {description}
        </div>
      </div>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `2px solid ${selected ? '#6366F1' : '#334155'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && <div style={{ width: 10, height: 10, background: '#6366F1', borderRadius: '50%' }} />}
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewAccount() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [step, setStep] = useState(1); // 1 = type selection, 2 = details
  const [type, setType] = useState(null); // 'PERSONAL' or 'GROUP'
  const [formData, setFormData] = useState({
    name: '',
    otherUsername: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // ─── Step 1: Type Selection ──────────────────────────────────────────────

  function handleTypeSelect(selectedType) {
    setType(selectedType);
    setError(null);
    setFormData({ name: '', otherUsername: '' });
    setSearchResults([]);
  }

  function handleNext() {
    if (!type) {
      setError('Please select an account type');
      return;
    }
    setStep(2);
  }

  // ─── Step 2: Details ────────────────────────────────────────────────────

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function searchUsers(query) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Note: This assumes a GET /users/search endpoint exists
      // If not, you'll need to add it to the backend
      const response = await client.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleUserSelect(selectedUser) {
    setFormData(prev => ({ ...prev, otherUsername: selectedUser.username }));
    setSearchResults([]);
  }

  async function handleCreateAccount() {
    setError(null);
    setLoading(true);

    try {
      if (type === 'PERSONAL') {
        if (!formData.otherUsername.trim()) {
          setError('Please select a person to create an account with');
          setLoading(false);
          return;
        }

        const response = await client.post('/accounts/personal', {
          other_username: formData.otherUsername,
        });

        // Success — navigate to the new account
        const newAccountId = response.data.data.account_id;
        navigate(`/accounts/${newAccountId}`);
      } else if (type === 'GROUP') {
        if (!formData.name.trim()) {
          setError('Please enter a group name');
          setLoading(false);
          return;
        }

        const response = await client.post('/accounts/group', {
          name: formData.name,
        });

        // Success — navigate to the new account
        const newAccountId = response.data.data.account_id;
        navigate(`/accounts/${newAccountId}`);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 600, width: '100%' }}>
      {/* Back link */}
      <button
        onClick={() => step === 1 ? navigate('/dashboard') : setStep(1)}
        style={{
          background: 'none', border: 'none', color: '#64748B',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        ← Back
      </button>

      {/* Step 1: Type Selection */}
      {step === 1 && (
        <>
          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
            color: '#F1F5F9', margin: 0, marginBottom: 8,
          }}>
            Create new account
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px 0' }}>
            Choose what you'd like to split with.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <TypeButton
              type="PERSONAL"
              title="Personal Account"
              description="Split with one person (1:1)"
              icon="🤝"
              selected={type === 'PERSONAL'}
              onClick={() => handleTypeSelect('PERSONAL')}
            />
            <TypeButton
              type="GROUP"
              title="Group Account"
              description="Split with multiple people"
              icon="👥"
              selected={type === 'GROUP'}
              onClick={() => handleTypeSelect('GROUP')}
            />
          </div>

          {error && (
            <div style={{
              background: '#450A0A', border: '1px solid #7F1D1D',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              fontSize: 13, color: '#FCA5A5',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={!type}
            style={{
              width: '100%',
              background: type ? '#6366F1' : '#334155',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 600, fontSize: 14,
              padding: '11px 16px', cursor: type ? 'pointer' : 'not-allowed',
              opacity: type ? 1 : 0.5,
            }}
          >
            Next
          </button>
        </>
      )}

      {/* Step 2: Details */}
      {step === 2 && type === 'PERSONAL' && (
        <>
          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
            color: '#F1F5F9', margin: 0, marginBottom: 8,
          }}>
            Who do you want to split with?
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px 0' }}>
            Search for and select a person.
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

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Search username
            </label>
            <input
              type="text"
              placeholder="Start typing..."
              value={formData.otherUsername}
              onChange={(e) => {
                handleInputChange('otherUsername', e.target.value);
                searchUsers(e.target.value);
              }}
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

          {/* Search Results */}
          {searching && (
            <div style={{ padding: '12px 0', fontSize: 12, color: '#64748B' }}>
              Searching...
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              {searchResults.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => handleUserSelect(u)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #1A2540',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1A2D4A'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: avatarGradient(u.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {getInitials(u.username)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>
                      {u.username}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {u.email}
                    </div>
                  </div>
                </button>
              ))}
            </Card>
          )}

          {!searching && formData.otherUsername.trim() && searchResults.length === 0 && (
            <div style={{
              padding: '16px', background: '#1E293B', borderRadius: 10,
              border: '1px solid #263348', marginBottom: 20,
              fontSize: 12, color: '#64748B', textAlign: 'center',
            }}>
              No users found. Try a different search.
            </div>
          )}

          <button
            onClick={handleCreateAccount}
            disabled={!formData.otherUsername.trim() || loading}
            style={{
              width: '100%',
              background: formData.otherUsername.trim() && !loading ? '#6366F1' : '#334155',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 600, fontSize: 14,
              padding: '11px 16px', cursor: formData.otherUsername.trim() && !loading ? 'pointer' : 'not-allowed',
              opacity: formData.otherUsername.trim() && !loading ? 1 : 0.5,
            }}
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </>
      )}

      {/* Step 2: Details for Group */}
      {step === 2 && type === 'GROUP' && (
        <>
          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
            color: '#F1F5F9', margin: 0, marginBottom: 8,
          }}>
            What's the group called?
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 24px 0' }}>
            You can invite people after creating it.
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

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Group name
            </label>
            <input
              type="text"
              placeholder="e.g., Goa Trip, Roommates, Project Alpha"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
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

          <button
            onClick={handleCreateAccount}
            disabled={!formData.name.trim() || loading}
            style={{
              width: '100%',
              background: formData.name.trim() && !loading ? '#6366F1' : '#334155',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 600, fontSize: 14,
              padding: '11px 16px', cursor: formData.name.trim() && !loading ? 'pointer' : 'not-allowed',
              opacity: formData.name.trim() && !loading ? 1 : 0.5,
            }}
          >
            {loading ? 'Creating...' : 'Create group'}
          </button>
        </>
      )}
    </div>
  );
}
