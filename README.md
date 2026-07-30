# Nathan Graham

Static GitHub Pages site for Nathan Graham.

## Current Structure

- `/` homepage for recent writing and selected work
- `/work/` unified, filterable work archive
- `/about/` background, current focus, and contact information
- `/systems/`, `/builds/`, `/studio/`, `/writing/`, `/now/`, and `/contact/` compatibility redirects for old links
- `/data/site.json` for work filters and homepage featured-work settings
- `/data/items.json` for the artifact inventory
- `/data/posts.json` for the build-time Digital Born feed snapshot
- `/assets/css/main.css` and `/assets/js/script.js` for the shared front-end shell
- `/scripts/fetch-digitalborn-posts.mjs` to refresh the writing feed data

## Notes

- The site is still static-first and dependency-free.
- Digital Born remains the writing source, while the homepage reads from a build-time JSON snapshot.
- Run `node scripts/check-site.mjs` before publishing to validate local routes, metadata, and artifact data.
- `AGENTS.md` and `CLAUDE.md` are local-only and intentionally untracked.
