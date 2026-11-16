import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Train } from './pages/Train';
import { Session } from './pages/Session';
import { Lists } from './pages/Lists';
import { Words } from './pages/Words';
import { History } from './pages/History';
import { Rewards } from './pages/Rewards';
import { ProfilePage } from './pages/Profile';
import { Admin } from './pages/Admin';
import { Spinner } from './components/ui';

function Guarded() {
  const { me, loading } = useApp();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!me) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Landing />} />
          <Route element={<Guarded />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/train" element={<Train />} />
            <Route path="/session/:roundId" element={<Session />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/words" element={<Words />} />
            <Route path="/history" element={<History />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
