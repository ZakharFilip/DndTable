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
import { RedirectIfAuth, RequireAuth } from "./app/RouteGuards";
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/sessions" element={<RequireAuth><SessionsListPage /></RequireAuth>} />
        <Route path="/sessions/join" element={<RequireAuth><JoinSessionPage /></RequireAuth>} />
        <Route path="/sessions/create" element={<RequireAuth><CreateSessionPage /></RequireAuth>} />
        <Route path="/sessions/:id" element={<RequireAuth><SessionTablePage /></RequireAuth>} />
        <Route path="/records" element={<RequireAuth><GameRecordsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/party/:id" element={<RequireAuth><Party /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}
