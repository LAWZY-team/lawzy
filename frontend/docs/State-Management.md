# State Management: Landing → App Entry (Guest vs Logged-in)

## Overview

We support a **guest-first entry** from the Landing Page to let users start drafting a contract quickly, while still preserving a clean UX for:

- **Guest users** (no account / not logged in)
- **Existing users** (already logged in)

This document explains the state model and UI rules we implemented to make that flow predictable and maintainable.

## Why Zustand (and why sessionStorage)

We use **Zustand** for lightweight, app-wide UI state that must be shared across unrelated components/routes (Landing CTA → dashboard sidebar/user menu).

- **Simple and local**: no reducer boilerplate, easy to call from event handlers.
- **Cross-route**: state survives Next.js route transitions.
- **Session-scoped persistence**: we persist the “guest-from-landing” flag in **`sessionStorage`** so it lasts for the tab session but clears when the tab closes.

## Key Concepts

### 1) Auth state (logged-in vs guest)

We treat auth as **resolved** only after we decide whether the user is logged in.

- **Logged-in**: cookie `auth_session` exists **and** `/api/auth/me` returns a valid user.
- **Guest**: cookie missing **or** `/api/auth/me` fails / returns error.

To avoid UI flicker, we also track:

- `authResolved`: `true` once the app has determined auth state in this tab.

Implementation:
- Store: `frontend/src/stores/auth-store.ts`
- Bootstrapper: `frontend/src/components/auth/auth-bootstrap.tsx`

### 2) “Guest-from-landing” flow state

We track whether the current session started via the Landing CTA:

- `entry`: `"landing" | null`
- `startedAt`: timestamp (for debugging/analytics later)

Implementation:
- Store: `frontend/src/stores/guest-flow-store.ts`
  - Persisted to `sessionStorage`
  - Uses `skipHydration: true` (see “Hydration” below)

### 3) Hydration-safe Zustand reads (Next.js App Router)

Because persisted Zustand stores read from browser storage, naive access can cause Next.js hydration mismatch.

We use a small helper based on Zustand docs to delay rendering state-dependent UI until the client has mounted:

- Helper: `frontend/src/lib/zustand/use-store.ts`

## Data Flow (Landing → Dashboard)

1. User clicks CTA on Landing:
   - `useGuestFlowStore.getState().startFromLanding()`
   - Navigate to `/editor/new`

2. On dashboard routes, we mount `AuthBootstrap` once:
   - Rehydrates guest-flow store (because it uses `skipHydration`)
   - Resolves auth (`auth_session` + `/api/auth/me`)
   - If authenticated, clears guest-flow (`markAuthenticated()`)

3. Sidebar and user dropdown apply UI rules:
   - If **guest-from-landing** and **not authenticated**, hide “settings-like” navigation and show a “Create account” CTA.

## UI Rules Implemented

### Sidebar (`AppSidebar`)

File: `frontend/src/components/layout/app-sidebar.tsx`

Rule:
- If `guestEntry === "landing"` and user is **guest**, hide the entire `sidebar_settings` group.
- While `authResolved` is still false, **default to hiding** (prevents flicker where settings briefly appear).

### User menu (`UserNav`)

File: `frontend/src/components/layout/user-nav.tsx`

Rule for guest-from-landing:
- Show **Language toggle**
- Hide: Profile / Settings / Logout
- Show CTA: **“Tạo tài khoản”** linking to `/register`

## Routing / Middleware Notes (Temporary vs Intended)

File: `frontend/src/middleware.ts`

We currently have a **temporary bypass** allowing unauth access to:

- `/editor/new`
- `/templates`
- `/documents`

This is acknowledged as **not truly secure** (anyone can type the URL). The UX work above ensures that **if** a guest enters these routes via the Landing CTA, the sidebar/user menu won’t show confusing settings/actions.

**Recommended next step (security hardening):**
- Keep only `/editor/new` as guest-accessible.
- Move any guest-preview pages to a **public route group** (outside `(dashboard)` layout) with read-only APIs.

## What We Achieved

- **Clear distinction** between guest vs logged-in with `authResolved` to avoid UI flicker.
- **A deterministic “came from Landing” flag** (Zustand) that survives route transitions.
- **Cleaner guest experience** inside the dashboard layout:
  - Sidebar hides `sidebar_settings`
  - User menu becomes minimal and promotes account creation
- **Centralized logic** (no more manual comment/uncomment of nav items).

## QA Checklist

1. **Guest flow**
   - Open `/` (Landing) → click CTA → routed to `/editor/new`.
   - Sidebar does **not** show `sidebar_settings`.
   - User menu shows **Language** + **Tạo tài khoản** only.

2. **Logged-in flow**
   - With valid `auth_session`, open dashboard routes:
     - Sidebar shows `sidebar_settings`.
     - User menu shows Profile/Settings/Logout as usual.

3. **Hydration / flicker**
   - Refresh a dashboard route: settings group should not “flash” briefly for guest.
