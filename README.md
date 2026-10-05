# Swastik Letter System - live setup (about 10 minutes)

## A. Supabase (database + login) - supabase.com, free
1. New project (any name, choose a DB password, region closest to you).
2. Authentication > Providers > Email > turn OFF "Confirm email" > Save.
3. SQL Editor > New query > paste all of `schema.sql` > Run. (Safe to re-run; it resets tables.
   If you tried the old version before: Authentication > Users > delete the old users.)
4. Project Settings > API: copy "Project URL" and the "anon public" key.

## B. config.js
Replace the two placeholder values with those, save.

## C. GitHub
1. github.com/chandankushwaha2077 > New repository (e.g. `swastik-letters`) > Public.
2. "uploading an existing file": drag ALL files from this folder (index.html, style.css, app.js, config.js ...) so they are at the TOP level of the repo > Commit.
3. Settings > Pages > Source: "Deploy from a branch" > Branch `main` / `/ (root)` > Save.
4. After ~1 minute: https://chandankushwaha2077.github.io/swastik-letters/

## D. First use
Open the link. The first screen is "First-time setup": create the Head Office admin ID + password right away.
Then: Branches & Branding > Branch Logins > create each branch's ID + password.
Never put the Supabase `service_role` key anywhere.
