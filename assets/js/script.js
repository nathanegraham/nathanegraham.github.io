/* ==========================================================================
   Blog feed – fetches posts from digitalborn.org via WP REST API
   Zero dependencies – vanilla JS with fetch()
   ========================================================================== */

(function () {
  "use strict";

  const ENDPOINT = "https://digitalborn.org/wp-json/wp/v2/posts";
  const PER_PAGE = 100;       // fetch all, paginate client-side
  const ITEMS_PER_VIEW = 4;   // show this many at a time

  const container = document.getElementById("postfeed");
  if (!container) return;

  let allPosts = [];
  let visible = ITEMS_PER_VIEW;

  // --- Helpers -----------------------------------------------------------

  function formatDate(isoString) {
    const d = new Date(isoString);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function renderPosts() {
    const slice = allPosts.slice(0, visible);

    const html = slice.map((post, i) => `
      <article class="post-item" style="animation-delay: ${i * 0.06}s">
        <time class="post-date" datetime="${post.date}">${formatDate(post.date)}</time>
        <p class="post-title">
          <a href="${post.link}" target="_blank" rel="noopener">${post.title.rendered}</a>
        </p>
      </article>
    `).join("");

    const button = visible < allPosts.length
      ? `<button class="show-more" type="button">Show more</button>`
      : "";

    container.innerHTML = html + button;

    // Re-attach listener
    const btn = container.querySelector(".show-more");
    if (btn) {
      btn.addEventListener("click", function () {
        visible += ITEMS_PER_VIEW;
        renderPosts();
      });
    }
  }

  // --- Fetch & boot ------------------------------------------------------

  fetch(`${ENDPOINT}?per_page=${PER_PAGE}&_fields=id,date,title,link`)
    .then(function (res) {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(function (posts) {
      allPosts = posts;
      if (posts.length === 0) {
        container.innerHTML = '<p class="posts-error">No posts found.</p>';
        return;
      }
      renderPosts();
    })
    .catch(function () {
      container.innerHTML =
        '<p class="posts-error">Couldn\u2019t load posts. ' +
        'Visit <a href="https://digitalborn.org" target="_blank" rel="noopener">digitalborn.org</a> instead.</p>';
    });
})();
