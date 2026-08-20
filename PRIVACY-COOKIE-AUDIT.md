# Privacy and cookie implementation audit

Audit date: August 20, 2026

This is a factual implementation audit, not a claim of compliance with every law in every jurisdiction. Re-run it whenever analytics, advertising, application handling, Google Sheets, Google Drive, email delivery, or another provider is added.

## Cookie inventory

| Cookie | Classification | Set by | Purpose | Production attributes | Expiry |
| --- | --- | --- | --- | --- | --- |
| `ace_login_clicks` | Strictly necessary | ACE Render API through the same-origin Vercel `/api` proxy | Signed, requester-bound progress for the discreet login-interface interaction; it is not authentication | `HttpOnly`; `Secure`; `SameSite=Strict`; `Path=/api`; no `Domain` attribute | 15 seconds, or immediate deletion when the interaction completes |
| `ace_login_access` | Strictly necessary | ACE Render API through the same-origin Vercel `/api` proxy | Signed, requester-bound permission to display and submit the login interface; it grants no administrator privileges | `HttpOnly`; `Secure`; `SameSite=Strict`; `Path=/api`; no `Domain` attribute | 2 minutes by default, or immediate deletion after successful authentication |
| `ace_session` | Strictly necessary | ACE Render API through the same-origin Vercel `/api` proxy | Signed administrator session and CSRF binding | `HttpOnly`; `Secure`; `SameSite=Lax`; `Path=/api`; no `Domain` attribute | Maximum 8 hours, or immediate deletion on logout |
| `ace_privacy_choice` | Preference | ACE public website | Remembers whether optional Google Street View may load | `Secure` on HTTPS; `SameSite=Lax`; website path | Maximum 180 days |

No analytics, advertising, marketing, or social-media cookies are set by ACE code.

## Browser storage

- No authentication credentials, passwords, session identifiers, or CSRF tokens are stored in `localStorage` or `sessionStorage`.
- The admin CSRF token is kept in JavaScript memory only and is lost when the page closes or reloads.
- Admin-selected image files are sent to the authenticated API. Validation, resizing, format conversion, quality-aware compression, Storage upload, and metadata writes are server-authoritative.

## Trackers and third-party requests

- No Google Analytics, Tag Manager, Meta Pixel, LinkedIn Insight Tag, advertising SDK, heatmap, session replay, or marketing tracker was found.
- Google-hosted fonts were removed. The site now uses locally available system fonts and makes no font request to Google.
- Employee portraits and hero/background images previously loaded from the old WordPress site were replaced with local assets.
- Google Street View no longer loads on page view. The iframe is created only after the visitor selects **Load Street View**.
- Facebook, LinkedIn, and Google Maps are ordinary outbound links. No social SDK is embedded.
- Vercel serves the public site and proxies `/api`; Render serves the authenticated content and image-processing API. Both providers can receive normal request metadata and operational logs.
- Supabase stores structured CMS content, media metadata, and optimized public website images. Public pages request those published images directly from Supabase Storage; Supabase secret credentials remain on Render.

## Form data

The client and careers forms are currently prototypes. Their fields and selected files remain in browser memory and are not submitted to Vercel, Render, Google, or ACE. The pages now state this visibly. The privacy notice must be changed before a working submission pipeline is enabled.

## Consent conclusion for the current build

The current build has two very short-lived cookies for the login-interface entry flow, one administrator-session cookie, one Street View preference cookie, and no analytics or advertising trackers. The login-entry cookies do not authenticate a visitor or grant administrator access. The branded privacy-choice panel controls whether optional Google Street View loads.

This conclusion must be revisited for the actual deployment jurisdictions and before any non-essential technology is enabled.

## Security findings implemented

- The session cookie is first-party through `/api`, scoped to `/api`, signed, `HttpOnly`, `Secure`, and `SameSite=Lax` in production.
- The login-interface cookies are first-party through `/api`, requester-bound, signed, `HttpOnly`, `Secure`, and `SameSite=Strict` in production. They expire after 15 seconds and 2 minutes respectively and cannot authorize an admin API operation.
- The cookie expires after no more than eight hours and is cleared using the same path on logout.
- The session payload no longer includes the administrator email address.
- Login rate limiting retains an IP address and attempt count in process memory for at most 15 minutes.
- State-changing API calls require the signed session and matching CSRF token.
- The Vercel Content Security Policy allows same-origin resources, published images from Supabase Storage, and the Storage verification request used during the authenticated migration. Google frames remain limited to the map integration.

## Re-audit triggers

- Enabling contact or CV submission
- Adding Google Sheets, Drive, reCAPTCHA, email delivery, CRM, analytics, advertising, chat, video, or social embeds
- Changing the Vercel or Render domains
- Allowing administrators to embed externally hosted images
- Adding another administrator or user-facing accounts
