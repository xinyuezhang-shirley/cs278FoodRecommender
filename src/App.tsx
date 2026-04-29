import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { FeedPage } from './pages/FeedPage';
import { MapPage } from './pages/MapPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />

          {/* Protected app routes */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="feed" replace />} />
            <Route path="feed" element={<FeedPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/app/feed" replace />} />
          <Route path="*" element={<Navigate to="/app/feed" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
