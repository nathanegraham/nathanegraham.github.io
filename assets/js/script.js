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
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months[d.getMonth()] + " \u2019" + String(d.getFullYear()).slice(2);
  }

  function getTitleText(html) {
    var temp = document.createElement("textarea");
    temp.innerHTML = String(html || "").replace(/<[^>]*>/g, "");
    return temp.value;
  }

  function buildStatusItem(message) {
    var item = document.createElement("li");
    item.className = "posts-status";
    item.textContent = message;
    return item;
  }

  function buildPostItem(post, index) {
    var item = document.createElement("li");
    var time = document.createElement("time");
    var title = document.createElement("p");
    var link = document.createElement("a");

    item.className = "post-item";
    item.style.animationDelay = (index * 0.06) + "s";

    time.className = "post-date";
    time.dateTime = post.date;
    time.textContent = formatDate(post.date);

    title.className = "post-title";

    link.href = post.link;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = getTitleText(post.title.rendered);

    title.appendChild(link);
    item.appendChild(time);
    item.appendChild(title);

    return item;
  }

  function buildShowMoreButton() {
    var button = document.createElement("button");
    var arrow = document.createElement("span");

    button.className = "show-more";
    button.type = "button";
    button.appendChild(document.createTextNode("More posts "));

    arrow.className = "arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2192";
    button.appendChild(arrow);

    button.addEventListener("click", function () {
      visible += ITEMS_PER_VIEW;
      renderPosts();
    });

    return button;
  }

  function renderPosts() {
    var slice = allPosts.slice(0, visible);
    var fragment = document.createDocumentFragment();

    slice.forEach(function (post, index) {
      fragment.appendChild(buildPostItem(post, index));
    });

    if (visible < allPosts.length) {
      fragment.appendChild(buildShowMoreButton());
    }

    container.textContent = "";
    container.appendChild(fragment);
  }

  function handlePosts(posts) {
    allPosts = posts;
    if (posts.length === 0) {
      container.textContent = "";
      container.appendChild(buildStatusItem("No posts found."));
      return;
    }
    renderPosts();
  }

  function showError() {
    var item = buildStatusItem("Couldn\u2019t load posts. Visit ");
    var link = document.createElement("a");

    link.href = "https://digitalborn.org";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "digitalborn.org";

    item.appendChild(link);
    item.appendChild(document.createTextNode(" instead."));

    container.textContent = "";
    container.appendChild(item);
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
