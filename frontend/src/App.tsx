import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventsProvider } from './context/EventsContext';
import { type ReactNode } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Sponsors from './pages/Sponsers';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Events from './pages/Events';
import Profile from './pages/Profile';
import Groups from './pages/Groups';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="sponsors" element={<Sponsors />} />
              <Route path="events" element={<Events />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="groups" element={<Groups />} />

            </Route>
          </Routes>
        </EventsProvider>
      </AuthProvider>
    </BrowserRouter >
  );
}

export default App;