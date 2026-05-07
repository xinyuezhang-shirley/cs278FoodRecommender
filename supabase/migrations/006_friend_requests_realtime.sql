-- Replay-safe: subscribing clients get INSERT on someone else's request to you immediately.
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
