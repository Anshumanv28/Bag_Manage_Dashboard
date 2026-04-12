This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This app lives under **`web-app/`** in the monorepo. In Vercel → Project → **Settings → General → Root Directory**, set **`web-app`**. Framework preset **Next.js** is detected automatically.

1. Connect the Git repository and set the root directory to **`web-app`**.
2. Under **Settings → Environment Variables**, add for **Production** (and **Preview** if you use the dashboard on preview URLs):
   - **`BACKEND_ORIGIN`** — e.g. `http://3.109.235.112:3040` (or omit if you rely on committed `.env.production`).
   - **`ADMIN_API_KEY`** — same value the backend expects for `x-admin-key` on admin API routes (mark as **Sensitive**).
3. Deploy. Build command is `next build` (default). In Vercel → **Settings → General → Node.js Version**, choose **20.x** or newer (`package.json` `engines`).

The dashboard calls the backend through **`/api/backend/*`** (server-side proxy). See `.env.example` for local development.

On **Vercel Hobby**, serverless routes have a **~10s** execution limit; if admin API calls time out, upgrade the plan or add `export const maxDuration = 60` in `src/app/api/backend/[...path]/route.ts` (supported on Pro).

More detail: [Next.js on Vercel](https://nextjs.org/docs/app/building-your-application/deploying).
