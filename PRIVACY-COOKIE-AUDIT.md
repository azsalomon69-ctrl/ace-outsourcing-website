# Privacy and cookie implementation audit

Audit date: August 18, 2026

This is a factual implementation audit, not a claim of compliance with every law in every jurisdiction. Re-run it whenever analytics, advertising, application handling, Google Sheets, Google Drive, email delivery, or another provider is added.

## Cookie inventory

| Cookie | Classification | Set by | Purpose | Production attributes | Expiry |
| --- | --- | --- | --- | --- | --- |
| `ace_session` | Strictly necessary | ACE Render API through the same-origin Vercel `/api` proxy | Signed administrator session and CSRF binding | `HttpOnly`; `Secure`; `SameSite=Lax`; `Path=/api`; no `Domain` attribute | Maximum 8 hours, or immediate deletion on logout |

No public-page preference, analytics, advertising, marketing, or social-media cookies are set by ACE code.

## Browser storage

- No authentication credentials, passwords, session identifiers, or CSRF tokens are stored in `localStorage` or `sessionStorage`.
- The admin CSRF token is kept in JavaScript memory only and is lost when the page closes or reloads.
- Admin image uploads are read and resized in browser memory before being sent to the authenticated API.

## Trackers and third-party requests

- No Google Analytics, Tag Manager, Meta Pixel, LinkedIn Insight Tag, advertising SDK, heatmap, session replay, or marketing tracker was found.
- Google-hosted fonts were removed. The site now uses locally available system fonts and makes no font request to Google.
- Employee portraits and hero/background images previously loaded from the old WordPress site were replaced with local assets.
- Google Street View no longer loads on page view. The iframe is created only after the visitor selects **Load Street View**.
- Facebook, LinkedIn, and Google Maps are ordinary outbound links. No social SDK is embedded.
- Vercel serves the public site and proxies `/api`; Render serves the authenticated content API. Both providers can receive normal request metadata and operational logs.

## Form data

The client and careers forms are currently prototypes. Their fields and selected files remain in browser memory and are not submitted to Vercel, Render, Google, or ACE. The pages now state this visibly. The privacy notice must be changed before a working submission pipeline is enabled.

## Consent conclusion for the current build

The current build has one strictly necessary admin-session cookie and no non-essential cookies or trackers that execute automatically. A generic cookie banner would therefore be misleading and was not added. The optional Google Street View connection is disclosed immediately before the visitor activates it.

This conclusion must be revisited for the actual deployment jurisdictions and before any non-essential technology is enabled.

## Security findings implemented

- The session cookie is first-party through `/api`, scoped to `/api`, signed, `HttpOnly`, `Secure`, and `SameSite=Lax` in production.
- The cookie expires after no more than eight hours and is cleared using the same path on logout.
- The session payload no longer includes the administrator email address.
- Login rate limiting retains an IP address and attempt count in process memory for at most 15 minutes.
- State-changing API calls require the signed session and matching CSRF token.
- The Vercel Content Security Policy allows only same-origin scripts, styles, fonts, images, and API calls; Google frames remain allowed only for the visitor-activated map.

## Re-audit triggers

- Enabling contact or CV submission
- Adding Google Sheets, Drive, reCAPTCHA, email delivery, CRM, analytics, advertising, chat, video, or social embeds
- Changing the Vercel or Render domains
- Allowing administrators to embed externally hosted images
- Adding another administrator or user-facing accounts

