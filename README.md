# TerrainForge

A modern SaaS platform for landscaping companies built with React, Vite, and TypeScript.

## Project Structure

```
terrainforge/
├── src/
│   ├── components/
│   │   ├── layout/        # Layout components (Sidebar, PageHeader)
│   │   ├── shared/        # Reusable components (Modal, AlertBanner, Badge, KPICard)
│   │   └── ui/            # Base UI components (Button, Input, Select, Textarea)
│   ├── pages/             # Page components (8 main routes)
│   ├── stores/            # Zustand state management
│   ├── services/          # API integrations (Supabase, Stripe, Anthropic)
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions (formatting, dates, validation)
│   ├── types/             # TypeScript type definitions
│   ├── lib/               # Business logic and constants
│   ├── App.tsx            # Main app with routing
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles with Tailwind
├── supabase/
│   └── migrations/        # Database schema migrations
├── public/                # Static assets
├── index.html             # HTML template
└── package.json           # Dependencies

```

## Tech Stack

- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **State Management**: Zustand
- **Routing**: React Router v6
- **Database**: Supabase
- **Payments**: Stripe (placeholder)
- **PDF Export**: React-PDF
- **Maps**: Leaflet + react-leaflet
- **Icons**: Lucide React
- **Analytics**: Sentry + PostHog (placeholders)

## Getting Started

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file based on `.env.example`:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PK=your-stripe-key
VITE_POSTHOG_KEY=your-posthog-key
VITE_SENTRY_DSN=your-sentry-dsn
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Pages (8 Main Routes)

1. **Dashboard** (`/`) - Overview and KPIs
2. **Projects** (`/projects`) - Project management
3. **Materials** (`/materials`) - Material library and inventory
4. **Manifest** (`/manifest`) - Work manifest generation
5. **Work Orders** (`/work-orders`) - Task management
6. **Price Research** (`/price-research`) - Material pricing
7. **Crew** (`/crew`) - Team management
8. **Equipment** (`/equipment`) - Equipment tracking

## Components

### Layout
- `Sidebar` - Navigation sidebar with 8 primary routes
- `PageHeader` - Reusable page header with title and actions

### Shared Components
- `Modal` - Dialog component with confirm/cancel
- `AlertBanner` - Alert messages (error, success, info, warning)
- `Badge` - Status indicators
- `KPICard` - Key performance indicator card

### UI Components
- `Button` - Primary CTA button component
- `Input` - Text input field
- `Select` - Dropdown select
- `Textarea` - Multi-line text input

## State Management (Zustand Stores)

- `projectStore` - Project data and selection
- `materialStore` - Material inventory
- `crewStore` - Crew member management
- `equipmentStore` - Equipment tracking
- `uiStore` - UI state (sidebar, modals, active page)

## Services

- `supabase.ts` - Supabase client and CRUD operations
- `stripe.ts` - Stripe payment integration
- `anthropic.ts` - AI-powered features (project naming, cost estimation, manifest generation)

## Custom Hooks

- `useAsync` - Async operation management with loading states
- `useForm` - Form state and validation

## Utilities

- `formatting.ts` - Currency, numbers, percentages, text formatting
- `dates.ts` - Date manipulation and formatting
- `validation.ts` - Input validation helpers

## Color Theme

The app uses a sophisticated dark theme with these primary colors:

- **Primary**: Green (#2D6A4F) and Green Light (#74C69D)
- **Secondary**: Blue (#2563EB), Purple (#7C3AED), Amber (#D97706), Teal (#0D9488)
- **Surface**: Dark surface (#111810) with surface-2 variant (#161E14)
- **Borders**: Custom border colors (#1E3A2A, #2A4A38)
- **Text**: Gradient from main text (#CDE8D8) to subtle text-4 (#2D4A38)

## Database Schema

The Supabase schema includes tables for:
- Projects
- Materials
- Crew Members
- Equipment
- Work Orders
- Manifests
- Price Quotes
- Users

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

## Development Notes

- All components are functional components with TypeScript
- State management uses Zustand for lightweight, scalable state
- Tailwind CSS with custom theme configuration for consistent styling
- Path alias `@/` maps to `src/` directory
- Environment variables are type-safe with `vite-env.d.ts`
