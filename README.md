# fluentcpa.com — new website (draft)

A replacement for the Google Sites site at www.fluentcpa.com. Plain HTML and CSS:
no site builder, no plugins, nothing to update or patch. Same colours, fonts and logo
mark as the client portal (portal.fluentcpa.com), so the two feel like one firm.

**Status (2026-10-11): draft on this computer only. Nothing is published, and
www.fluentcpa.com still shows the Google Sites site.**

| File | What it is |
|---|---|
| `index.html` | The whole site on one page: services, who we work with, how it works, planning, about, reviews, contact and hours |
| `start.html` | "Become a client": a 2-minute questionnaire for people who aren't clients yet. **Preview only.** `SUBMIT_URL` is empty, so nothing is sent |
| `assets/site.css` | All styles, shared by both pages |
| `assets/` | Logo mark, tab icons, the headshot. All taken from the current Google Sites site |

## What was kept from the old site
- Services (all eight)
- The About text (lightly edited)
- All five testimonials (spelling fix: "bookkeeping")
- Phone, email and LinkedIn
- Hours
- The 30-minute booking link (Google Calendar)
- The vCard link
- The logo and the "Maximizing Your Dollar" tagline
- The headshot

## What was dropped
- The stock photos
- The "Business Health Assessment" button: its link is dead (Netlify "Not Found")
- The contact icons image
- The Google Sites "Report abuse" footer

## Preview it
Run `node serve.js <this folder> 8766` from any small static server, then open
http://localhost:8766. Opening `index.html` directly also mostly works.

## Going live (only when the firm says so)

**Host.** GitHub Pages, the same as the client portal. It's free, fast and on HTTPS.

1. Create a repository (e.g. `infofluentcpa/fluent-website`).
2. Push this folder to it.
3. Turn on Pages (main branch, root).
4. Add a `CNAME` file containing `www.fluentcpa.com`.

**DNS (Squarespace Domains → fluentcpa.com → DNS).**
- `www`: a CNAME pointing to `infofluentcpa.github.io`. This replaces the Google Sites record.
- The bare domain `fluentcpa.com`: keep forwarding it to `https://www.fluentcpa.com`, or point it at GitHub with A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`.
- **Do not touch the MX records.** Email (Google Workspace) depends on them.
- Leave `portal` as it is.

**Finish.**
1. In GitHub Pages settings, tick "Enforce HTTPS" once the certificate is issued.
2. In Google Sites, remove the custom domain. Keep the old site unpublished for a while as a backup.

## Connecting "Become a client"
This needs a `prospect` action in the Apps Script web app. It would:
- Write a row to a new Prospects tab.
- Email info@.
- Show the prospect in the console with "Invite as client".

Then put the web app's `/exec` address in `SUBMIT_URL` in `start.html`.

The page already has:
- A spam trap (a hidden field plus a 3-second minimum).
- Validation.
- A no-SSN warning.
