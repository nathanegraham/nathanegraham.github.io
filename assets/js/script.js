(function () {
  "use strict";

  var DATA_PATHS = {
    items: "/data/items.json",
    posts: "/data/posts.json"
  };

  var PROJECT_ORDER = [
    "crankgpt",
    "echo-show-poe",
    "kaltura-api-metadata-interface",
    "lightboard-template",
    "opensearch-api-autocomplete",
    "wp-rest-api-post-getter",
    "tntpstaff-theme"
  ];

  var state = {
    items: [],
    posts: []
  };

  function fetchJson(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load " + path + " (" + response.status + ")");
      }
      return response.json();
    });
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, function (character) {
        return character.toUpperCase();
      });
  }

  function decodeTitle(value) {
    var textarea = document.createElement("textarea");
    textarea.innerHTML = String(value || "").replace(/<[^>]*>/g, "");
    return textarea.value;
  }

  function formatDate(value) {
    var date = new Date(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
  }

  function createLink(label, href, className, external) {
    var link = document.createElement("a");
    link.textContent = label;
    link.href = href;
    if (className) {
      link.className = className;
    }
    if (external) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    return link;
  }

  function statusItem(className, message) {
    var item = document.createElement("li");
    item.className = className;
    item.textContent = message;
    return item;
  }

  /* One line of the contents: a title, a run of leaders, a short label, and
     optionally a sentence underneath. Every list on the site is made of these. */
  function createRow(options) {
    var row = document.createElement("li");
    var dots = document.createElement("span");
    var meta = document.createElement("span");

    row.className = "row";
    row.appendChild(createLink(options.title, options.href, "row__title", options.external));

    dots.className = "row__dots";
    dots.setAttribute("aria-hidden", "true");
    row.appendChild(dots);

    meta.className = "row__meta";
    if (options.time) {
      var time = document.createElement("time");
      time.dateTime = options.time;
      time.textContent = options.meta;
      meta.appendChild(time);
    } else {
      meta.textContent = options.meta;
    }
    row.appendChild(meta);

    if (options.note) {
      var note = document.createElement("p");
      note.className = "row__note";
      note.textContent = options.note;
      row.appendChild(note);
    }
    return row;
  }

  function getItemUrl(item) {
    return item.detailUrl || item.externalUrl || "/#projects";
  }

  function createItemRow(item) {
    return createRow({
      title: item.title,
      href: getItemUrl(item),
      external: !item.detailUrl,
      meta: titleCase(item.format),
      note: item.summary
    });
  }

  /* ---- Homepage -------------------------------------------------------- */

  function renderProjects() {
    var container = document.getElementById("project-index");
    if (!container) {
      return;
    }

    var projectsById = new Map(state.items
      .filter(function (item) { return item.track === "projects"; })
      .map(function (item) { return [item.id, item]; }));
    var projects = PROJECT_ORDER
      .map(function (id) { return projectsById.get(id); })
      .filter(Boolean);

    projectsById.forEach(function (item) {
      if (PROJECT_ORDER.indexOf(item.id) === -1) {
        projects.push(item);
      }
    });

    container.textContent = "";
    if (!projects.length) {
      container.appendChild(statusItem("empty-state", "Projects are temporarily unavailable."));
      return;
    }

    projects.forEach(function (item) {
      container.appendChild(createItemRow(item));
    });
  }

  function renderWritingFeed(container, limit) {
    var fragment = document.createDocumentFragment();

    state.posts.slice(0, limit).forEach(function (post) {
      var renderedTitle = post.title && typeof post.title === "object"
        ? post.title.rendered
        : post.title;
      fragment.appendChild(createRow({
        title: decodeTitle(renderedTitle),
        href: post.link,
        external: true,
        meta: formatDate(post.date),
        time: post.date
      }));
    });

    if (limit < state.posts.length) {
      var moreItem = document.createElement("li");
      var moreButton = document.createElement("button");
      moreButton.className = "show-more";
      moreButton.type = "button";
      moreButton.textContent = "All " + state.posts.length + " posts ↓";
      moreButton.addEventListener("click", function () {
        renderWritingFeed(container, state.posts.length);
      });
      moreItem.appendChild(moreButton);
      fragment.appendChild(moreItem);
    }

    container.textContent = "";
    container.appendChild(fragment);
  }

  function renderWriting() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-postfeed]"), function (container) {
      if (!state.posts.length) {
        container.textContent = "";
        container.appendChild(statusItem(
          "posts-status",
          "Writing is temporarily unavailable. Visit Digital Born for the full archive."
        ));
        return;
      }

      renderWritingFeed(container, Number(container.dataset.feedCount || "6"));
    });
  }

  /* ---- The cardinal ----------------------------------------------------
     One bird, and it only ever sits beside what you are reading. Each section
     carries an empty [data-perch] marker on its top rule; the hero's marker is
     on the branch. As the page scrolls, the bird flies to the marker of the
     section now in view. Without script, or before it runs, the bird is simply
     an element inside the branch and stays there. */

  function initCardinal() {
    var bird = document.querySelector("[data-cardinal]");
    var page = document.querySelector(".page");
    var perches = Array.prototype.slice.call(document.querySelectorAll("[data-perch]"));

    if (!bird || !page || perches.length < 2) {
      return;
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var current = null;
    var position = { x: 0, y: 0 };
    var landing = 0;

    function pointFor(perch) {
      var mark = perch.getBoundingClientRect();
      var origin = page.getBoundingClientRect();
      return { x: mark.left - origin.left, y: mark.top - origin.top };
    }

    function moveTo(point) {
      position = point;
      bird.style.setProperty("--x", point.x.toFixed(1) + "px");
      bird.style.setProperty("--y", point.y.toFixed(1) + "px");
    }

    /* Snap without animating: first paint, resizes, and content arriving. */
    function settle() {
      if (!current) {
        return;
      }
      window.clearTimeout(landing);
      bird.classList.add("is-still");
      bird.classList.remove("is-flying");
      moveTo(pointFor(current));
      void bird.offsetWidth;
      bird.classList.remove("is-still");
    }

    function flyTo(perch) {
      var target = pointFor(perch);
      var dx = target.x - position.x;
      var dy = target.y - position.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var duration = Math.max(800, Math.min(1700, distance * 1.5));

      current = perch;
      if (reduceMotion.matches || distance < 2) {
        settle();
        return;
      }

      window.clearTimeout(landing);
      bird.style.setProperty("--flight", duration.toFixed(0) + "ms");
      bird.style.setProperty("--pitch", dy < 0 ? "-6deg" : "30deg");
      bird.classList.add("is-flying");
      moveTo(target);
      landing = window.setTimeout(function () {
        bird.classList.remove("is-flying");
      }, duration);
    }

    function perchInView() {
      var line = window.innerHeight * 0.45;
      var active = perches[0];
      perches.forEach(function (perch) {
        if (perch.getBoundingClientRect().top <= line) {
          active = perch;
        }
      });
      return active;
    }

    /* Scroll events already arrive at most once a frame, and this reads five
       rectangles, so it runs directly rather than waiting on an animation
       frame that a background tab would never deliver. */
    function update() {
      var next = perchInView();
      if (next !== current) {
        flyTo(next);
      }
    }

    /* Lift the bird out of the branch so it can cross the whole page. */
    current = perchInView();
    page.appendChild(bird);
    bird.classList.add("is-free");
    settle();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", update);

    /* Lists arrive after the first paint and fonts swap in, both of which move
       the perches. Keep the bird on its marker when the page changes shape. */
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        var next = perchInView();
        if (next !== current) {
          current = next;
        }
        settle();
      }).observe(page);
    } else {
      window.addEventListener("resize", settle);
    }
  }

  function initHome() {
    initCardinal();
    Promise.all([
      fetchJson(DATA_PATHS.items),
      fetchJson(DATA_PATHS.posts).catch(function (error) {
        console.warn(error);
        return [];
      })
    ]).then(function (results) {
      state.items = results[0];
      state.posts = results[1];
      renderProjects();
      renderWriting();
    }).catch(function (error) {
      console.error(error);
      state.items = [];
      renderProjects();
      renderWriting();
    });
  }

  /* ---- Project pages ---------------------------------------------------- */

  function renderRelatedItems() {
    var container = document.getElementById("related-grid");
    var itemId = document.body.dataset.item;
    var currentItem = state.items.find(function (item) {
      return item.id === itemId;
    }) || null;

    if (!container || !currentItem) {
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
      .sort(function (a, b) {
        return b.score - a.score;
      })
      .slice(0, 3);

    var list = document.createElement("ol");
    list.className = "rows";

    if (!related.length) {
      list.appendChild(statusItem("empty-state", "No related work is available yet."));
    } else {
      related.forEach(function (entry) {
        list.appendChild(createItemRow(entry.item));
      });
    }

    container.textContent = "";
    container.appendChild(list);
  }

  function initDetail() {
    fetchJson(DATA_PATHS.items).then(function (items) {
      state.items = items;
      renderRelatedItems();
    }).catch(function (error) {
      console.error(error);
      renderRelatedItems();
    });
  }

  function init() {
    if (document.body.dataset.page === "home") {
      initHome();
    } else if (document.body.dataset.page === "detail") {
      initDetail();
    }
  }

  init();
}());
