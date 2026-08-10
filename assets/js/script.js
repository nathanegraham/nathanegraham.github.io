(function () {
  "use strict";

  var DATA_PATHS = {
    items: "/data/items.json",
    posts: "/data/posts.json"
  };

  var PROJECT_ORDER = [
    "crankgpt",
    "faculty-studios",
    "echo-show-poe",
    "kaltura-api-metadata-interface",
    "lightboard-template",
    "opensearch-api-autocomplete",
    "wp-rest-api-post-getter",
    "excel-post-requests",
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

  function getCurrentItem() {
    var itemId = document.body.dataset.item;
    return state.items.find(function (item) {
      return item.id === itemId;
    }) || null;
  }

  function getItemUrl(item) {
    return item.detailUrl || item.externalUrl || "/#projects";
  }

  function createArtifactCard(item) {
    var article = document.createElement("article");
    var meta = document.createElement("p");
    var title = document.createElement("h3");
    var summary = document.createElement("p");
    var themes = document.createElement("div");
    var primaryUrl = getItemUrl(item);

    article.className = "artifact-card";
    article.dataset.track = item.track;

    meta.className = "artifact-meta";
    meta.textContent = titleCase(item.track) + " / " + titleCase(item.format);

    title.className = "artifact-title";
    title.appendChild(createLink(item.title, primaryUrl, "", !item.detailUrl));

    summary.textContent = item.summary;

    themes.className = "artifact-themes";
    item.themes.forEach(function (theme) {
      var tag = document.createElement("span");
      tag.textContent = theme;
      themes.appendChild(tag);
    });

    article.appendChild(meta);
    article.appendChild(title);
    article.appendChild(summary);
    article.appendChild(themes);
    article.appendChild(createLink(
      item.detailUrl ? "Read the story" : "Open the work",
      primaryUrl,
      "artifact-link",
      !item.detailUrl
    ));
    return article;
  }

  function renderRelatedItems() {
    var container = document.getElementById("related-grid");
    var currentItem = getCurrentItem();

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

    container.textContent = "";
    if (!related.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No related work is available yet.";
      container.appendChild(empty);
      return;
    }

    related.forEach(function (entry) {
      container.appendChild(createArtifactCard(entry.item));
    });
  }

  function createProjectItem(item, index) {
    var article = document.createElement("article");
    var number = document.createElement("span");
    var heading = document.createElement("div");
    var meta = document.createElement("p");
    var title = document.createElement("h3");
    var copy = document.createElement("div");
    var summary = document.createElement("p");
    var themes = document.createElement("div");
    var actions = document.createElement("div");

    article.className = "project-item";
    article.id = "project-" + item.id;

    number.className = "project-number";
    number.textContent = String(index + 1).padStart(2, "0");

    meta.className = "project-meta";
    meta.textContent = titleCase(item.format) + " / " + titleCase(item.scale);

    title.className = "project-title";
    title.appendChild(createLink(item.title, getItemUrl(item), "", !item.detailUrl));
    heading.appendChild(meta);
    heading.appendChild(title);

    copy.className = "project-copy";
    summary.className = "project-summary";
    summary.textContent = item.summary;
    themes.className = "project-themes";
    item.themes.forEach(function (theme) {
      var tag = document.createElement("span");
      tag.textContent = theme;
      themes.appendChild(tag);
    });
    copy.appendChild(summary);
    copy.appendChild(themes);

    actions.className = "project-actions";
    if (item.detailUrl) {
      actions.appendChild(createLink("Read the story", item.detailUrl));
    }
    if (item.externalUrl) {
      actions.appendChild(createLink(
        item.externalUrl.indexOf("github.com") !== -1 ? "Open source" : "Original post",
        item.externalUrl,
        "",
        true
      ));
    }

    article.appendChild(number);
    article.appendChild(heading);
    article.appendChild(copy);
    article.appendChild(actions);
    return article;
  }

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
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Projects are temporarily unavailable.";
      container.appendChild(empty);
      return;
    }

    projects.forEach(function (item, index) {
      container.appendChild(createProjectItem(item, index));
    });
  }

  function createPostItem(post) {
    var item = document.createElement("li");
    var time = document.createElement("time");
    var title = document.createElement("p");
    var renderedTitle = post.title && typeof post.title === "object"
      ? post.title.rendered
      : post.title;

    item.className = "post-item";
    time.className = "post-date";
    time.dateTime = post.date;
    time.textContent = formatDate(post.date);
    title.className = "post-title";
    title.appendChild(createLink(decodeTitle(renderedTitle), post.link, "", true));
    item.appendChild(time);
    item.appendChild(title);
    return item;
  }

  function renderWritingFeed(container, limit) {
    var fragment = document.createDocumentFragment();

    state.posts.slice(0, limit).forEach(function (post) {
      fragment.appendChild(createPostItem(post));
    });

    if (limit < state.posts.length) {
      var moreItem = document.createElement("li");
      var moreButton = document.createElement("button");
      moreItem.className = "posts-more";
      moreButton.className = "show-more";
      moreButton.type = "button";
      moreButton.textContent = "Show all writing \u2192";
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
        var status = document.createElement("li");
        status.className = "posts-status";
        status.textContent = "Writing is temporarily unavailable. Visit Digital Born for the full archive.";
        container.appendChild(status);
        return;
      }

      renderWritingFeed(container, Number(container.dataset.feedCount || "6"));
    });
  }

  function setActiveSection(sectionId) {
    document.body.dataset.activeSection = sectionId;
    Array.prototype.forEach.call(document.querySelectorAll("[data-section-link]"), function (link) {
      if (link.dataset.sectionLink === sectionId) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function initSectionNavigation() {
    var sections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
    if (!sections.length) {
      return;
    }

    var ticking = false;
    function updateFromScroll() {
      var marker = window.scrollY + window.innerHeight * 0.42;
      var active = sections[0].dataset.section;

      sections.forEach(function (section) {
        if (section.offsetTop <= marker) {
          active = section.dataset.section;
        }
      });
      setActiveSection(active);
      ticking = false;
    }

    function requestUpdate() {
      if (!ticking) {
        window.requestAnimationFrame(updateFromScroll);
        ticking = true;
      }
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("hashchange", requestUpdate);
    requestUpdate();
  }

  function initHome() {
    initSectionNavigation();
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
