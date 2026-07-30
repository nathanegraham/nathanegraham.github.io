import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const redirectRoutes = new Map([
  ["systems/index.html", {
    target: "/work/#systems",
    canonical: "https://nathanegraham.github.io/work/"
  }],
  ["builds/index.html", {
    target: "/work/#builds",
    canonical: "https://nathanegraham.github.io/work/"
  }],
  ["studio/index.html", {
    target: "/work/#studio",
    canonical: "https://nathanegraham.github.io/work/"
  }],
  ["writing/index.html", {
    target: "/work/#writing",
    canonical: "https://nathanegraham.github.io/work/"
  }],
  ["now/index.html", {
    target: "/about/#current-focus",
    canonical: "https://nathanegraham.github.io/about/"
  }],
  ["contact/index.html", {
    target: "/about/#contact",
    canonical: "https://nathanegraham.github.io/about/"
  }]
]);

function fail(message) {
  failures.push(message);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git") { continue; }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function pageUrl(filePath) {
  const rel = relative(filePath);
  if (rel === "index.html") { return "/"; }
  if (rel.endsWith("/index.html")) {
    return "/" + rel.slice(0, -"index.html".length);
  }
  return "/" + rel;
}

function attributeValues(html, attribute) {
  const expression = new RegExp("\\b" + attribute + "=[\"']([^\"']+)[\"']", "gi");
  return Array.from(html.matchAll(expression), function (match) {
    return match[1];
  });
}

async function assertLocalTarget(sourceFile, rawTarget) {
  if (!rawTarget.startsWith("/")) { return; }

  const target = rawTarget.split(/[?#]/)[0];
  if (!target) { return; }

  const resolved = target.endsWith("/")
    ? path.join(root, target.slice(1), "index.html")
    : path.join(root, target.slice(1));

  try {
    await access(resolved);
  } catch {
    fail(relative(sourceFile) + ": missing local target " + rawTarget);
  }
}

const allFiles = await walk(root);
const activeHtmlFiles = allFiles.filter(function (filePath) {
  return filePath.endsWith(".html")
    && !relative(filePath).startsWith("research/dissertation/");
});

const cssVersions = new Set();
const scriptVersions = new Set();

for (const filePath of activeHtmlFiles) {
  const rel = relative(filePath);
  const html = await readFile(filePath, "utf8");
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const ids = attributeValues(html, "id");
  const duplicateIds = ids.filter(function (id, index) {
    return ids.indexOf(id) !== index;
  });

  if (!/^<!doctype html>/i.test(html.trimStart())) {
    fail(rel + ": missing HTML doctype");
  }
  if (!/<html\b[^>]*\blang="en"/i.test(html)) {
    fail(rel + ": missing lang=\"en\"");
  }
  if (!/<meta\b[^>]*\bname="viewport"/i.test(html)) {
    fail(rel + ": missing viewport metadata");
  }
  if (!/<meta\b[^>]*\bname="description"/i.test(html)) {
    fail(rel + ": missing meta description");
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    fail(rel + ": missing document title");
  }
  if (h1Count !== 1) {
    fail(rel + ": expected one h1, found " + h1Count);
  }
  if (!/<main\b[^>]*\bid="main-content"/i.test(html)) {
    fail(rel + ": missing #main-content");
  }
  if (!/class="skip-link"[^>]*href="#main-content"/i.test(html)) {
    fail(rel + ": missing skip link");
  }
  if (duplicateIds.length) {
    fail(rel + ": duplicate ids " + Array.from(new Set(duplicateIds)).join(", "));
  }
  if (/Assistant Dean/.test(html)) {
    fail(rel + ": contains stale Assistant Dean title");
  }

  const redirect = redirectRoutes.get(rel);

  if (rel === "404.html" || redirect) {
    if (!/<meta\b[^>]*\bname="robots"[^>]*\bnoindex/i.test(html)) {
      fail(rel + ": missing noindex directive");
    }
  }

  if (redirect) {
    if (!html.includes('content="0; url=' + redirect.target + '"')) {
      fail(rel + ": missing redirect target " + redirect.target);
    }
    if (!html.includes('<link rel="canonical" href="' + redirect.canonical + '"')) {
      fail(rel + ": missing canonical URL " + redirect.canonical);
    }
  } else if (rel !== "404.html") {
    const expectedCanonical = "https://nathanegraham.github.io" + pageUrl(filePath);
    if (!html.includes('<link rel="canonical" href="' + expectedCanonical + '"')) {
      fail(rel + ": missing canonical URL " + expectedCanonical);
    }
  }

  for (const anchor of html.matchAll(/<a\b([^>]*)>/gi)) {
    const attributes = anchor[1];
    if (/target="_blank"/i.test(attributes) && !/rel="[^"]*\bnoopener\b/i.test(attributes)) {
      fail(rel + ": target=\"_blank\" link missing rel=\"noopener\"");
    }
  }

  for (const href of attributeValues(html, "href")) {
    await assertLocalTarget(filePath, href);
  }
  for (const src of attributeValues(html, "src")) {
    await assertLocalTarget(filePath, src);
  }
  for (const srcset of attributeValues(html, "srcset")) {
    await assertLocalTarget(filePath, srcset.split(/\s+/)[0]);
  }

  const cssMatch = html.match(/main\.css\?v=(\d+)/);
  if (cssMatch) { cssVersions.add(cssMatch[1]); }
  const scriptMatch = html.match(/script\.js\?v=(\d+)/);
  if (scriptMatch) { scriptVersions.add(scriptMatch[1]); }
}

if (cssVersions.size !== 1) {
  fail("Inconsistent main.css versions: " + Array.from(cssVersions).join(", "));
}
if (scriptVersions.size !== 1) {
  fail("Inconsistent script.js versions: " + Array.from(scriptVersions).join(", "));
}

const expectedSitemapUrls = activeHtmlFiles
  .filter(function (filePath) {
    const rel = relative(filePath);
    return rel !== "404.html" && !redirectRoutes.has(rel);
  })
  .map(function (filePath) {
    return "https://nathanegraham.github.io" + pageUrl(filePath);
  })
  .sort();
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), function (match) {
  return match[1];
}).sort();

