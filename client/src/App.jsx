import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Login      from './pages/Login.jsx';
import Dashboard  from './pages/Dashboard.jsx';
import LogEntry   from './pages/LogEntry.jsx';
import EntryDetail from './pages/EntryDetail.jsx';
import Insights from './pages/Insights.jsx';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32, color: '#a0aec0' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 32, color: '#a0aec0' }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/login"       element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/log"         element={<ProtectedRoute><LogEntry /></ProtectedRoute>} />
      <Route path="/entry/:id"   element={<ProtectedRoute><EntryDetail /></ProtectedRoute>} />
      <Route path="*"            element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
    </Routes>
  );
};

export default App;