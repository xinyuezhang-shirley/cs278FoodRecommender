import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { FeedPage } from './pages/FeedPage';
import { MapPage } from './pages/MapPage';
import { CommunityPage } from './pages/CommunityPage';
import { ProfilePage } from './pages/ProfilePage';
import { CollectionsPage } from './pages/CollectionsPage';
import { PostPage } from './pages/PostPage';
import { EditPostPage } from './pages/EditPostPage';

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
            <Route path="collections" element={<Navigate to="/app/collections/saved" replace />} />
            <Route path="collections/:tabKey" element={<CollectionsPage />} />
            <Route path="post/:postId/edit" element={<EditPostPage />} />
            <Route path="post/:postId" element={<PostPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/:profileUserId" element={<ProfilePage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/app/feed" replace />} />
          <Route path="*" element={<Navigate to="/app/feed" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