if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedSitemapUrls)) {
  fail("sitemap.xml does not match the public HTML routes");
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://nathanegraham.github.io/sitemap.xml")) {
  fail("robots.txt does not advertise sitemap.xml");
}

const items = JSON.parse(await readFile(path.join(root, "data/items.json"), "utf8"));
const itemIds = new Set();

for (const item of items) {
  if (itemIds.has(item.id)) {
    fail("data/items.json: duplicate id " + item.id);
  }
  itemIds.add(item.id);

  for (const key of ["id", "title", "track", "format", "scale", "status", "themes", "summary"]) {
    if (item[key] == null) {
      fail("data/items.json: " + item.id + " missing " + key);
    }
  }

  if (item.detailUrl) {
    const detailPath = path.join(root, item.detailUrl.slice(1), "index.html");
    try {
      const detailHtml = await readFile(detailPath, "utf8");
      if (!detailHtml.includes('data-item="' + item.id + '"')) {
        fail(relative(detailPath) + ": data-item does not match " + item.id);
      }
      if (!detailHtml.includes("<h1>" + item.title + "</h1>")) {
        fail(relative(detailPath) + ": h1 does not match data title");
      }
    } catch {
      fail("data/items.json: missing detail page " + item.detailUrl);
    }
  }
}

const posts = JSON.parse(await readFile(path.join(root, "data/posts.json"), "utf8"));
for (let index = 1; index < posts.length; index += 1) {
  if (new Date(posts[index - 1].date) < new Date(posts[index].date)) {
    fail("data/posts.json: posts are not newest-first");
    break;
  }
}

const manifest = JSON.parse(await readFile(path.join(root, "site.webmanifest"), "utf8"));
for (const icon of manifest.icons || []) {
  await assertLocalTarget(path.join(root, "site.webmanifest"), icon.src);
}

const dissertation = await readFile(
  path.join(root, "research/dissertation/index.html"),
  "utf8"
);
if (!/<meta\b[^>]*\bname="robots"[^>]*\bnoindex/i.test(dissertation)) {
  fail("research/dissertation/index.html: archived page must remain noindex");
}

if (failures.length) {
  console.error("Site checks failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(
    "Site checks passed: "
      + activeHtmlFiles.length + " pages, "
      + items.length + " artifacts, "
      + posts.length + " posts."
  );
}
