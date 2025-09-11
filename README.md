# Deneme

## Purpose

A web-based shift and roster management system. Administrators can manage departments, employees, shift templates, schedules, and review availability or swap requests, while employees can view their assignments and submit availability changes.

## Tech Stack

- [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- Prisma ORM with a PostgreSQL database
- Vitest for unit testing

## Features

- Admin dashboard with quick statistics and recent assignments
- Manage departments, employees, shift templates, and schedules
- Review availability and swap requests, plus generate reports
- Employee portal to view weekly schedules and request availability changes

## Setup

### Requirements
- Node.js and npm
- Docker and Docker Compose (for the PostgreSQL database)

### Installation
```bash
npm install
```

### Environment variables
Create a `.env` file in the project root (or define variables in your shell):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE` | Base URL for API requests (defaults to `/api`) |
| `VITE_DEFAULT_EMAIL` | Default email pre-filled on the login form |
| `VITE_DEFAULT_PASSWORD` | Default password pre-filled on the login form |

### Database
Start the Postgres database:
```bash
docker compose up -d
```
This runs a PostgreSQL 16 container on port `5432`.

(Optional) Sync the schema and generate the Prisma client:
```bash
npx prisma generate
npx prisma db push
```

### Development server
```bash
npm run dev
```

### Tests
```bash
npm test
```

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production bundle |
| `npm run lint` | Lint the codebase with ESLint |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run unit tests with Vitest |

## Docker/Postgres

- Start services: `docker compose up -d`
- Stop services: `docker compose down`

