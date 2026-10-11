# fluentcpa.com — new website (draft)

A replacement for the Google Sites site at www.fluentcpa.com. Plain HTML and CSS:
no site builder, no plugins, nothing to update or patch. Same colours, fonts and logo
mark as the client portal (portal.fluentcpa.com), so the two feel like one firm.

**Status (2026-10-11): published from github.com/infofluentcpa/fluent-website (GitHub Pages, free). The `CNAME` file connects it to www.fluentcpa.com; the switch completes when the www DNS record points at infofluentcpa.github.io (Squarespace). The bare fluentcpa.com already forwards to www.**

| File | What it is |
|---|---|
| `index.html` | The whole site on one page: services, who we work with, how it works, planning, about, reviews, contact and hours |
| `start.html` | "Become a client": a 2-minute questionnaire for people who are not clients yet. Until `SUBMIT_URL` is set it sends by email: the visitor's email app opens a filled-in message to info@fluentcpa.com |
| `assets/site.css` | All styles, shared by both pages |
| `assets/` | Logo mark, tab icons, the headshot. All taken from the current Google Sites site |
| `assets/fluent-financials.vcf` | The contact card ("Save to my contacts"): name, firm, phone, email, website, LinkedIn and the logo |
| `assets/contact-qr.svg` | The QR code, styled like the firm's original (rounded corner squares, bar-style dots, logo in the middle). It opens `fluentcpa.com/card` |
| `card/index.html` | The online contact card the QR opens: on a phone it offers "Add to contacts" straight away, with big Call / Email / Book / Website / LinkedIn buttons |
| `tools/contact.js` | Builds the contact card and the QR from one set of details (`node tools/contact.js`). `--test` (19/19) checks the QR maker against published reference values, decodes the finished code, and proves the logo covers less than level-H error correction can rebuild. `--card-url <address>` points the QR somewhere else, for example a preview address |

**Rendering check (done 2026-10-11):** the styled QR was rendered by Edge and every one of its 1,008 modules outside the logo matched the true pattern at its centre.

**The QR only works once the site is live** at the address it encodes. When publishing to a temporary address first, rebuild it with `--card-url` pointing there, then rebuild it again at go-live.

**Contact card behaviour.** On a phone, the QR is hidden. Instead, a big "Save to my contacts" card appears in the contact section, and a bar stays at the bottom of the screen (Call | Save contact | Email). The bar steps aside while the save card is on screen. On a computer, the QR shows, with a download link for Outlook, Apple
Contacts or Google Contacts. Nothing depends on an outside service.

**Address: deliberately not shown.** Meetings and drop-offs are by appointment ("call or
email and we'll set a time").

## What was kept from the old site
- Services (all eight)
- The About text (lightly edited)
- All five testimonials (spelling fix: "bookkeeping")
- Phone, email and LinkedIn
- Hours
- The booking link (Google Calendar, 15-minute fit check)
- The vCard link, now rebuilt on our own site with a QR code
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
