# Nommi — Stanford Food Discovery

A mobile-first social food discovery app for Stanford students. Share free-food sightings, recommendations, and events around campus with social layers (circles, friends, DMs, reactions, collections).

## Quick Start

From repo root:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (best in a mobile viewport / device mode).

---

## Core Features

| Area | What it does |
|---|---|
| **Feed** | Masonry feed, search, cuisine + dietary + distance filters, quick saved/liked links |
| **Map** | Live map pins grouped by place, map filters, place exploration sheet |
| **Community** | Circles, activity feed, top contributors, friends + direct messages |
| **Profile** | User stats, identity/settings, relationship actions, personal collections |
| **Posting** | Create/edit posts with place picker, images, tags, and free-food expiration |

### Recent Updates

- Per-type reactions (`like` and `still_there` can coexist)
- DM image sending support (Supabase storage-backed)
- Realtime + async race-condition hardening across feed/map/profile/chat
- Refreshed loading/empty visuals using custom Nommi graphics
- More fluid, rounded, boba-themed micro-interactions and motion styling

---

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- React Router v6
- Lucide React
- Supabase (Auth, Postgres, RLS, Realtime, Storage)

---

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional maps/geocoding variables are supported by the location services.

---

## Supabase Setup (Required)

Run all migrations (recommended via CLI from repo root):

```bash
supabase db push
```

This applies social/DM schemas, reaction constraints, profile/friend policies, and storage setup including:

- `dm_messages.message_type` + `image_url`
- `dm-images` storage bucket + policies for chat image uploads

If using SQL editor manually, execute migrations in order under `supabase/migrations/`.

---

## Graphics + Motion

Custom assets live in:

- `public/graphics/nommi-logo.png`
- `public/graphics/nommi-loading.png`
- `public/graphics/nommi-empty-filter.png`

They are used by shared UI components (loading/empty/fail states and decorative non-home backgrounds). Motion respects `prefers-reduced-motion`.

---

## Project Structure (High Level)

```text
src/
  components/
    community/      circles, DMs, sharing
    layout/         app shell + bottom nav
    map/            map view, pins, filters
    posts/          create/edit/detail/grid/cards
    profile/        profile panels and relationship controls
    ui/             button, modal, loaders, empty states
  context/          auth context
  hooks/            realtime + map/location hooks
  pages/            feed/map/community/profile/auth/post/collections/edit
  services/         supabase data services
  types/            shared TypeScript types
  utils/            helpers, routing, sanitize, image/share utilities
supabase/
  migrations/       schema + RLS + storage policies
```

---

## Security Notes

- Input is sanitized/length-limited before persistence
- Auth-guarded app layout and ownership checks for post edits/deletes
- Supabase RLS policies enforce row-level access
- Secrets are never committed; keep credentials in `.env.local`
