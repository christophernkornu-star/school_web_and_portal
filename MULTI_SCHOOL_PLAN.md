# Multi-School Expansion Plan

This document outlines the roadmap for converting the application from a single-school system to a multi-tenant platform.

## 1. Database Architecture
**Goal:** Centralize school identities.

*   **New Table:** `schools` (or `tenants`)
    *   `id` (UUID, Primary Key)
    *   `name` (Text)
    *   `slug` (Text, Unique) - for URL identification (e.g., `biriwa`)
    *   `logo_url` (Text)
    *   `banner_url` (Text)
    *   `theme_config` (JSONB) - stores colors and font settings
    *   `address`, `contact_email`, `contact_phone`
*   **Data Association:**
    *   Future migration: Add `school_id` column to tables like `students`, `teachers`, `classes`, `subjects`.

## 2. Branding & Theming (Dynamic Styling)
**Goal:** Allow styling to change based on the active school.

*   **Tailwind Configuration:**
    *   Update `tailwind.config.js` to use CSS variables instead of hardcoded hex codes.
    *   Example: `colors: { primary: 'var(--school-primary)', ... }`
*   **Theme Provider:**
    *   Create a `<SchoolThemeProvider />` component.
    *   Fetches `theme_config` from the database.
    *   Injects CSS variables into the root `:root` or `<body>` element.

## 3. Frontend Implementation
**Goal:** Remove hardcoded text and logos.

*   **School Context:**
    *   Create a React Context (`SchoolContext`) to hold the current school's data.
    *   Wrap the application layout in this provider.
*   **Component Updates:**
    *   Refactor usage of "Biriwa Methodist" string to use `{school.name}`.
    *   Refactor `SiteHeader.tsx` to use `{school.logo_url}`.

## 4. Routing & Access
**Goal:** Determine which school to show.

*   **Option A: Subdomains** (Recommended for scale)
    *   `school1.domain.com`, `school2.domain.com`.
    *   Requires Middleware to parse hostname.
*   **Option B: Path-based**
    *   `domain.com/school1/dashboard`.
    *   Simpler DNS setup, but changes all routes.

## Implementation Steps (When ready)
1.  **Database:** Create the `schools` table and populate it with the current school (Biriwa) as the default.
2.  **Config:** Refactor Tailwind to use CSS variables.
3.  **State:** Build the `SchoolContext` and `ThemeProvider`.
4.  **Refactor:** Systematically replace hardcoded strings and images.
