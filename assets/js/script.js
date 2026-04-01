(function () {
  "use strict";

  var DATA_PATHS = {
    site: "/data/site.json",
    items: "/data/items.json",
    posts: "/data/posts.json"
  };
  var DEFAULT_LENS = "overview";
  var LENS_STORAGE_KEY = "nathan-systems-studio-lens";

  var state = {
    lens: DEFAULT_LENS,
    site: null,
    items: [],
    posts: [],
    workTrack: "all",
    workTheme: "all"
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
      .replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });
  }

  function getLensFromLocation() {
    var params = new URLSearchParams(window.location.search);
    return params.get("lens");
  }

  function getStoredLens() {
    try {
      return window.localStorage.getItem(LENS_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeLens(lens) {
    try {
      window.localStorage.setItem(LENS_STORAGE_KEY, lens);
    } catch (error) {
      return;
    }
  }

  function getCurrentPageKey() {
    var body = document.body;
    if (!body) {
      return "home";
    }
    if (body.dataset.page === "track") {
      return body.dataset.track;
    }
    return body.dataset.page || "home";
  }

  function getCurrentItem() {
    var itemId = document.body && document.body.dataset ? document.body.dataset.item : null;
    if (!itemId) {
      return null;
    }
    return state.items.find(function (item) {
      return item.id === itemId;
    }) || null;
  }

  function getTrackMeta(trackId) {
    return state.site.tracks.find(function (track) {
      return track.id === trackId;
    });
  }

  function getItemUrl(item, context) {
    if (item.detailUrl) {
      return item.detailUrl;
    }
    if (item.externalUrl) {
      return item.externalUrl;
    }
    if (context === "track") {
      return null;
    }
    return "/" + item.track + "/#" + item.id;
  }

  function renderTrackCards() {
    var container = document.getElementById("track-grid");
    if (!container || document.body.dataset.page !== "home") {
      return;
    }

    container.innerHTML = state.site.tracks.map(function (track) {
      var highlights = state.items
        .filter(function (item) { return item.track === track.id; })
        .slice(0, 2)
        .map(function (item) {
          var url = getItemUrl(item, "home");
          var title = escapeHtml(item.title);
          return url
            ? '<a href="' + escapeHtml(url) + '">' + title + "</a>"
            : "<span>" + title + "</span>";
        })
        .join("");

      return [
        '<article class="track-card" data-track="' + escapeHtml(track.id) + '">',
        '<p class="track-meta"><span>' + escapeHtml(track.id) + "</span></p>",
        '<h3 class="track-title"><a href="' + escapeHtml(track.href) + '">' + escapeHtml(track.title) + "</a></h3>",
        "<p>" + escapeHtml(track.deck) + "</p>",
        '<div class="track-links">' + highlights + "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderSignalTiles() {
    var container = document.getElementById("signal-grid");
    if (!container || !state.site.home || !state.site.home.tiles) {
      return;
    }

    container.innerHTML = state.site.home.tiles.map(function (tile) {
      return [
        '<article class="signal-card panel">',
        '<p class="signal-label">' + escapeHtml(tile.title) + "</p>",
        "<h3>" + escapeHtml(tile.meta) + "</h3>",
        "<p>" + escapeHtml(tile.copy[state.lens] || tile.copy.overview) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderArtifactCards(containerId, items, context) {
    var container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    container.innerHTML = items.map(function (item) {
      var url = getItemUrl(item, context);
      var isInternalDetail = Boolean(item.detailUrl && url === item.detailUrl);
      var isExternal = Boolean(item.externalUrl && url === item.externalUrl && !isInternalDetail);
      var linkMarkup = url
        ? '<h3 class="artifact-title"><a href="' + escapeHtml(url) + '"' + (isExternal ? ' target="_blank" rel="noopener"' : "") + ">" + escapeHtml(item.title) + "</a></h3>"
        : '<h3 class="artifact-title">' + escapeHtml(item.title) + "</h3>";
      var themes = item.themes.map(function (theme) {
        return "<span>" + escapeHtml(theme) + "</span>";
      }).join("");
      var action = item.detailUrl
        ? '<a class="artifact-link" href="' + escapeHtml(item.detailUrl) + '">View detail page</a>'
        : item.externalUrl
        ? '<a class="artifact-link" href="' + escapeHtml(item.externalUrl) + '" target="_blank" rel="noopener">Open artifact</a>'
        : '<a class="artifact-link" href="/' + escapeHtml(item.track) + "/#" + escapeHtml(item.id) + '">View in ' + escapeHtml(titleCase(item.track)) + "</a>";

      return [
        '<article class="artifact-card" id="' + escapeHtml(item.id) + '">',
        '<p class="artifact-meta">' +
          escapeHtml(item.format) + " / " +
          escapeHtml(item.scale) + " / " +
          '<span class="artifact-track">' + escapeHtml(titleCase(item.track)) + "</span>" +
        "</p>",
        linkMarkup,
        "<p>" + escapeHtml(item.lensSummary[state.lens] || item.lensSummary.overview || item.summary) + "</p>",
        '<div class="artifact-themes">' + themes + "</div>",
        action,
        "</article>"
      ].join("");
    }).join("");
  }

  function renderFeaturedItems() {
    if (document.body.dataset.page !== "home") {
      return;
    }

    var featuredIds = state.site.home.featuredIds || [];
    var featuredItems = featuredIds.map(function (id) {
      return state.items.find(function (item) {
        return item.id === id;
      });
    }).filter(Boolean);

    renderArtifactCards("featured-grid", featuredItems, "home");
  }

  function renderConstellations() {
    var container = document.getElementById("constellation-grid");
    if (!container || document.body.dataset.page !== "home") {
      return;
    }

    container.innerHTML = state.site.home.constellations.map(function (entry) {
      var itemLinks = entry.items.map(function (itemId) {
        var item = state.items.find(function (candidate) {
          return candidate.id === itemId;
        });
        if (!item) {
          return "";
        }
        var url = getItemUrl(item, "home");
        if (!url) {
          return "<span>" + escapeHtml(item.title) + "</span>";
        }
        return '<a href="' + escapeHtml(url) + '"' + (item.externalUrl ? ' target="_blank" rel="noopener"' : "") + ">" + escapeHtml(item.title) + "</a>";
      }).join("");

      return [
        '<article class="constellation-card">',
        "<h3>" + escapeHtml(entry.title) + "</h3>",
        '<div class="constellation-items">' + itemLinks + "</div>",
        "<p>" + escapeHtml(entry.reason) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderPromptGrid() {
    var container = document.getElementById("prompt-grid");
    if (!container) {
      return;
    }

    container.innerHTML = state.site.home.prompts.map(function (prompt) {
      return '<a class="prompt-chip" href="' + escapeHtml(prompt.href) + '">' + escapeHtml(prompt.label) + "</a>";
    }).join("");
  }

  function renderTrackPage() {
    if (document.body.dataset.page !== "track") {
      return;
    }

    var track = document.body.dataset.track;
    var items = state.items.filter(function (item) {
      return item.track === track;
    });

    renderArtifactCards("track-grid", items, "track");
  }

  function renderDetailPage() {
    if (document.body.dataset.page !== "detail") {
      return;
    }

    var currentItem = getCurrentItem();
    if (!currentItem) {
      return;
    }

    var related = state.items
      .filter(function (item) {
        return item.id !== currentItem.id;
      })
      .map(function (item) {
        var sharedThemes = item.themes.filter(function (theme) {
          return currentItem.themes.indexOf(theme) !== -1;
        }).length;
        var sameTrack = item.track === currentItem.track ? 1 : 0;
        return {
          item: item,
          score: sharedThemes * 10 + sameTrack
        };
      })
      .filter(function (entry) {
        return entry.score > 0;
      })
      .sort(function (left, right) {
        return right.score - left.score;
      })
      .slice(0, 3)
      .map(function (entry) {
        return entry.item;
      });

    renderArtifactCards("related-grid", related, "detail");
  }

  function getUniqueThemes() {
    var seen = {};
    var themes = [];

    state.items.forEach(function (item) {
      item.themes.forEach(function (theme) {
        if (!seen[theme]) {
          seen[theme] = true;
          themes.push(theme);
        }
      });
    });

    return themes.sort(function (left, right) {
      return left.localeCompare(right);
    });
  }

  function setWorkFiltersFromLocation() {
    var params = new URLSearchParams(window.location.search);
    state.workTrack = params.get("track") || "all";
    state.workTheme = params.get("theme") || "all";
  }

  function updateLocationForWork() {
    var params = new URLSearchParams(window.location.search);

    if (state.workTrack === "all") {
      params.delete("track");
    } else {
      params.set("track", state.workTrack);
    }

    if (state.workTheme === "all") {
      params.delete("theme");
    } else {
      params.set("theme", state.workTheme);
    }

    params.set("lens", state.lens);
    var next = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }

  function filteredWorkItems() {
    return state.items.filter(function (item) {
      var trackMatch = state.workTrack === "all" || item.track === state.workTrack;
      var themeMatch = state.workTheme === "all" || item.themes.indexOf(state.workTheme) !== -1;
      return trackMatch && themeMatch;
    });
  }

  function updateWorkSummary(items) {
    var summary = document.getElementById("work-summary");
    if (!summary) {
      return;
    }

    var parts = ["Showing " + items.length + (items.length === 1 ? " artifact" : " artifacts")];
    if (state.workTrack !== "all") {
      parts.push("in " + titleCase(state.workTrack));
    }
    if (state.workTheme !== "all") {
      parts.push("tagged “" + state.workTheme + "”");
    }
    parts.push("through the " + titleCase(state.lens) + " lens.");
    summary.textContent = parts.join(" ");
  }

  function renderFilterRow(containerId, entries, currentValue, onSelect) {
    var container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    container.innerHTML = entries.map(function (entry) {
      var active = entry.value === currentValue ? " is-active" : "";
      return '<button class="filter-chip' + active + '" type="button" data-value="' + escapeHtml(entry.value) + '">' + escapeHtml(entry.label) + "</button>";
    }).join("");

    Array.prototype.forEach.call(container.querySelectorAll("button"), function (button) {
      button.addEventListener("click", function () {
        onSelect(button.getAttribute("data-value"));
      });
    });
  }

  function renderWorkPage() {
    if (document.body.dataset.page !== "work") {
      return;
    }

    setWorkFiltersFromLocation();

    var trackEntries = [{ value: "all", label: "All" }].concat(state.site.tracks.map(function (track) {
      return { value: track.id, label: track.title };
    }));
    var themeEntries = [{ value: "all", label: "All" }].concat(getUniqueThemes().map(function (theme) {
      return { value: theme, label: theme };
    }));

    renderFilterRow("work-track-filters", trackEntries, state.workTrack, function (value) {
      state.workTrack = value;
      renderWorkPage();
    });

    renderFilterRow("work-theme-filters", themeEntries, state.workTheme, function (value) {
      state.workTheme = value;
      renderWorkPage();
    });

    var items = filteredWorkItems();
    renderArtifactCards("work-grid", items, "work");
    updateWorkSummary(items);
    updateLocationForWork();
  }

  function updateLensBadge() {
    var badge = document.querySelector("[data-lens-current]");
    if (!badge) {
      return;
    }
    var lens = state.site && state.site.lenses
      ? state.site.lenses.find(function (l) { return l.id === state.lens; })
      : null;
    badge.textContent = lens ? lens.label : titleCase(state.lens);
  }

  function updateLensButtons() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-lens-switcher]"), function (switcher) {
      switcher.setAttribute("data-hydrated", "true");
      Array.prototype.forEach.call(switcher.querySelectorAll("button"), function (button) {
        var isActive = button.getAttribute("data-lens") === state.lens;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
    updateLensBadge();
  }

  function updateHeroCopy() {
    var heroBody = document.getElementById("hero-body");
    if (heroBody && state.site.home.heroByLens[state.lens]) {
      heroBody.textContent = state.site.home.heroByLens[state.lens];
    }
  }

  function updatePageIntro() {
    var intro = document.getElementById("page-intro");
    var pageKey = getCurrentPageKey();
    if (!intro) {
      return;
    }

    if (pageKey === "detail") {
      var currentItem = getCurrentItem();
      if (currentItem && currentItem.lensSummary && currentItem.lensSummary[state.lens]) {
        intro.textContent = currentItem.lensSummary[state.lens];
      }
      return;
    }

    if (state.site.pageIntroByLens[pageKey] && state.site.pageIntroByLens[pageKey][state.lens]) {
      intro.textContent = state.site.pageIntroByLens[pageKey][state.lens];
    }
  }

  function applyLens() {
    updateLensButtons();
    updateHeroCopy();
    updatePageIntro();
    renderSignalTiles();
    renderTrackCards();
    renderFeaturedItems();
    renderConstellations();
    renderPromptGrid();
    renderTrackPage();
    renderDetailPage();
    renderWorkPage();
  }

  function initLensSwitcher() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-lens-switcher] button"), function (button) {
      button.addEventListener("click", function () {
        state.lens = button.getAttribute("data-lens") || DEFAULT_LENS;
        storeLens(state.lens);
        applyLens();
        // Close the lens panel after a selection
        var panel = document.getElementById("lens-panel");
        var btn = document.getElementById("lens-btn");
        if (panel) {
          panel.hidden = true;
        }
        if (btn) {
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function initLensToggle() {
    var btn = document.getElementById("lens-btn");
    var panel = document.getElementById("lens-panel");
    if (!btn || !panel) {
      return;
    }
    btn.addEventListener("click", function () {
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (btn && panel && !btn.contains(e.target) && !panel.contains(e.target)) {
        panel.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function formatDate(isoString) {
    var date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
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
      renderFeedPosts(container, posts, posts.length);
    });

    return button;
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

  function showFeedError(container) {
    var item = buildStatusItem("Could not load posts. Visit ");
    var link = document.createElement("a");

    link.href = "https://digitalborn.org";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Digital Born";

    item.appendChild(link);
    item.appendChild(document.createTextNode(" instead."));

    container.textContent = "";
    container.appendChild(item);
  }

  function loadPostFeeds() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-postfeed]"), function (container) {
      var count = Number(container.getAttribute("data-feed-count") || "4");
      if (!state.posts.length) {
        showFeedError(container);
        return;
      }
      renderFeedPosts(container, state.posts, count);
    });
  }

  function init() {
    if (!document.body) {
      return;
    }

    var shouldLoadPosts = Boolean(document.querySelector("[data-postfeed]"));
    var requests = [
      fetchJson(DATA_PATHS.site),
      fetchJson(DATA_PATHS.items),
      shouldLoadPosts
        ? fetchJson(DATA_PATHS.posts).catch(function () {
            return [];
          })
        : Promise.resolve([])
    ];

    Promise.all(requests)
      .then(function (results) {
        state.site = results[0];
        state.items = results[1];
        state.posts = results[2];

        var nextLens = getLensFromLocation() || getStoredLens() || DEFAULT_LENS;
        var lensExists = state.site.lenses.some(function (lens) {
          return lens.id === nextLens;
        });
        state.lens = lensExists ? nextLens : DEFAULT_LENS;

        initLensSwitcher();
        initLensToggle();
        applyLens();
        loadPostFeeds();
      })
      .catch(function (error) {
        window.console.error(error);
      });
  }

  init();
})();
