/* ==========================================================================
   Blog feed – fetches posts from digitalborn.org via WP REST API
   Zero dependencies – vanilla JS
   Tries fetch() first, falls back to JSONP if CORS blocks the request
   ========================================================================== */

(function () {
  "use strict";

  var ENDPOINT = "https://digitalborn.org/wp-json/wp/v2/posts";
  var PER_PAGE = 100;
  var ITEMS_PER_VIEW = 4;

  var container = document.getElementById("postfeed");
  if (!container) return;

  var allPosts = [];
  var visible = ITEMS_PER_VIEW;

  // --- Helpers -----------------------------------------------------------

  function formatDate(isoString) {
    var d = new Date(isoString);
    var months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }

  function renderPosts() {
    var slice = allPosts.slice(0, visible);

    var html = slice.map(function (post, i) {
      return '<article class="post-item" style="animation-delay: ' + (i * 0.06) + 's">' +
        '<time class="post-date" datetime="' + post.date + '">' + formatDate(post.date) + '</time>' +
        '<p class="post-title">' +
        '<a href="' + post.link + '" target="_blank" rel="noopener">' + post.title.rendered + '</a>' +
        '</p></article>';
    }).join("");

    var button = visible < allPosts.length
      ? '<button class="show-more" type="button">Show more</button>'
      : "";

    container.innerHTML = html + button;

    var btn = container.querySelector(".show-more");
    if (btn) {
      btn.addEventListener("click", function () {
        visible += ITEMS_PER_VIEW;
        renderPosts();
      });
    }
  }

  function handlePosts(posts) {
    allPosts = posts;
    if (posts.length === 0) {
      container.innerHTML = '<p class="posts-error">No posts found.</p>';
      return;
    }
    renderPosts();
  }

  function showError() {
    container.innerHTML =
      '<p class="posts-error">Couldn\u2019t load posts. ' +
      'Visit <a href="https://digitalborn.org" target="_blank" rel="noopener">digitalborn.org</a> instead.</p>';
  }

  // --- JSONP fallback ----------------------------------------------------

  function fetchViaJSONP() {
    var callbackName = "_wp_posts_cb_" + Date.now();
    var script = document.createElement("script");

    window[callbackName] = function (data) {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      handlePosts(data);
    };

    script.onerror = function () {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      showError();
    };

    script.src = ENDPOINT + "?per_page=" + PER_PAGE +
      "&_fields=id,date,title,link&_jsonp=" + callbackName;
    document.head.appendChild(script);
  }

  // --- Fetch & boot ------------------------------------------------------
  // Try fetch() first (cleaner), fall back to JSONP if CORS blocks it

  if (window.fetch) {
    fetch(ENDPOINT + "?per_page=" + PER_PAGE + "&_fields=id,date,title,link")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(handlePosts)
      .catch(function () {
        // CORS or network error — try JSONP
        fetchViaJSONP();
      });
  } else {
    // Very old browser without fetch — go straight to JSONP
    fetchViaJSONP();
  }
})();
