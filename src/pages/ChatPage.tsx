import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FriendsAndMessagesPanel } from '../components/community/FriendsAndMessagesPanel';

/**
 * Dedicated tab for Find Friends + direct messages (moved out of Community for clearer IA).
 */
export function ChatPage() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversationOpen, setConversationOpen] = useState(false);
  const dmBootstrap = searchParams.get('dm')?.trim() || undefined;

  const clearDmBootstrap = useCallback(() => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('dm');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  if (!user) return null;

  return (
    <div className="relative flex w-full flex-col bg-[#faf9f5] px-4">
      {!conversationOpen && (
        <div className="shrink-0 pt-4 pb-2">
          <h1 className="text-3xl font-black tracking-tight text-[#2f5fc4]">Chat</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Find friends and keep the conversation going.</p>
        </div>
      )}

      <FriendsAndMessagesPanel
        userId={user.id}
        myUsernameHint={profile?.username}
        bootstrapDmWithUserId={dmBootstrap}
        onBootstrapDmConsumed={clearDmBootstrap}
        onConversationOpenChange={setConversationOpen}
      />
    </div>
  );
}
