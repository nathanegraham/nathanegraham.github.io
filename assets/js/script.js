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
    posts:      [],
    workTrack:  "all",
    workTheme:  "all"
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

  function getCurrentPageKey() {
    var body = document.body;
    if (!body) { return "home"; }
    if (body.dataset.page === "track") { return body.dataset.track; }
    return body.dataset.page || "home";
  }

  function getCurrentItem() {
    var itemId = document.body && document.body.dataset
      ? document.body.dataset.item : null;
    if (!itemId) { return null; }
    return state.items.find(function (item) {
      return item.id === itemId;
    }) || null;
  }

  function getItemUrl(item, context) {
    if (item.detailUrl)  { return item.detailUrl; }
    if (item.externalUrl) { return item.externalUrl; }
    if (context === "track") { return null; }
    return "/" + item.track + "/#" + item.id;
  }

  /* ─── Renderers ──────────────────────────────────────────────────────────── */

  function renderTrackCards() {
    var container = document.getElementById("track-grid");
    if (!container || document.body.dataset.page !== "home") { return; }

    container.innerHTML = state.site.tracks.map(function (track) {
      var highlights = state.items
        .filter(function (item) { return item.track === track.id; })
        .slice(0, 2)
        .map(function (item) {
          var url   = getItemUrl(item, "home");
          var title = escapeHtml(item.title);
          return url
            ? '<a href="' + escapeHtml(url) + '">' + title + "</a>"
            : "<span>" + title + "</span>";
        })
        .join("");

      return [
        '<article class="track-card" data-track="' + escapeHtml(track.id) + '">',
        '<p class="track-meta"><span>' + escapeHtml(track.id) + "</span></p>",
        '<h3 class="track-title"><a href="' + escapeHtml(track.href) + '">'
          + escapeHtml(track.title) + "</a></h3>",
        "<p>" + escapeHtml(track.deck) + "</p>",
        '<div class="track-links">' + highlights + "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderArtifactCards(containerId, items, context) {
    var container = document.getElementById(containerId);
    if (!container) { return; }

    container.innerHTML = items.map(function (item) {
      var url = getItemUrl(item, context);
      var isInternalDetail = Boolean(item.detailUrl && url === item.detailUrl);
      var isExternal = Boolean(
        item.externalUrl && url === item.externalUrl && !isInternalDetail
      );
      var linkMarkup = url
        ? '<h3 class="artifact-title"><a href="' + escapeHtml(url) + '"'
            + (isExternal ? ' target="_blank" rel="noopener"' : "") + ">"
            + escapeHtml(item.title) + "</a></h3>"
        : '<h3 class="artifact-title">' + escapeHtml(item.title) + "</h3>";

      var summary = (item.lensSummary && item.lensSummary.overview)
        || item.summary || "";

      var themes = item.themes.map(function (theme) {
        return "<span>" + escapeHtml(theme) + "</span>";
      }).join("");

      var action = item.detailUrl
        ? '<a class="artifact-link" href="' + escapeHtml(item.detailUrl)
            + '">View detail page</a>'
        : item.externalUrl
        ? '<a class="artifact-link" href="' + escapeHtml(item.externalUrl)
            + '" target="_blank" rel="noopener">Open artifact</a>'
        : '<a class="artifact-link" href="/' + escapeHtml(item.track)
            + "/#" + escapeHtml(item.id) + '">View in '
            + escapeHtml(titleCase(item.track)) + "</a>";

      return [
        '<article class="artifact-card" id="' + escapeHtml(item.id) + '">',
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

  function buildShowMoreButton(limit, posts, container) {
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
      fragment.appendChild(buildShowMoreButton(limit, posts, container));
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

  function renderPromptGrid() {
    var container = document.getElementById("prompt-grid");
    if (!container || !state.site.home || !state.site.home.prompts) { return; }

    container.innerHTML = state.site.home.prompts.map(function (prompt) {
      return '<a class="prompt-chip" href="' + escapeHtml(prompt.href) + '">'
        + escapeHtml(prompt.label) + "</a>";
    }).join("");
  }

  function renderTrackPage() {
    if (document.body.dataset.page !== "track") { return; }
    var track = document.body.dataset.track;
    var items = state.items.filter(function (item) {
      return item.track === track;
    });
    renderArtifactCards("track-grid", items, "track");
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

  function getUniqueThemes() {
    var seen = {}, themes = [];
    state.items.forEach(function (item) {
      item.themes.forEach(function (theme) {
        if (!seen[theme]) { seen[theme] = true; themes.push(theme); }
      });
    });
    return themes.sort(function (a, b) { return a.localeCompare(b); });
  }

  function setWorkFiltersFromLocation() {
    var params = new URLSearchParams(window.location.search);
    state.workTrack = params.get("track") || "all";
    state.workTheme = params.get("theme") || "all";
  }

  function updateLocationForWork() {
    var params = new URLSearchParams(window.location.search);
    if (state.workTrack === "all") { params.delete("track"); }
    else { params.set("track", state.workTrack); }
    if (state.workTheme === "all") { params.delete("theme"); }
    else { params.set("theme", state.workTheme); }
    var next = window.location.pathname
      + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }

  function filteredWorkItems() {
    return state.items.filter(function (item) {
      var trackMatch = state.workTrack === "all" || item.track === state.workTrack;
      var themeMatch = state.workTheme === "all"
        || item.themes.indexOf(state.workTheme) !== -1;
      return trackMatch && themeMatch;
    });
  }

  function updateWorkSummary(items) {
    var summary = document.getElementById("work-summary");
    if (!summary) { return; }
    var parts = ["Showing " + items.length
      + (items.length === 1 ? " artifact" : " artifacts")];
    if (state.workTrack !== "all") { parts.push("in " + titleCase(state.workTrack)); }
    if (state.workTheme !== "all") {
      parts.push("tagged \u201c" + state.workTheme + "\u201d");
    }
    summary.textContent = parts.join(" ");
  }

  function renderFilterRow(containerId, entries, currentValue, onSelect) {
    var container = document.getElementById(containerId);
    if (!container) { return; }
    container.innerHTML = entries.map(function (entry) {
      var active = entry.value === currentValue ? " is-active" : "";
      return '<button class="filter-chip' + active
        + '" type="button" data-value="' + escapeHtml(entry.value) + '">'
        + escapeHtml(entry.label) + "</button>";
    }).join("");
    Array.prototype.forEach.call(container.querySelectorAll("button"), function (btn) {
      btn.addEventListener("click", function () {
        onSelect(btn.getAttribute("data-value"));
      });
    });
  }

  function renderWorkPage() {
    if (document.body.dataset.page !== "work") { return; }

    var trackEntries = [{ value: "all", label: "All" }].concat(
      state.site.tracks.map(function (track) {
        return { value: track.id, label: track.title };
      })
    );
    var themeEntries = [{ value: "all", label: "All" }].concat(
      getUniqueThemes().map(function (theme) {
        return { value: theme, label: theme };
      })
    );

    renderFilterRow("work-track-filters", trackEntries, state.workTrack,
      function (value) { state.workTrack = value; renderWorkPage(); });
    renderFilterRow("work-theme-filters", themeEntries, state.workTheme,
      function (value) { state.workTheme = value; renderWorkPage(); });

    var items = filteredWorkItems();
    renderArtifactCards("work-grid", items, "work");
    updateWorkSummary(items);
    updateLocationForWork();
  }

  /* ─── Page intro ─────────────────────────────────────────────────────────── */

  function updatePageIntro() {
    var intro = document.getElementById("page-intro");
    var pageKey = getCurrentPageKey();
    if (!intro) { return; }

    if (pageKey === "detail") {
      var currentItem = getCurrentItem();
      if (currentItem && currentItem.lensSummary && currentItem.lensSummary.overview) {
        intro.textContent = currentItem.lensSummary.overview;
      }
      return;
    }

    if (state.site.pageIntroByLens
        && state.site.pageIntroByLens[pageKey]
        && state.site.pageIntroByLens[pageKey].overview) {
      intro.textContent = state.site.pageIntroByLens[pageKey].overview;
    }
  }

  /* ─── Init ───────────────────────────────────────────────────────────────── */

  function render() {
    updatePageIntro();
    renderTrackCards();
    renderFeaturedItems();
    renderPromptGrid();
    renderTrackPage();
    renderDetailPage();
    renderWorkPage();
    loadPostFeeds();
  }

  function init() {
    if (!document.body) { return; }
    var shouldLoadPosts = Boolean(document.querySelector("[data-postfeed]"));

    if (document.body.dataset.page === "work") {
      setWorkFiltersFromLocation();
    }

    var requests = [
      fetchJson(DATA_PATHS.site),
      fetchJson(DATA_PATHS.items)
    ];

    if (shouldLoadPosts) {
      requests.push(fetchJson(DATA_PATHS.posts).catch(function () {
        return [];
      }));
    }

    Promise.all(requests)
      .then(function (results) {
        state.site  = results[0];
        state.items = results[1];
        state.posts = shouldLoadPosts ? results[2] : [];
        render();
      })
      .catch(function (error) {
        window.console.error(error);
      });
  }

  init();
})();
