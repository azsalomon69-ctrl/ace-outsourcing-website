# Third-party notices

Audit date: August 20, 2026

The deployed frontend contains one self-hosted third-party interface library. It does not use third-party CSS frameworks, videos, music, or stock-animation packages.

The footer animations use **LottieFiles Lottie Player 2.0.4**, distributed under the MIT License. The preserved license is at `frontend/vendor/lottiefiles/LICENSE`. The player loads from the ACE website itself. The three animation files in `frontend/assets/lottie-*.json` were authored specifically for this project and do not come from the LottieFiles animation marketplace.

The following Google Fonts are self-hosted by this website under the SIL Open Font License 1.1:

- **Montserrat**, with its license preserved at `frontend/assets/fonts/Montserrat-OFL.txt`.
- **Open Sans**, with its license preserved at `frontend/assets/fonts/OpenSans-OFL.txt`.

The font files load from the ACE website itself. Visitors do not connect to Google merely to render these fonts.

The Render backend uses these open-source runtime libraries:

- **Supabase JavaScript**, distributed under the MIT License, for server-side PostgreSQL and Storage access.
- **busboy**, distributed under its included MIT-style license, for bounded streaming multipart parsing.
- **sharp**, distributed under the Apache License 2.0, for authoritative image validation, resizing, and WebP encoding.

Exact resolved versions and transitive dependencies are recorded in `backend/package-lock.json`. Their package license files remain in the installed dependency distribution.

The site can connect to these external services:

- **Vercel** for public hosting and the same-origin API proxy. See the [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy).
- **Render** for the administrative API. See the [Render Privacy Policy](https://render.com/privacy).
- **Google Street View**, only after a visitor asks to load it. See the [Google Privacy Policy](https://policies.google.com/privacy) and applicable Google Maps terms.
- **Facebook** and **LinkedIn** through ordinary outbound links to ACE profiles.

Names and logos belonging to clients, platforms, product manufacturers, and other organizations remain the property of their respective owners. Their appearance does not by itself indicate sponsorship or endorsement of ACE. Client logos, testimonials, ratings, and identities require separate permission as recorded in `ASSET-LICENSE-REGISTER.md`.
