import { Link } from 'react-router-dom';
import type { FoodCircle, Post } from '../../types';
import {
  buildMilestones,
  buildTasteChips,
  campusFoodHabits,
  dietarySignalsFromPosts,
  suggestCirclesForUser,
} from '../../utils/profileIdentityInsights';

const CARD =
  'bg-white rounded-[28px] border border-[#e5e7eb] shadow-[0_10px_25px_rgba(47,95,196,0.08)] p-5';

const TITLE = 'font-black text-xl text-[#2f5fc4] tracking-tight';

const EXAMPLE_DIETARY = [
  'Vegetarian',
  'Vegan',
  'Nut allergy',
  'Halal-friendly',
  'Gluten-free',
  'Dairy-free',
  'Pescatarian',
];

interface ProfileIdentityTabProps {
  posts: Post[];
  freeFoodCount: number;
  circleCount: number;
  circles: FoodCircle[];
  joiningCircleId: string | null;
  onJoinCircle: (circleId: string) => Promise<void>;
}

export function ProfileIdentityTab({
  posts,
  freeFoodCount,
  circleCount,
  circles,
  joiningCircleId,
  onJoinCircle,
}: ProfileIdentityTabProps) {
  const tasteChips = buildTasteChips(posts);
  const habitTiles = campusFoodHabits(posts, freeFoodCount).slice(0, 4);
  const dietaryNotes = dietarySignalsFromPosts(posts);
  const suggested = suggestCirclesForUser(posts, circles);
  const milestones = buildMilestones(posts, freeFoodCount, circleCount);

  return (
    <div className="space-y-4 pb-6">
      {/* 1 — Taste profile */}
      <section className={CARD} aria-labelledby="taste-heading">
        <h3 id="taste-heading" className={TITLE}>
          Taste profile
        </h3>
        <p className="text-sm text-[#6b7280] mt-1 mb-4">What Nommi knows about your campus cravings.</p>
        {!posts.length && (
          <p className="text-sm text-[#6b7280] mb-4 leading-relaxed">
            Start posting or saving food spots to build your taste profile.
          </p>
        )}
        <div className="flex flex-wrap gap-2" role="list">
          {tasteChips.map(chip => (
            <span
              key={chip.id}
              role="listitem"
              className={[
                'rounded-full px-3 py-2 text-sm font-bold border',
                chip.active
                  ? 'bg-[#2f5fc4] text-white border-[#2f5fc4]'
                  : 'bg-[#f5f7ff] text-[#6b7280] border-[#e5e7eb]',
              ].join(' ')}
              aria-current={chip.active ? 'true' : undefined}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </section>

      {/* 2 — Campus food habits */}
      <section className={CARD} aria-labelledby="habits-heading">
        <h3 id="habits-heading" className={TITLE}>
          Campus food habits
        </h3>
        <p className="text-sm text-[#6b7280] mt-1 mb-4">Patterns inferred from posts you authored.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {habitTiles.map(tile => (
            <div
              key={tile.label}
              className="bg-[#f5f7ff] rounded-2xl p-4 border border-[#e5e7eb]"
            >
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">{tile.label}</p>
              <p className="text-base font-black mt-1 leading-snug text-[#2f5fc4]">{tile.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Dietary notes */}
      <section className={CARD} aria-labelledby="diet-heading">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 id="diet-heading" className={TITLE}>
              Dietary notes
            </h3>
            <p className="text-sm text-[#6b7280] mt-1">
              Shown when your posts mention dietary tags. Profile editing comes later.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-full shrink-0 bg-white border border-[#e5e7eb] text-[#9ca3af] font-bold text-xs px-4 py-2 cursor-not-allowed"
            aria-disabled="true"
            title="Profile preferences editing is not enabled yet."
          >
            Edit preferences
          </button>
        </div>
        {dietaryNotes.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="list">
            {dietaryNotes.map(note => (
              <span
                key={note}
                role="listitem"
                className="rounded-full px-3 py-2 text-sm font-bold bg-[#2f5fc4] text-white border border-[#2f5fc4]"
              >
                {note}
              </span>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-[#6b7280] mb-3 leading-relaxed">
              Add dietary notes so people know what recommendations fit you.
            </p>
            <p className="text-xs font-bold text-[#6b7280] mb-2">Ideas:</p>
            <div className="flex flex-wrap gap-2" aria-hidden>
              {EXAMPLE_DIETARY.map(d => (
                <span
                  key={d}
                  className="rounded-full px-3 py-2 text-sm font-bold bg-[#f5f7ff] text-[#9ca3af] border border-dashed border-[#e5e7eb]"
                >
                  {d}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 4 — Suggested circles */}
      <section className={CARD} aria-labelledby="suggest-heading">
        <h3 id="suggest-heading" className={TITLE}>
          Suggested circles
        </h3>
        <p className="text-sm text-[#6b7280] mt-1 mb-4">
          Find people who crave the same things.
        </p>
        {suggested.length === 0 ? (
          <p className="text-sm text-[#6b7280] leading-relaxed">
            Join or create circles to find your food people.
          </p>
        ) : (
          <ul className="space-y-3">
            {suggested.map(circle => (
              <li
                key={circle.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f5f7ff]/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3 min-w-0">
                  <span className="text-2xl shrink-0" aria-hidden>{circle.icon_type || '🍴'}</span>
                  <div className="min-w-0">
                    <p className="font-black text-[#1a1a1a]">{circle.name}</p>
                    <p className="text-sm text-[#6b7280] line-clamp-2">{circle.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 justify-end flex-wrap">
                  <Link
                    to="/app/community"
                    className="inline-flex items-center justify-center rounded-full bg-white border border-[#e5e7eb] text-[#2f5fc4] font-bold px-4 py-2 text-sm hover:bg-[#faf9f5]"
                  >
                    View
                  </Link>
                  {circle.is_member ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-[#e5e7eb] text-[#6b7280] font-bold px-4 py-2 text-sm">
                      Joined
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onJoinCircle(circle.id)}
                      disabled={joiningCircleId !== null}
                      className={[
                        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-black text-white',
                        'bg-linear-to-r from-[#2f5fc4] to-[#6f90d8] shadow-[0_8px_20px_rgba(47,95,196,0.22)]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      ].join(' ')}
                    >
                      {joiningCircleId === circle.id ? 'Joining…' : 'Join'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5 — Food milestones */}
      <section className={CARD} aria-labelledby="milestone-heading">
        <h3 id="milestone-heading" className={TITLE}>
          Food milestones
        </h3>
        <p className="text-sm text-[#6b7280] mt-1 mb-4">Celebrate real actions on Nommi.</p>
        <ul className="space-y-3">
          {milestones.map(m => (
            <li
              key={m.id}
              className={`rounded-2xl border border-[#e5e7eb] p-4 transition-opacity ${m.unlocked ? 'bg-[#f5f7ff]' : 'bg-white opacity-80'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`font-black text-[#2f5fc4] ${m.unlocked ? '' : 'text-[#9ca3af]'}`}>{m.title}</p>
                {m.unlocked ? (
                  <span className="text-xs font-black text-[#2f5fc4] shrink-0">Unlocked ✓</span>
                ) : (
                  <span className="text-xs font-bold text-[#6b7280] shrink-0">Locked</span>
                )}
              </div>
              <p className="text-sm text-[#6b7280] mt-1">{m.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
