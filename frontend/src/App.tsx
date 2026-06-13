import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Party from './pages/Party';
import JoinSessionPage from './pages/JoinSessionPage';
import SessionsListPage from './pages/SessionsListPage';
import CreateSessionPage from './pages/CreateSessionPage';
import SessionTablePage from './pages/SessionTablePage';
import GameRecordsPage from './pages/GameRecordsPage';
import ProfilePage from './pages/ProfilePage';
import DesignSystemPreview from './pages/DesignSystemPreview';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AdminPanelPage from './pages/AdminPanelPage';
import { RedirectIfAuth, RequireAuth } from "./app/RouteGuards";
import { RequireAdmin } from "./app/RequireAdmin";
import { AppShell } from "./app/AppShell";
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route
          path="/AdminPanel"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminPanelPage />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route path="/design-preview" element={<DesignSystemPreview />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sessions" element={<SessionsListPage />} />
          <Route path="/sessions/join" element={<JoinSessionPage />} />
          <Route path="/sessions/create" element={<CreateSessionPage />} />
          <Route path="/records" element={<GameRecordsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/sessions/:id" element={<RequireAuth><SessionTablePage /></RequireAuth>} />
        <Route path="/party/:id" element={<RequireAuth><Party /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
