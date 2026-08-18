# Asset, licensing, and trademark register

Audit date: August 18, 2026

This register records provenance known from the project history. It does not convert an unverified asset into an authorized asset. ACE should retain written licenses, releases, employment-policy authority, or client approvals outside the public repository.

## Status key

- **Project-authored**: original HTML, CSS, and JavaScript created for this repository.
- **Company-supplied, permission not independently verified**: supplied in the ACE project conversation or copied from ACE-controlled materials, but no signed release or license was available to the developer.
- **Third-party mark, approval required**: a logo, name, quotation, or testimonial that may identify another organization or person and should not be published without appropriate approval.

## Asset groups

| Files or content | Intended use | Recorded source | Audit status and required action |
| --- | --- | --- | --- |
| `frontend/assets/ACE.png`, `Assets/logos/ACE.png` | ACE logo and favicon | Supplied by the user for ACE | Company-supplied. Confirm ACE owns or is authorized to use the logo. The duplicate should remain byte-identical or one copy should be removed later. |
| `frontend/assets/team-kristine.png`, `team-ash.png`, `team-rose.png`, `team-byron.png` | Employee profile cards | User-supplied portrait attachments | Company-supplied, permission not independently verified. Confirm each depicted person has approved website publication of their photo, name, role, and quotation. |
| `frontend/assets/dinner-night-out.png` | Team journal | User-supplied event image | Company-supplied, permission not independently verified. Confirm photographer ownership and participant publication rights. |
| `frontend/assets/recognition-01.png` through `recognition-13.png` | Recognition gallery | User-supplied event images | Company-supplied, permission not independently verified. Confirm photographer ownership, participant releases or another applicable basis, and that certificates do not expose unnecessary personal information. |
| `frontend/assets/black-valentines-01.png` through `black-valentines-15.png` | Valentine event gallery | User-supplied event images | Company-supplied, permission not independently verified. Confirm photographer ownership and participant publication rights. Visible third-party products and marks are incidental; do not imply sponsorship. |
| `frontend/assets/christmas-01.png` through `christmas-09.png` | Christmas event gallery | User-supplied event images | Company-supplied, permission not independently verified. Confirm photographer ownership and participant publication rights. Visible products and marks are incidental; do not imply sponsorship. |
| `frontend/assets/bpo-full-service-01.png`, `bpo-full-service-02.png`, `careers-team-training.png`, `service-bpo.png`, `service-seat-lease.png`, `service-recruitment.png`, `service-talent-sourcing.png`, `seat-lease-01.png` through `seat-lease-03.png`, `recruitment-01.png` through `recruitment-04.png`, `team-journal-intro.png` | Service, office, recruitment, hero, and careers visuals | User-supplied ACE workplace images | Company-supplied, permission not independently verified. Confirm photographer ownership, depicted-person permissions, and authority to show screens, documents, offices, and building signage. |
| `frontend/assets/be-there-solutions.png` and the Jenny M. testimonial | Client testimonial | User-supplied | Third-party mark and endorsement. Obtain and retain written permission for the logo, person’s name, company name, quotation, rating, and public endorsement. |
| `frontend/assets/figshelf.png` and the Adam J. testimonial | Client testimonial | User-supplied | Third-party mark and endorsement. Obtain and retain written permission for the logo, person’s name, company name, quotation, rating, and public endorsement. |
| `frontend/assets/green-marketing.png` and the Shai A. testimonial | Client testimonial | User-supplied | Third-party mark and endorsement. Obtain and retain written permission for the logo, person’s name, company name, quotation, rating, and public endorsement. |
| Text-only “f” and “in” social link glyphs | Links to ACE social profiles | Project-authored text treatment | No copied icon artwork is distributed. Facebook and LinkedIn names remain third-party trademarks and are used only to identify destination services. Do not imply platform endorsement. |
| Google Street View embed | Optional location view | Google Maps embed loaded after visitor action | Google is a third-party service. Its own map interface supplies required attribution. Use is subject to Google’s applicable terms; no Google map imagery is copied into the repository. |
| `frontend/assets/fonts/Montserrat-Variable.ttf`, `OpenSans-Variable.ttf`, and their `*-OFL.txt` files | Typography | Official Google Fonts repository | Self-hosted under the SIL Open Font License 1.1. Montserrat is used for headings and interface labels; Open Sans is used for body copy and forms. Preserve both included license files. No visitor request is sent to Google to load these fonts. |
| `frontend/*.html`, `frontend/ace.css`, `frontend/*.js`, `backend/*.mjs` | Site and API code | Project-authored for ACE | Project-authored. No third-party JavaScript or CSS library was found. |
| `backend/package.json`, `backend/package-lock.json` | Node runtime declaration | Project-authored | No npm runtime dependencies are installed. The backend uses Node.js built-in modules only. |

## Removed or avoided sources

- Hotlinked employee photographs from `ace-outsourcing.com` were replaced with local user-supplied copies to avoid disclosing visitor requests to the old WordPress host.
- Hotlinked WordPress hero and panel images were replaced with local ACE workplace images.
- Montserrat and Open Sans are self-hosted with their SIL Open Font License files. No remote Google Fonts request is part of the deployed site.
- No images were taken from Google Search, social media, or GitHub during this audit.

## Publication blockers to resolve internally

1. Confirm written authority for every employee and event photograph and every named employee quotation.
2. Confirm photographer or copyright ownership for all company and event images.
3. Obtain explicit client approval for each logo, testimonial, identity, five-star rating, and implied endorsement.
4. Confirm ACE logo ownership or authorization.
5. Review photographs for screens, certificates, documents, badges, or other personal or confidential information before publication.
6. Store evidence of permissions and licenses in an internal system, not in this public repository.

Until those checks are documented, the affected materials remain flagged rather than assumed safe.
