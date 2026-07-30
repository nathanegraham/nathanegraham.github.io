(function () {
  "use strict";

  var DATA_PATHS = {
    site:  "/data/site.json",
    items: "/data/items.json",
    posts: "/data/posts.json"
  };

  var state = {
    site:       null,
    items:      [],
    posts:      []
  };

  function fetchJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load " + path + " (" + response.status + ")");
      }
      return response.json();
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function getTitleText(html) {
    var temp = document.createElement("textarea");
    temp.innerHTML = String(html || "").replace(/<[^>]*>/g, "");
    return temp.value;
  }

  /* ─── Page helpers ───────────────────────────────────────────────────────── */

  function getCurrentItem() {
    var itemId = document.body && document.body.dataset
      ? document.body.dataset.item : null;
    if (!itemId) { return null; }
    return state.items.find(function (item) {
      return item.id === itemId;
    }) || null;
  }

  function getItemUrl(item) {
    if (item.detailUrl)  { return item.detailUrl; }
    if (item.externalUrl) { return item.externalUrl; }
    return "/work/#" + encodeURIComponent(item.track);
  }

  /* ─── Renderers ──────────────────────────────────────────────────────────── */

  function renderArtifactCards(containerId, items, context) {
    var container = document.getElementById(containerId);
    if (!container) { return; }

    if (!items.length) {
      var emptyMessage = context === "work"
        ? "No artifacts are available in this track yet."
        : context === "detail"
        ? "No related artifacts are available."
        : "No artifacts are available here yet.";
      container.innerHTML = '<p class="empty-state">' + emptyMessage + "</p>";
      return;
    }

    container.innerHTML = items.map(function (item) {
      var url = getItemUrl(item);
      var isInternalDetail = Boolean(item.detailUrl && url === item.detailUrl);
      var isExternal = Boolean(
        item.externalUrl && url === item.externalUrl && !isInternalDetail
      );
      var linkMarkup = url
        ? '<h3 class="artifact-title"><a href="' + escapeHtml(url) + '"'
            + (isExternal ? ' target="_blank" rel="noopener"' : "") + ">"
            + escapeHtml(item.title) + "</a></h3>"
        : '<h3 class="artifact-title">' + escapeHtml(item.title) + "</h3>";

      var summary = item.summary || "";

      var themes = item.themes.map(function (theme) {
        return "<span>" + escapeHtml(theme) + "</span>";
      }).join("");

      var action = item.detailUrl
        ? '<a class="artifact-link" href="' + escapeHtml(item.detailUrl)
            + '">View detail page</a>'
        : item.externalUrl
        ? '<a class="artifact-link" href="' + escapeHtml(item.externalUrl)
            + '" target="_blank" rel="noopener">Open artifact</a>'
        : '<a class="artifact-link" href="/work/#'
            + encodeURIComponent(item.track) + '">View related work</a>';

      return [
        '<article class="artifact-card" id="' + escapeHtml(item.id)
          + '" data-track="' + escapeHtml(item.track) + '">',
        '<p class="artifact-meta">'
          + escapeHtml(item.format) + " / "
          + escapeHtml(item.scale) + " / "
          + '<span class="artifact-track">'
          + escapeHtml(titleCase(item.track)) + "</span>"
          + "</p>",
        linkMarkup,
        "<p>" + escapeHtml(summary) + "</p>",
        '<div class="artifact-themes">' + themes + "</div>",
        action,
        "</article>"
      ].join("");
    }).join("");
  }

  function renderFeaturedItems() {
    if (document.body.dataset.page !== "home") { return; }
    var featuredIds = state.site.home.featuredIds || [];
    var featuredItems = featuredIds.map(function (id) {
      return state.items.find(function (item) { return item.id === id; });
    }).filter(Boolean);
    renderArtifactCards("featured-grid", featuredItems, "home");
  }

  function formatDate(isoString) {
    var date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
  }

  function buildStatusItem(message) {
    var item = document.createElement("li");
    item.className = "posts-status";
    item.textContent = message;
    return item;
  }

  function buildPostItem(post) {
    var item = document.createElement("li");
    var time = document.createElement("time");
    var title = document.createElement("p");
    var link = document.createElement("a");
    var renderedTitle = post.title && typeof post.title === "object"
      ? post.title.rendered
      : post.title;

    item.className = "post-item";

    time.className = "post-date";
    time.dateTime = post.date;
    time.textContent = formatDate(post.date);

    title.className = "post-title";

    link.href = post.link;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = getTitleText(renderedTitle);

    title.appendChild(link);
    item.appendChild(time);
    item.appendChild(title);
    return item;
  }

  function buildShowMoreButton(posts, container) {
    var item = document.createElement("li");
    var button = document.createElement("button");
    var arrow = document.createElement("span");

    item.className = "posts-more";
    button.className = "show-more";
    button.type = "button";
    button.appendChild(document.createTextNode("More posts "));
    arrow.className = "arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2192";
    button.appendChild(arrow);

    button.addEventListener("click", function () {
      renderFeedPosts(container, posts, posts.length);
    });

    item.appendChild(button);
    return item;
  }

  function renderFeedPosts(container, posts, limit) {
    var fragment = document.createDocumentFragment();
    var slice = posts.slice(0, limit);

    slice.forEach(function (post) {
      fragment.appendChild(buildPostItem(post));
    });

    if (limit < posts.length) {
      fragment.appendChild(buildShowMoreButton(posts, container));
    }

    container.textContent = "";
    container.appendChild(fragment);
  }

  function loadPostFeeds() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-postfeed]"), function (container) {
      var count = Number(container.getAttribute("data-feed-count") || "4");

      if (!state.posts.length) {
        container.textContent = "";
        container.appendChild(buildStatusItem("No posts available right now."));
        return;
      }

      renderFeedPosts(container, state.posts, count);
    });
  }

  function renderDetailPage() {
    if (document.body.dataset.page !== "detail") { return; }
    var currentItem = getCurrentItem();
    if (!currentItem) { return; }

    var related = state.items
      .filter(function (item) { return item.id !== currentItem.id; })
      .map(function (item) {
        var sharedThemes = item.themes.filter(function (theme) {
          return currentItem.themes.indexOf(theme) !== -1;
        }).length;
        var sameTrack = item.track === currentItem.track ? 1 : 0;
        return { item: item, score: sharedThemes * 10 + sameTrack };
      })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3)
      .map(function (entry) { return entry.item; });

    renderArtifactCards("related-grid", related, "detail");
  }

  /* ─── Work page ──────────────────────────────────────────────────────────── */

  function getLegacyWorkAnchor() {
    var params = new URLSearchParams(window.location.search);
    var requestedTrack = params.get("track");
    var requestedTheme = params.get("theme");
    var legacyTracks = {
      systems: "projects",
      builds: "projects",
      studio: "projects"
    };
    if (legacyTracks[requestedTrack]) {
      requestedTrack = legacyTracks[requestedTrack];
    }
    var validTrack = state.site.tracks.some(function (track) {
      return track.id === requestedTrack;
    });

    if (requestedTrack && validTrack) { return requestedTrack; }
    if (!requestedTheme) { return null; }

    var matchingItem = state.items.find(function (item) {
      return item.themes.indexOf(requestedTheme) !== -1;
    });
    return matchingItem ? matchingItem.id : null;
  }

  function restoreWorkAnchor() {
    var legacyAnchor = getLegacyWorkAnchor();
    var hashAnchor = null;
    if (window.location.hash) {
      try {
        hashAnchor = decodeURIComponent(window.location.hash.slice(1));
      } catch (error) {
        hashAnchor = window.location.hash.slice(1);
      }
    }
    var anchor = legacyAnchor || hashAnchor;
    if (!anchor) { return; }

    var target = document.getElementById(anchor);
    if (!target) { return; }

    if (legacyAnchor) {
      window.history.replaceState({}, "", window.location.pathname + "#" + anchor);
    }
    window.requestAnimationFrame(function () {
      target.scrollIntoView();
    });
  }

  function renderWorkPage() {
    if (document.body.dataset.page !== "work") { return; }
    var archive = document.getElementById("work-archive");
    if (!archive) { return; }

    archive.textContent = "";

    state.site.tracks.forEach(function (track, index) {
      var items = state.items.filter(function (item) {
        return item.track === track.id;
      });
      var section = document.createElement("section");
      var gridId = "work-" + track.id + "-grid";
      var countLabel = items.length + (items.length === 1 ? " artifact" : " artifacts");

      section.className = "work-track";
      section.id = track.id;
      section.setAttribute("aria-labelledby", track.id + "-heading");
      section.innerHTML = [
        '<header class="work-track__header">',
        "<div>",
        '<p class="work-track__index">'
          + String(index + 1).padStart(2, "0") + " / category</p>",
        '<h3 id="' + escapeHtml(track.id) + '-heading">'
          + escapeHtml(track.title) + "</h3>",
        "</div>",
        '<p class="work-track__count">' + countLabel + "</p>",
        "</header>",
        '<div class="artifact-grid" id="' + gridId + '"></div>'
      ].join("");

      archive.appendChild(section);
      renderArtifactCards(gridId, items, "work");
    });

    restoreWorkAnchor();
  }

  /* ─── Init ───────────────────────────────────────────────────────────────── */

  function render() {
    renderFeaturedItems();
    renderDetailPage();
    renderWorkPage();
    loadPostFeeds();
  }

  function init() {
    if (!document.body) { return; }
    var page = document.body.dataset.page;
    var usesSiteData = page === "home" || page === "work";
    var usesItemData = usesSiteData || page === "detail";
    var shouldLoadPosts = Boolean(document.querySelector("[data-postfeed]"));

    if (!usesItemData && !shouldLoadPosts) { return; }

    var requests = [
      usesSiteData ? fetchJson(DATA_PATHS.site) : Promise.resolve(null),
      usesItemData ? fetchJson(DATA_PATHS.items) : Promise.resolve([])
    ];

    requests.push(shouldLoadPosts
      ? fetchJson(DATA_PATHS.posts).catch(function () { return []; })
      : Promise.resolve([]));

    Promise.all(requests)
      .then(function (results) {
        state.site  = results[0];
        state.items = results[1];
        state.posts = results[2];
        render();
      })
      .catch(function (error) {
        window.console.error(error);
        Array.prototype.forEach.call(
          document.querySelectorAll(
            "#featured-grid, #work-archive, #related-grid"
          ),
          function (container) {
            container.innerHTML = '<p class="empty-state">This section could not be loaded.</p>';
          }
        );
      });
  }

  init();
})();
