# Getting the Desktop Land Estimate live on portal.investorproperty.co.za

Written the evening before, so tomorrow is execution, not figuring things out.

## Deliberately separate from crmatrix

This is its own repo (`investorproperty`, not `serviceai-website`) and
should become its own Vercel project — a different import, not a second
domain hung off the existing crmatrix one. Nothing here touches that
project or its deployment.

## What's already true tonight

- Builds clean (`npm run build`).
- Every feature discussed this week is in: the map picker, development
  charges, CAPEX, the site-map image now embedded in the printed report,
  and the land-opportunity email send.
- `.env.example` lists every variable the app reads.
- **Not yet on GitHub.** `git remote -v` in this repo returns nothing —
  unlike the portal, this one has never been pushed anywhere. That's the
  one step only Morné can do (it needs his GitHub login), and it comes
  before anything else below.

## Steps, in order

1. **Create a GitHub repo.** github.com/new, e.g. `investorproperty`. Empty
   — nothing needs to be created on GitHub's side beyond the repo itself.
2. **Push this repo to it.**
   ```
   cd C:\dev\investorproperty
   git remote add origin https://github.com/<your-username>/investorproperty.git
   git push -u origin main
   ```
   (Or tell me the repo URL once created and I'll do this step.)
3. **Import into Vercel** — New Project → pick the new `investorproperty`
   repo. Root directory: leave as the repo root (unlike the portal, this
   one isn't in a subdirectory). Framework: Next.js, auto-detected.
4. **Environment variables**, from `.env.example`:
   - `RESEND_API_KEY` — the same key already in the portal's `.env.local`.
   - `CONTACT_FROM_EMAIL` — the address the contact form and land-opportunity
     emails send from. Needs to be on a domain verified in Resend; until
     `investorproperty.co.za` is verified there, both features still work
     and report success, but only log instead of actually sending.
   - `NEXT_PUBLIC_SITE_URL` — the eventual `portal.investorproperty.co.za`.
5. **Deploy.** A live `*.vercel.app` URL immediately, before any DNS work.
6. **Domain.** Project Settings → Domains → add
   `portal.investorproperty.co.za`. Vercel gives a CNAME record to add
   wherever `investorproperty.co.za`'s DNS is currently managed. Propagation
   is usually minutes, sometimes a few hours.

## Worth deciding before it's public

- **Verify the sending domain in Resend** if the contact form and the
  developer emails need to actually send rather than simulate — otherwise
  the site works perfectly and quietly never emails anyone.
- **No login gate yet** — the calculator is fully open, as designed for a
  free lead-generation tool. If that's still the intent for launch, nothing
  further is needed here.
