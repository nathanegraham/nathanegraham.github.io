# Nathan Graham

Static GitHub Pages site for Nathan Graham.

## Current Structure

- `/` single-page site organized as About, Projects, Writing, and Music
- `/work/`, `/about/`, `/systems/`, `/builds/`, `/studio/`, `/writing/`, `/now/`, and `/contact/` compatibility redirects to homepage sections
- `/work/<project>/` permanent detail pages for selected projects, writing, and music
- `/data/site.json` for the shared category vocabulary used by validation
- `/data/items.json` for the artifact inventory
- `/data/posts.json` for the build-time Digital Born feed snapshot
- `/assets/css/main.css` and `/assets/js/script.js` for the single-page experience and detail-page shell
- `/scripts/fetch-digitalborn-posts.mjs` to refresh the writing feed data

## Notes

- The site is still static-first and dependency-free.
- Digital Born remains the writing source, while the homepage reads from a build-time JSON snapshot.
- Ambient bird animations are CSS/SVG and respect `prefers-reduced-motion`.
- Run `node scripts/check-site.mjs` before publishing to validate local routes, metadata, and artifact data.
- `AGENTS.md` and `CLAUDE.md` are local-only and intentionally untracked.
