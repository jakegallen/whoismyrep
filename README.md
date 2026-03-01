# WhoIsMyRep.us

Find your U.S. representatives instantly — federal, state, and local. Search any address to see voting records, campaign finance, legislation, and more.

**Live site:** [whoismyrep.us](https://whoismyrep.us)

## Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Edge Functions + Auth)
- **Deployment:** Vercel (frontend), Supabase (edge functions)
- **Data:** OpenStates API, FEC API, Congress.gov API, Google Civic Information API

## Local development

```sh
# Install dependencies
npm install

# Start dev server
npm run dev
```

## Environment variables

Create a `.env.local` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Edge functions

Deployed to Supabase. To deploy:

```sh
npx supabase functions deploy <function-name>
```
