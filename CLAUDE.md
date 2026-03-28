# CLAUDE.md — Nathan Graham's Personal Website

## Project Overview

This is Nathan Graham's personal website, hosted on GitHub Pages at **nathanegraham.github.io**. It serves as a professional portfolio and blog aggregator, pulling posts from his WordPress site at digitalborn.org via the WP REST API.

## Owner

- **Name:** Nathan Graham
- **Email:** goingforwater@gmail.com
- **WordPress Blog:** https://digitalborn.org
- **GitHub:** nathanegraham

## Architecture

- **Hosting:** GitHub Pages (static site, deployed automatically on push to `main`)
- **Domain:** nathanegraham.github.io
- **Framework:** Plain HTML/CSS/JS (no build tools, no bundler, no package manager)
- **Blog Integration:** WordPress REST API (`https://digitalborn.org/wp-json/wp/v2/posts`) fetched client-side

## Repository Structure

```
nathanegraham.github.io/
├── index.html                  # Main portfolio page
├── CLAUDE.md                   # This file
├── assets/
│   ├── css/
│   │   └── main.css            # Primary stylesheet
│   ├── js/
│   │   └── script.js           # WP REST API integration
│   ├── fonts/                  # Font Awesome web fonts
│   └── sass/                   # SASS source files (legacy, not actively compiled)
├── images/
│   ├── avatar.png              # Profile photo
│   └── bg.jpg                  # Background image
├── research/
│   └── dissertation/
│       └── index.html          # Archived dissertation study page
└── LICENSE.txt                 # CC BY 3.0
```

## Key Technical Details

### WordPress REST API Integration
- **Endpoint:** `https://digitalborn.org/wp-json/wp/v2`
- **Usage:** Fetches posts client-side and renders them on the homepage
- **Method:** JSONP via Vue-Resource (legacy — should migrate to `fetch()`)
- **Display:** Shows 4 posts at a time with "show more" pagination
- **Data shown:** Post date, title, and link back to digitalborn.org

### Current Tech Stack (legacy — pending rebuild)
- Vue.js 1.x (2015-era, end of life)
- Vue-Resource for HTTP
- Skel.js 3.0.1 for responsive layout
- Font Awesome 4.x for icons
- Google Fonts: Source Sans Pro (weight 300)
- Google Analytics: UA-80901221-1 (legacy Universal Analytics — needs GA4 migration or removal)

### Design Tokens (current)
- Primary text: `#414f57`
- Headings: `#334431`
- Accent/links: `#e05038` (coral red), `#ff7496` (pink)
- Background: `#ffffff`
- Font: "Source Sans Pro", 300 weight

## Planned Rebuild

Nathan has decided on a **full rebuild** with the following parameters:

- **Stack:** Plain HTML/CSS/JS (no framework, no build tools)
- **Style:** Clean and minimal — similar vibe to the current site but modernized
- **Blog feed:** Keep the WP REST API integration with digitalborn.org
- **Dissertation page:** Keep as archived content (study is complete)
- **Hosting:** Continue on GitHub Pages

### Rebuild Priorities
1. **Update bio/title** — Nathan is currently "Assistant Dean of the Center for Media & Technology Solutions at JHU"
2. **Replace Vue 1.x** with vanilla JS `fetch()` for the WP API calls
3. **Modern CSS** — use CSS Grid/Flexbox, CSS custom properties, remove IE hacks
4. **Remove legacy code** — IE conditional comments, Skel.js, vendor prefixes for standard properties, old Google Analytics snippet
5. **Update social links** — Twitter/X handle, verify all links are current
6. **Responsive design** — mobile-first with modern media queries
7. **Accessibility** — semantic HTML5, proper ARIA labels, good contrast ratios
8. **Performance** — minimal dependencies, no framework overhead
9. **SEO basics** — meta description, Open Graph tags, proper heading hierarchy
10. **Archive the dissertation page** with a note that the study is complete

## Working with This Site

### Deployment
Push to the `main` branch triggers automatic GitHub Pages deployment. No build step required — files are served as-is.

### Editing Content
- **Homepage:** Edit `index.html` directly
- **Styles:** Edit `assets/css/main.css` (or rebuild from scratch)
- **Blog integration:** Edit `assets/js/script.js`
- **Dissertation:** Edit `research/dissertation/index.html`

### Testing Locally
Open `index.html` in a browser. The WP API calls require HTTPS/CORS so the blog feed may not render from `file://` — use a local server:
```bash
python3 -m http.server 8000
# or
npx serve .
```

### Things to Be Careful About
- The WP REST API endpoint at digitalborn.org must remain accessible with CORS/JSONP support for the blog feed to work
- The avatar image (`images/avatar.png`) is also referenced from the dissertation page via absolute URL
- The dissertation page has its own separate CSS and JS assets under `research/dissertation/assets/` — it's essentially a standalone page using a different HTML5 UP template
- Don't delete `LICENSE.txt` — it covers the original template (CC BY 3.0)

## Content Notes

- Nathan's blog at digitalborn.org is hosted on WP Engine
- The dissertation research was on "American Literary Magazines in Transition, 1995–2004" — a study of poetry editors and poets during early Web adoption
- Nathan's academic background: Ph.D. candidate in Information Science (Rutgers), M.F.A. in Poetry (NMSU), B.A. in English (UNC Pembroke)
- **Current role:** Assistant Dean of the Center for Media & Technology Solutions at JHU
- Previous roles mentioned across the site: Assistant Dean of Media and Technology (JHU), Director of Center for Digital and Media Initiatives (JHU)
