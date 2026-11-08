# Modern POS Management System (Frontend)

Next.js (App Router) + TypeScript + Tailwind CSS + Recharts + React Hook Form + Zod + Zustand.
Frontend with Next.js API routes backed by Supabase (or in-memory mock data), ready to switch to a Java Spring Boot REST API.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

Demo logins (any password with 4+ characters):

| Role    | Email               | Access                                   |
| ------- | ------------------- | ---------------------------------------- |
| Admin   | admin@pos.example   | everything                               |
| Manager | manager@pos.example | all except Employees                     |
| Cashier | cashier@pos.example | POS, Orders, Customers                   |

## Modules

Dashboard, POS (cart, discount, tax, customer, Cash/Card/QR, printable receipt), Products, Categories,
Inventory (stock in/out/adjust, history), Orders, Customers, Suppliers, Purchases (receive adds stock),
Employees, Reports (8 reports, date range, CSV/PDF export), Settings, Profile, Login / Forgot / Reset password.

## Supabase

The app ships with Next.js API routes (`src/app/api`) that store everything in Supabase.

1. Create a project at [supabase.com](https://supabase.com).
2. Go to your Supabase project dashboard -> **SQL Editor** -> **New query**.
3. Copy and run the SQL from [`supabase/schema.sql`](supabase/schema.sql). This creates all 8 tables (`products`, `categories`, `customers`, `suppliers`, `employees`, `orders`, `purchases`, `stock_movements`), sets up RLS policies, and creates the `pos-images` storage bucket.
4. Copy the env file and add your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # optional, recommended for server-side routes
   NEXT_PUBLIC_API_URL=/api
   NEXT_PUBLIC_USE_MOCK=false
   ```
5. `npm run dev`. Empty tables are auto-filled with sample seed data on the first request (set `SUPABASE_SEED=false` to disable).

Tables: `products`, `categories`, `customers`, `suppliers`, `employees`, `orders`, `purchases`, `stock_movements`. Set `NEXT_PUBLIC_USE_MOCK=true` to switch to in-memory mock data without any database.

### Images

Product images and the store logo are uploaded to `POST /api/upload` (PNG/JPEG/WebP/GIF, max 5MB) and stored in the Supabase Storage bucket (`pos-images`). The upload returns the public Supabase CDN URL.

### Security note

The API routes are not authenticated yet, and login is still a mock (`src/store/auth-store.ts`).
Before deploying anywhere public, add real authentication (e.g. Supabase Auth, JWT or sessions) and check the user role in the route handlers.

## Connecting a Spring Boot backend later

Set `NEXT_PUBLIC_API_URL=http://localhost:8080/api` and keep `NEXT_PUBLIC_USE_MOCK=false`.
`src/services` then calls these endpoints on the Java API instead:

| Service          | Endpoints                                             |
| ---------------- | ----------------------------------------------------- |
| products         | GET/POST `/products`, GET/PUT/DELETE `/products/{id}` |
| categories       | `/categories`                                         |
| customers        | `/customers`                                          |
| suppliers        | `/suppliers`                                          |
| employees        | `/employees`                                          |
| orders           | `/orders`                                             |
| purchases        | `/purchases`                                          |
| stock-movements  | `/stock-movements`                                    |
| image upload     | POST `/upload` (multipart field `file`) -> `{ "url": "..." }` |

The Axios client (`src/lib/api-client.ts`) sends `Authorization: Bearer <token>` from `localStorage["pos_token"]`.

## Structure

```
src/
  app/            login, forgot/reset-password, (app)/<modules>
  components/     layout, sidebar, navbar, dashboard, pos, products, tables, forms, dialogs, charts, ui
  hooks/          use-resource (loading/error + CRUD with toasts)
  lib/            api-client, mock-data, analytics, export, utils
  services/       CRUD services (mock or REST)
  store/          auth, cart, settings, ui (Zustand)
  types/ constants/
```

## Notes

- Fonts use the system stack (no Google Fonts dependency).
- In mock mode data resets on refresh; with MongoDB it persists. Settings and login persist in localStorage.
- PDF export opens the browser print dialog; choose "Save as PDF".
