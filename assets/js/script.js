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
    return "/work/?track=" + encodeURIComponent(item.track);
  }

  /* ─── Renderers ──────────────────────────────────────────────────────────── */

  function renderArtifactCards(containerId, items, context) {
    var container = document.getElementById(containerId);
    if (!container) { return; }

    if (!items.length) {
      var emptyMessage = context === "work"
        ? "No artifacts match these filters."
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
        : '<a class="artifact-link" href="/work/?track='
            + encodeURIComponent(item.track) + '">View related work</a>';

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

  function getUniqueThemes() {
    var seen = {}, themes = [];
    state.items.forEach(function (item) {
      item.themes.forEach(function (theme) {
        if (!seen[theme]) { seen[theme] = true; themes.push(theme); }
      });
    });
    return themes.sort(function (a, b) { return a.localeCompare(b); });
  }

  function setWorkFiltersFromLocation(trackEntries, themeEntries) {
    var params = new URLSearchParams(window.location.search);
    var requestedTrack = params.get("track") || "all";
    var requestedTheme = params.get("theme") || "all";
    var validTracks = trackEntries.map(function (entry) { return entry.value; });
    var validThemes = themeEntries.map(function (entry) { return entry.value; });

    state.workTrack = validTracks.indexOf(requestedTrack) !== -1
      ? requestedTrack : "all";
    state.workTheme = validThemes.indexOf(requestedTheme) !== -1
      ? requestedTheme : "all";
  }

  function updateLocationForWork(historyMode) {
    var params = new URLSearchParams(window.location.search);
    if (state.workTrack === "all") { params.delete("track"); }
    else { params.set("track", state.workTrack); }
    if (state.workTheme === "all") { params.delete("theme"); }
    else { params.set("theme", state.workTheme); }
    var next = window.location.pathname
      + (params.toString() ? "?" + params.toString() : "");
    if (historyMode === "push") {
      window.history.pushState({}, "", next);
    } else if (historyMode === "replace") {
      window.history.replaceState({}, "", next);
    }
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
        + '" type="button" data-value="' + escapeHtml(entry.value)
        + '" aria-pressed="' + (entry.value === currentValue ? "true" : "false") + '">'
        + escapeHtml(entry.label) + "</button>";
    }).join("");
    Array.prototype.forEach.call(container.querySelectorAll("button"), function (btn) {
      btn.addEventListener("click", function () {
        onSelect(btn.getAttribute("data-value"));
      });
    });
  }

  function updateFilterRow(containerId, currentValue) {
    var container = document.getElementById(containerId);
    if (!container) { return; }
    Array.prototype.forEach.call(container.querySelectorAll("button"), function (button) {
      var isActive = button.getAttribute("data-value") === currentValue;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function renderWorkResults(historyMode) {
    var items = filteredWorkItems();
    updateFilterRow("work-track-filters", state.workTrack);
    updateFilterRow("work-theme-filters", state.workTheme);
    renderArtifactCards("work-grid", items, "work");
    updateWorkSummary(items);
    updateLocationForWork(historyMode);
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

    setWorkFiltersFromLocation(trackEntries, themeEntries);

    renderFilterRow("work-track-filters", trackEntries, state.workTrack,
      function (value) {
        if (state.workTrack === value) { return; }
        state.workTrack = value;
        renderWorkResults("push");
      });
    renderFilterRow("work-theme-filters", themeEntries, state.workTheme,
      function (value) {
        if (state.workTheme === value) { return; }
        state.workTheme = value;
        renderWorkResults("push");
      });

    renderWorkResults("replace");

    window.addEventListener("popstate", function () {
      setWorkFiltersFromLocation(trackEntries, themeEntries);
      renderWorkResults();
    });
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
            "#featured-grid, #work-grid, #related-grid"
          ),
          function (container) {
            container.innerHTML = '<p class="empty-state">This section could not be loaded.</p>';
          }
        );
      });
  }

  init();
})();
