import { useState, type FormEvent } from 'react';
import type { CreateCircleInput, FoodCircle } from '../../types';
import { createCircle } from '../../services/circleService';
import { Modal } from '../ui/Modal';

interface CreateCircleModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated: (circle: FoodCircle) => void;
}

export function CreateCircleModal({ open, onClose, userId, onCreated }: CreateCircleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [iconType, setIconType] = useState('🍴');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setDescription('');
    setTagsInput('');
    setIconType('🍴');
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name your circle.');
      return;
    }
    setBusy(true);
    setError(null);
    const tags = tagsInput.split(/[,#\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);

    const payload: CreateCircleInput = {
      name: name.trim(),
      description: description.trim(),
      icon_type: iconType.trim() || '🍴',
      tags: tags.length ? tags : undefined,
    };

    try {
      const circle = await createCircle(payload, userId);
      onCreated(circle);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create circle.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create circle">
      <form onSubmit={handleSubmit} className="px-4 pb-6 max-w-md mx-auto space-y-4">
        <p className="text-sm text-[#6b7280]">
          Circles are shared spaces — members curate posts they find (their own or others’) without copying the feed.
        </p>

        <label className="block">
          <span className="text-xs font-bold text-[#6b7280] uppercase">Emoji / icon</span>
          <input
            value={iconType}
            onChange={e => setIconType(e.target.value.slice(0, 8))}
            className="mt-1 w-full rounded-2xl border border-[#e5e7eb] px-3 py-2 text-xl text-[#1a1a1a]"
            maxLength={8}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-[#6b7280] uppercase">Circle name *</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-2xl border border-[#e5e7eb] px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4]"
            placeholder="e.g. Boba buddies"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-[#6b7280] uppercase">Description</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-2xl border border-[#e5e7eb] px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#2f5fc4]/20 focus:border-[#2f5fc4]"
            placeholder="Who’s this for?"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-[#6b7280] uppercase">Tags (comma-separated)</span>
          <input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-[#e5e7eb] px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#9ca3af]"
            placeholder="boba, free food, late night"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full px-4 py-2 text-sm font-bold bg-white border border-[#e5e7eb] text-[#2f5fc4]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full px-5 py-2 text-sm font-black text-white bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] shadow-[0_8px_20px_rgba(47,95,196,0.22)] disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
