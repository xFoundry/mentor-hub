# Mentor Hub

A mentorship portal for managing mentorship programs at xFoundry. Connects students, mentors, and staff through sessions, tasks, and feedback tracking.

## Purpose

Mentor Hub provides a centralized platform for:
- **Students** to track their mentorship sessions, action items, and team progress
- **Mentors** to manage their mentees, schedule sessions, and assign tasks
- **Staff** to oversee all program activity, manage teams, and support users

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Authentication | Auth0 Next.js SDK v4 |
| Data | BaseQL (GraphQL → Airtable) |
| State | SWR for data fetching |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Auth0 application credentials
- BaseQL API access

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=          # Generate with: openssl rand -hex 32
APP_BASE_URL=http://localhost:3000

# Auth0 M2M (for Management API)
AUTH0_M2M_DOMAIN=      # Actual tenant domain (not custom domain)
AUTH0_M2M_CLIENT_ID=
AUTH0_M2M_CLIENT_SECRET=

# BaseQL
NEXT_PUBLIC_BASEQL_API_URL=
NEXT_PUBLIC_BASEQL_API_KEY=

# Development
NEXT_PUBLIC_USE_AUTH_MOCK=true
NEXT_PUBLIC_MOCK_USER_EMAIL=your-email@example.com
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (authenticated)/    # Protected routes (dashboard, sessions, tasks, etc.)
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   └── api/                # API routes
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── dashboards/         # Role-specific dashboards
│   ├── sessions/           # Session management
│   ├── tasks/              # Task/action item views
│   └── teams/              # Team management
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities (auth, baseql, permissions)
├── contexts/               # React contexts
└── types/                  # TypeScript types
```

## Authentication Flow

1. User enters email on login/signup page
2. Email is verified against BaseQL contacts database
3. If contact exists:
   - Has Auth0 account → Show sign-in options
   - No Auth0 account → Redirect to signup
4. User authenticates via Google OAuth or passwordless code
5. Role determined from participation records in Airtable

## Documentation

- See `docs/AUTH0-GUIDE.md` for Auth0 configuration details
- See `CLAUDE.md` for AI assistant context
