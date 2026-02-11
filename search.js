(() => {
  const searchBtn = document.getElementById("topSearch");
  if (!searchBtn) {
    return;
  }

  const FRIENDS_KEY = "cameraIrisFriends";
  const MEDIA_STORAGE_KEY = "cameraIrisMediaLibrary";

  const panel = document.createElement("div");
  panel.id = "searchPanel";
  panel.className = "search-panel hidden";
  panel.innerHTML = `
    <div class="search-input-wrap">
      <input id="searchInput" class="search-input" type="text" placeholder="Search friends and image names..." />
    </div>
    <div id="searchResults" class="search-results"></div>
  `;
  document.body.appendChild(panel);

  const input = panel.querySelector("#searchInput");
  const results = panel.querySelector("#searchResults");

  function loadFriends() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(FRIENDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((friend) => friend && friend.accepted) : [];
    } catch (error) {
      return [];
    }
  }

  function loadImages() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(MEDIA_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : { assets: [] };
      const assets = Array.isArray(parsed?.assets) ? parsed.assets : [];
      return assets.filter((asset) => asset && asset.kind !== "video" && asset.title);
    } catch (error) {
      return [];
    }
  }

  function clearResults() {
    results.innerHTML = "";
  }

  function createSection(title, items) {
    const section = document.createElement("div");
    section.className = "search-section";

    const heading = document.createElement("div");
    heading.className = "search-section-title";
    heading.textContent = title;
    section.appendChild(heading);

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = "No matches";
      section.appendChild(empty);
      return section;
    }

    items.forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "search-result";
      row.addEventListener("click", () => {
        if (item.href) {
          window.location.href = item.href;
        }
        closePanel();
      });

      const label = document.createElement("span");
      label.className = "search-result-label";
      label.textContent = item.label;

      if (item.meta) {
        const meta = document.createElement("span");
        meta.className = "search-result-meta";
        meta.textContent = item.meta;
        row.appendChild(meta);
      }

      row.appendChild(label);
      section.appendChild(row);
    });

    return section;
  }

  function renderResults() {
    clearResults();
    const query = input.value.trim().toLowerCase();

    if (!query) {
      const hint = document.createElement("div");
      hint.className = "search-empty";
      hint.textContent = "Type to search friends and image names.";
      results.appendChild(hint);
      return;
    }

    const friends = loadFriends().filter((friend) => {
      const name = (friend.name || "").toLowerCase();
      const handle = (friend.handle || "").toLowerCase();
      return name.includes(query) || handle.includes(query);
    });

    const images = loadImages().filter((asset) => {
      const title = (asset.title || "").toLowerCase();
      return title.includes(query);
    });

    const friendItems = friends.slice(0, 8).map((friend) => ({
      label: friend.name || "Friend",
      meta: friend.handle || "@friend",
      href: "friends.html",
    }));

    const imageItems = images.slice(0, 8).map((asset) => ({
      label: asset.title,
      meta: "Image",
      href: "media.html",
    }));

    results.appendChild(createSection("Friends", friendItems));
    results.appendChild(createSection("Images", imageItems));
  }

  function openPanel() {
    panel.classList.remove("hidden");
    input.focus();
    renderResults();
  }

  function closePanel() {
    panel.classList.add("hidden");
  }

  searchBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (panel.classList.contains("hidden")) {
      openPanel();
    } else {
      closePanel();
    }
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  input.addEventListener("input", renderResults);

  document.addEventListener("click", () => {
    closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });
})();
