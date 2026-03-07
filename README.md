# Music Madness

## First-time setup

### 1. Set up the database
1. Go to your Supabase dashboard → SQL Editor → New Query
2. Paste and run the contents of `supabase-schema.sql`
3. Run a second query with the contents of `supabase-functions.sql`

### 2. Install and run locally
Open Terminal in the `music-madness` folder:

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### 3. Deploy to Vercel
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Leave all settings as default → Deploy
4. Vercel gives you a shareable URL instantly

## Advancing the bracket day-by-day

When a voting day ends, go to Supabase → SQL Editor and run:

```sql
-- Close day 3 and set winners
update matchups set locked = true where day = 3;
update matchups set winner = 'a' where id = 9;   -- Le Freak wins
update matchups set winner = 'b' where id = 10;  -- etc.

-- Open day 4
update matchups set locked = false where day = 4;
```

Then update `CURRENT_DAY` in `src/App.jsx` to match.
