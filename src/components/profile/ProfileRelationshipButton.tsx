import { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { listFriendships, listFriendRequestsDetailed, sendFriendRequest } from '../../services/socialService';

function normStatus(s: string | undefined): string {
  return String(s ?? '').trim().toLowerCase();
}

export function ProfileRelationshipButton({
  viewerId,
  targetId,
}: {
  viewerId: string;
  targetId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<'friend' | 'out' | 'in' | 'none'>('none');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [friends, frq] = await Promise.all([
        listFriendships(viewerId),
        listFriendRequestsDetailed(viewerId),
      ]);
      if (cancelled) return;
      const isFriend = friends.some(
        f =>
          (f.user_a_id === viewerId && f.user_b_id === targetId)
          || (f.user_a_id === targetId && f.user_b_id === viewerId),
      );
      if (isFriend) {
        setKind('friend');
        setLoading(false);
        return;
      }
      let out = false;
      let inn = false;
      for (const r of frq.requests) {
        if (normStatus(r.status) !== 'pending') continue;
        if (r.sender_id === viewerId && r.receiver_id === targetId) out = true;
        if (r.sender_id === targetId && r.receiver_id === viewerId) inn = true;
      }
      setKind(out ? 'out' : inn ? 'in' : 'none');
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [viewerId, targetId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#6b7280] text-xs font-semibold py-2">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        Checking friends…
      </div>
    );
  }

  if (kind === 'friend') {
    return (
      <p className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-2 inline-flex">
        Friends
      </p>
    );
  }
  if (kind === 'out') {
    return (
      <p className="text-xs font-semibold text-[#6b7280] bg-[#f3f4f6] rounded-full px-3 py-2">
        Friend request sent
      </p>
    );
  }
  if (kind === 'in') {
    return (
      <p className="text-xs text-[#b45309] bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 leading-snug">
        They invited you — open <span className="font-black">Community</span> under Friends to accept.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void (async () => {
          setBusy(true);
          setMsg(null);
          const res = await sendFriendRequest(viewerId, targetId);
          setBusy(false);
          if (!res.ok) {
            setMsg(res.error ?? 'Could not send invite');
            return;
          }
          setKind('out');
        })()}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white bg-[#2f5fc4] shadow-[0_10px_24px_rgba(47,95,196,0.22)] disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <UserPlus className="w-4 h-4" aria-hidden />}
        Add friend
      </button>
      {msg && <p className="text-xs text-[#dc2626] font-semibold">{msg}</p>}
    </div>
  );
}
