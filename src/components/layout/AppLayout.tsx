import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui/LoadingSpinner';
import { Modal } from '../ui/Modal';
import { CreatePostForm } from '../posts/CreatePostForm';

export function AppLayout() {
  const { user, loading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#faf9f5]">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className="bg-[#faf9f5] max-w-lg mx-auto w-full flex flex-col"
      style={{ height: '100dvh' }}
    >
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </main>

      <BottomNav onCreatePost={() => setShowCreate(true)} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} fullScreen>
        <CreatePostForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>
    </div>
  );
}
