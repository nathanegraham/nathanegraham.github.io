import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const endpoint = "https://digitalborn.org/wp-json/wp/v2/posts?per_page=12&_fields=id,date,title,link";
const outputPath = fileURLToPath(new URL("../data/posts.json", import.meta.url));

const response = await fetch(endpoint, {
  headers: {
    "User-Agent": "nathan-systems-studio-feed-refresh"
  }
});

if (!response.ok) {
  throw new Error("Failed to fetch Digital Born posts: HTTP " + response.status);
}

const posts = await response.json();
await writeFile(outputPath, JSON.stringify(posts, null, 2) + "\n", "utf8");

console.log("Wrote " + posts.length + " posts to " + outputPath);
