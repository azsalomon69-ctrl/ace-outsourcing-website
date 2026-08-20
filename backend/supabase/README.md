# Supabase content storage

The files in `migrations/` are the approved content and media schema for the ACE website. Run them in numerical order.

The migration intentionally creates no browser-facing table policies. Public pages continue to call the Render API, and only Render receives `SUPABASE_SECRET_KEY`.

Required Render variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_STORAGE_BUCKET` (optional; defaults to `site-media`)
- `MAX_UPLOAD_BYTES` (optional; defaults to 15 MiB)
- `IMAGE_TARGET_KB` (optional; defaults to 100 and is treated as a quality-aware target)

The SQL migration must be applied before enabling database-backed editing. Repository images remain in place until an authorized administrator completes the migration, confirms publishing rights, and verifies the Storage-backed website output.

## Deployment order

1. In the Supabase SQL Editor, run each migration in numerical order. Existing projects must run `002_job_application_url.sql`; new projects should run both `001_content_cms.sql` and `002_job_application_url.sql`.
2. Confirm the six content tables exist and the public `site-media` bucket exists.
3. Keep `SUPABASE_SECRET_KEY` only in Render. It must never be added to Vercel, `frontend/config.js`, browser JavaScript, or Git.
4. Deploy the Render API, then confirm `/health` reports `database: configured`.
5. Log in through the website admin. On a database with no content, the admin shows the one-time migration panel.
6. After the authorized administrator confirms the required company-photo and client-testimonial permissions, run the migration. Each image is fetched from the deployed website, sent to Render, validated, optimized, uploaded to Storage, inserted into `media_assets`, fetched back for verification, and only then referenced by the content rows.
7. Check the public homepage, careers page, and every journal gallery. The original PNG files stay in the repository throughout this phase and are not automatically deleted.

The migration is retry-safe for matching optimized images because the backend reuses an existing `media_assets` row with the same category and SHA-256 digest.

## Image behavior

- Upload input is limited to 15 MiB and 40 megapixels by default.
- JPEG, PNG, WebP, and AVIF are accepted; animated images are rejected.
- EXIF orientation is applied, dimensions are reduced only when appropriate, and images are encoded as WebP.
- The configured approximately 100 KB value is a target. The encoder stops at the category quality floor even when that produces a larger file.
- Only the optimized file is stored for new admin uploads. Large originals are not retained by the API.
- Deleting a media asset is refused while any employee, testimonial, blog, gallery, or job record still references it.
