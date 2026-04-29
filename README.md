# Nommi — Stanford Food Discovery

A mobile-first social food discovery platform for Stanford students. Share free food sightings, restaurant recommendations, and food events on and around campus.

## Quick Start

```bash
cd nommi
npm install
npm run dev
```

Open http://localhost:5173 in your browser (best experienced in mobile viewport — use DevTools device mode).

**Demo account:** `demo@stanford.edu` / `demo1234`

---

## Features

| Tab | What it does |
|-----|-------------|
| **Feed** | Rednote-style 2-column masonry grid with filter chips and search |
| **Map** | SVG campus map with color-coded food pins and tap-to-preview |
| **Community** | Food Circles (join/leave), top contributors, activity feed |
| **Profile** | Stats, Boba Collection achievements, Food Identity Graph |

**Create Post** — available on Feed and Map (pink + button), with type selector, campus location picker, cuisine/dietary tags, and expiration time for free food posts.

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Backend (default):** Mock service layer with `localStorage` persistence — no server needed
- **Backend (production-ready):** Supabase (auth, Postgres, RLS, Storage)

---

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env.local` and fill in your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the migration in your Supabase SQL editor:
   `supabase/migrations/001_initial_schema.sql`
4. Replace the mock service calls in `src/services/` with Supabase client calls.
   The service interfaces match Supabase's API shape for easy swapping.

---

## Project Structure

```
src/
  components/
    layout/         BottomNav, AppLayout (auth guard)
    ui/             Button, Tag, Avatar, Modal/BottomSheet, LoadingSpinner, EmptyState
    posts/          PostCard, PostGrid, PostDetail, FilterChips, CreatePostForm
    map/            CampusMap (SVG), PinBottomSheet
    community/      CircleCard, CircleDetail
    profile/        BobaCollection, FoodIdentityGraph
  pages/            FeedPage, MapPage, CommunityPage, ProfilePage, AuthPage
  services/         authService, postService, circleService, commentService
                    storageService (localStorage adapter), mockData (seed data)
  context/          AuthContext
  types/            index.ts — all TypeScript interfaces
  utils/            helpers.ts (dates, formatting), sanitize.ts (input validation)
supabase/
  migrations/       001_initial_schema.sql (tables + RLS policies)
```

---

## Security

- Input sanitized and length-limited before persistence (`sanitize.ts`)
- Protected routes redirect to `/login` via `AppLayout` guard
- Post edit/delete enforces `author_id === currentUserId` in the service layer
- Supabase migration includes Row Level Security policies on all tables
- No secrets or keys hardcoded — use `.env.local`

---

## Design System

| Token | Color | Use |
|-------|-------|-----|
| Strawberry | `#f43f5e` | Primary action, create button |
| Matcha | `#16a34a` | Free food tags, expiration timers |
| Taro | `#9333ea` | Events, social/boba |
| Milk Tea | `#92400e` | Trending, popular |
| Background | `#fafaf9` | Warm off-white app background |
| Card | `#ffffff` | Content cards |

Font: **Inter** · Spacing: 8px system · Border radius: 8–12px
