import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccountDetail from './pages/AccountDetail';

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — all wrapped in Layout (sidebar) */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/accounts/:id" element={<ProtectedRoute><AccountDetail /></ProtectedRoute>} />

        {/* Placeholders — add pages here as you build them */}
        <Route path="/people"               element={<ProtectedRoute><Placeholder title="People" /></ProtectedRoute>} />
        <Route path="/accounts"             element={<ProtectedRoute><Placeholder title="Accounts" /></ProtectedRoute>} />
        <Route path="/accounts/new"         element={<ProtectedRoute><Placeholder title="New account" /></ProtectedRoute>} />
        <Route path="/accounts/:id/settle"  element={<ProtectedRoute><Placeholder title="Settle up" /></ProtectedRoute>} />
        <Route path="/accounts/:id/expenses/new" element={<ProtectedRoute><Placeholder title="Add expense" /></ProtectedRoute>} />
        <Route path="/expenses"             element={<ProtectedRoute><Placeholder title="Expenses" /></ProtectedRoute>} />
        <Route path="/ledger/:userId"       element={<ProtectedRoute><Placeholder title="Person ledger" /></ProtectedRoute>} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Temporary placeholder — replace each with its real page as you build
function Placeholder({ title }) {
  return (
    <div style={{ padding: '24px 28px' }}>
      <h1 style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
        color: '#F1F5F9', margin: 0, marginBottom: 8,
      }}>
        {title}
      </h1>
      <p style={{ color: '#475569', fontSize: 14 }}>Coming soon.</p>
    </div>
  );
}
