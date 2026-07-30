# Nathan Graham | Systems Studio

Static GitHub Pages site for Nathan Graham.

## Current Structure

- `/` homepage for the Systems Studio framing
- `/systems/`, `/builds/`, `/studio/`, `/writing/` track pages
- `/work/` filterable work index
- `/about/`, `/now/`, and `/contact/` supporting pages
- `/data/site.json` for tracks, homepage prompts, and featured-work settings
- `/data/items.json` for the artifact inventory
- `/data/posts.json` for the build-time Digital Born feed snapshot
- `/assets/css/main.css` and `/assets/js/script.js` for the shared front-end shell
- `/scripts/fetch-digitalborn-posts.mjs` to refresh the writing feed data

## Notes

- The site is still static-first and dependency-free.
- Digital Born remains the writing source, but the homepage and writing page now read from a build-time JSON snapshot.
- Run `node scripts/check-site.mjs` before publishing to validate local routes, metadata, and artifact data.
- `AGENTS.md` and `CLAUDE.md` are local-only and intentionally untracked.
