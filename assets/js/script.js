const ASTRAL_CDN_URL = "https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/";
const BOOKS_CDN_URL = "https://cdn.jsdelivr.net/gh/HyperFrog7/books@main/";

function getCacheKey() {
  return Math.floor(Date.now() / (1000 * 60 * 5));
}

async function loadAllGames() {
  try {
    const cacheKey = getCacheKey();

    const astralResponse = await fetch(
      `${BOOKS_CDN_URL}astral.json?v=${cacheKey}`,
    );
    const astralGames = await astralResponse.json();

    const gnMathResponse = await fetch(
      `${BOOKS_CDN_URL}gn-math.json?v=${cacheKey}`,
    );
    const gnMathGames = await gnMathResponse.json();

    const ugsResponse = await fetch(`${BOOKS_CDN_URL}ugs.json?v=${cacheKey}`);
    const ugsGames = await ugsResponse.json();

    const seraphResponse = await fetch(
      `${BOOKS_CDN_URL}seraph.json?v=${cacheKey}`,
    );
    const seraphGames = await seraphResponse.json();

    allGames = [...astralGames, ...gnMathGames, ...ugsGames, ...seraphGames];
    window.currentMatchedGames = allGames;

    updateCategoryDropdown();
    applyFilters();
  } catch (error) {
    console.error("Error loading games:", error);
  }
}

let allGames = [];
let activeGameFile = "";
let visibleCount = 48;

const RECENT_KEY = "astral_recent_games";
const FAVORITES_KEY = "astral_favorite_games";
const COLLAPSED_KEY = "astral_collapsed_categories";
const CURRENT_VERSION = "1.1.0";
const VERSION_KEY = "astral_seen_version";
const batchSize = 48;

function checkVersionModal() {
  const seenVersion = localStorage.getItem(VERSION_KEY);

  if (seenVersion !== CURRENT_VERSION) {
    const modal = document.getElementById("whats-new-modal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }
}

function dismissVersionModal() {
  const modal = document.getElementById("whats-new-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
}

function getCollapsedCategories() {
  return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || [];
}

function toggleCollapsedCategory(categoryTitle) {
  let collapsed = getCollapsedCategories();
  const index = collapsed.indexOf(categoryTitle);

  if (index > -1) {
    collapsed.splice(index, 1);
  } else {
    collapsed.push(categoryTitle);
  }

  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
}

const cloakPresets = {
  default: {
    title: "Astral",
    icon: "assets/media/logo.svg",
  },
  google: {
    title: "Google",
    icon: "assets/media/google.png",
  },
  drive: {
    title: "My Drive - Google Drive",
    icon: "assets/media/drive.png",
  },
  classroom: {
    title: "Classes",
    icon: "assets/media/classroom.png",
  },
  clever: {
    title: "Clever | Portal",
    icon: "assets/media/clever.png",
  },
  grades: {
    title: "Grades",
    icon: "assets/media/grades.png",
  },
  newtab: {
    title: "New Tab",
    icon: "educational site",
  },
};

let currentCloak = cloakPresets.default;

function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
}

function getRecents() {
  return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
}

function addRecentlyPlayed(game) {
  if (!game) return;
  let recents = getRecents();
  const gameId = game.file || game.url || game.name;

  recents = recents.filter(
    (item) => (item.file || item.url || item.name) !== gameId,
  );
  recents.unshift(game);

  if (recents.length > 6) recents.pop();

  localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}

function toggleFavorite(game, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  let favorites = getFavorites();
  const gameId = game.file || game.url || game.name;
  const index = favorites.findIndex(
    (item) => (item.file || item.url || item.name) === gameId,
  );

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(game);
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  applyFilters();
}

window.openSettings = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.remove("hidden");
};

window.closeSettings = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.add("hidden");
};

function loadAutoCloakSetting() {
  const checkbox = document.getElementById("auto-cloak-checkbox");
  if (!checkbox) return;

  const isAutoCloakEnabled =
    localStorage.getItem("autoCloakEnabled") === "true";
  checkbox.checked = isAutoCloakEnabled;
}

function saveAutoCloakSetting() {
  const checkbox = document.getElementById("auto-cloak-checkbox");
  if (!checkbox) return;

  localStorage.setItem("autoCloakEnabled", checkbox.checked ? "true" : "false");
}

async function openInAboutBlank(targetUrlParam) {
  try {
    let response = await fetch("assets/payloads/singlefile.html");

    if (!response.ok) {
      response = await fetch(
        "https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/assets/payloads/singlefile.html",
      );
    }

    if (!response.ok) {
      throw new Error(
        `Failed to retrieve singlefile.html (${response.status})`,
      );
    }

    const htmlContent = await response.text();

    const win = window.open("about:blank", "_blank");
    if (!win) {
      alert("Please allow popups for tab cloaking to work. sonion 🫪");
      return;
    }

    win.document.open("text/html", "replace");
    win.document.write(htmlContent);
    win.document.close();

    const panicUrl =
      localStorage.getItem("panicRedirectUrl") || "https://www.google.com";
    window.location.href = panicUrl;
  } catch (error) {
    console.error("Error opening singlefile.html in about:blank:", error);
  }
}

function savePanicUrlSetting() {
  const panicInput = document.getElementById("panic-url-input");
  if (!panicInput) return;

  const url = panicInput.value.trim();
  if (url) {
    localStorage.setItem("panicRedirectUrl", url);
  }
}

function loadPanicUrlSetting() {
  const panicInput = document.getElementById("panic-url-input");
  if (!panicInput) return;

  const savedUrl =
    localStorage.getItem("panicRedirectUrl") || "https://www.google.com";
  panicInput.value = savedUrl;
}

function getCategoryKey(game) {
  const filePath = game.file || game.url || "";
  if (filePath.includes("gn-math/")) return "GN-Math";
  if (filePath.includes("ugs/")) return "UGS";
  if (filePath.includes("seraph/") || filePath.includes("seraph"))
    return "Seraph";
  return "Astral";
}

function groupGamesByCategory(gamesList) {
  const groups = {};
  gamesList.forEach((game) => {
    const cat = getCategoryKey(game);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(game);
  });
  return groups;
}

function updateCategoryDropdown() {
  const categorySelect = document.getElementById("category-select");
  if (!categorySelect) return;

  const grouped = groupGamesByCategory(allGames);

  const astralCount = (grouped["Astral"] || []).length;
  const gnMathCount = (grouped["GN-Math"] || []).length;
  const ugsCount = (grouped["UGS"] || []).length;
  const seraphCount = (grouped["Seraph"] || []).length;

  categorySelect.innerHTML = `
    <option value="all">All (${allGames.length})</option>
    <option value="astral">Astral (${astralCount})</option>
    <option value="gn-math">GN-Math (${gnMathCount})</option>
    <option value="ugs">UGS (${ugsCount})</option>
    <option value="seraph">Seraph (${seraphCount})</option>
  `;
}

function renderCategorySection(container, title, gamesList) {
  if (!gamesList || gamesList.length === 0) return;

  const favorites = getFavorites();
  const collapsedList = getCollapsedCategories();
  const isInitiallyCollapsed = collapsedList.includes(title);

  const section = document.createElement("div");
  section.className = "category-section";

  const header = document.createElement("div");
  header.className = "category-header";
  header.innerHTML = `
    <span>${title} (${gamesList.length})</span>
    <span class="toggle-icon">${isInitiallyCollapsed ? "+" : "−"}</span>
  `;

  const grid = document.createElement("div");
  grid.className = "category-grid";
  if (isInitiallyCollapsed) {
    grid.classList.add("collapsed");
  }

  header.addEventListener("click", () => {
    const isCollapsed = grid.classList.toggle("collapsed");
    const icon = header.querySelector(".toggle-icon");
    if (icon) {
      icon.textContent = isCollapsed ? "+" : "−";
    }
    toggleCollapsedCategory(title);
  });

  gamesList.forEach((game) => {
    const name = game.name || game.title || "Untitled Game";
    let rawIcon = game.icon || game.cover || "";
    let imageSrc = `${ASTRAL_CDN_URL}${cleanIconPath}`;

    if (
      rawIcon &&
      !rawIcon.startsWith("http") &&
      !rawIcon.startsWith("data:")
    ) {
      const cleanIconPath = rawIcon.replace(/^(\.\/|\/)/, "");
      imageSrc = `${ASTRAL_CDN_URL}${cleanIconPath}`;
    } else if (!rawIcon) {
      imageSrc = "assets/media/logo.svg";
    }

    const gameId = game.file || game.url || game.name;
    const isFav = favorites.some(
      (item) => (item.file || item.url || item.name) === gameId,
    );

    const card = document.createElement("a");
    card.className = "game-card";
    card.href = "#";

    card.innerHTML = `
      <button class="fav-btn ${isFav ? "active" : ""}" title="${isFav ? "Unfavorite" : "Favorite"}">
        ${isFav ? "★" : "☆"}
      </button>
      <img
        src="${imageSrc}"
        alt="${name}"
        class="game-icon"
        loading="lazy"
        onerror="this.onerror=null; this.src='assets/media/logo.svg';"
      />
      <h3 class="game-title">${name}</h3>
    `;

    const favBtn = card.querySelector(".fav-btn");
    if (favBtn) {
      favBtn.addEventListener("click", (e) => toggleFavorite(game, e));
    }

    card.addEventListener("click", (e) => {
      e.preventDefault();
      openGame(game);
    });

    grid.appendChild(card);
  });

  section.appendChild(header);
  section.appendChild(grid);
  container.appendChild(section);
}

function renderCategorizedGames(gamesList, isFiltered = false) {
  const container = document.getElementById("game-grid");
  if (!container) return;

  container.innerHTML = "";

  if (!gamesList || gamesList.length === 0) {
    container.innerHTML = '<div class="no-results">No games found</div>';
    return;
  }

  if (!isFiltered) {
    const recents = getRecents();
    const favorites = getFavorites();

    renderCategorySection(container, "Favorites", favorites);
    renderCategorySection(container, "Recently Played", recents);
  }

  const grouped = groupGamesByCategory(gamesList);
  Object.keys(grouped).forEach((categoryName) => {
    renderCategorySection(container, categoryName, grouped[categoryName]);
  });
}

function applyFilters() {
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-select");

  const query =
    searchInput && searchInput.value
      ? searchInput.value.toLowerCase().trim()
      : "";
  const selectedCategory =
    categorySelect && categorySelect.value ? categorySelect.value : "all";

  const isFiltered = query !== "" || selectedCategory !== "all";

  const matched = allGames.filter((game) => {
    if (!game) return false;

    const name = (game.name || game.title || "").toLowerCase();
    const filePath = game.file || game.url || "";
    const category = game.category || "";

    const matchesSearch = !query || name.indexOf(query) !== -1;

    let matchesCategory = true;
    if (selectedCategory !== "all") {
      if (selectedCategory === "astral") {
        matchesCategory =
          !filePath.includes("gn-math/") &&
          !filePath.includes("ugs/") &&
          !filePath.includes("seraph/") &&
          !filePath.includes("seraph");
      } else {
        const targetPath = selectedCategory + "/";
        matchesCategory =
          filePath.includes(targetPath) ||
          filePath.includes(selectedCategory) ||
          category === selectedCategory;
      }
    }

    return matchesSearch && matchesCategory;
  });

  window.currentMatchedGames = matched;

  const visibleGames = matched.slice(0, visibleCount);
  renderCategorizedGames(visibleGames, isFiltered);
}

window.searchGames = function () {
  applyFilters();
};

window.changeCategory = function () {
  applyFilters();
};

async function loadAllGames() {
  try {
    const t = Date.now();
    const astralResponse = await fetch(`${BOOKS_CDN_URL}astral.json?t=${t}`);
    const astralGames = await astralResponse.json();

    const gnMathResponse = await fetch(`${BOOKS_CDN_URL}gn-math.json?t=${t}`);
    const gnMathGames = await gnMathResponse.json();

    const ugsResponse = await fetch(`${BOOKS_CDN_URL}ugs.json?t=${t}`);
    const ugsGames = await ugsResponse.json();

    const seraphResponse = await fetch(`${BOOKS_CDN_URL}seraph.json?t=${t}`);
    const seraphGames = await seraphResponse.json();

    allGames = [...astralGames, ...gnMathGames, ...ugsGames, ...seraphGames];
    window.currentMatchedGames = allGames;

    updateCategoryDropdown();
    applyFilters();
  } catch (error) {
    console.error("Error loading games:", error);
  }
}

function closeGame() {
  const gameModal = document.getElementById("game-modal");
  const gameFrame = document.getElementById("game-frame");

  if (gameModal) gameModal.classList.add("hidden");
  if (gameFrame) {
    gameFrame.removeAttribute("srcdoc");
    gameFrame.src = "about:blank";
  }

  document.body.style.overflow = "";
}

async function openGame(gameParam, fallbackPath) {
  const gameModal = document.getElementById("game-modal");
  const gameFrame = document.getElementById("game-frame");
  const gameTitle = document.getElementById("game-modal-title");

  if (!gameModal || !gameFrame || !gameTitle) return;

  const gameObj =
    typeof gameParam === "object"
      ? gameParam
      : { name: gameParam, file: fallbackPath };
  const name = gameObj.name || gameObj.title;
  let filePath = gameObj.file || gameObj.url;

  if (!filePath) return;

  addRecentlyPlayed(gameObj);
  applyFilters();

  activeGameFile = filePath;
  gameTitle.textContent = name || "Untitled Game";

  const cleanPath = filePath.replace(/^(games\/|\.\/)/, "");
  let targetUrl = `${BOOKS_CDN_URL}${cleanPath}`;

  try {
    const response = await fetch(targetUrl + "?t=" + Date.now());
    const htmlContent = await response.text();

    gameFrame.srcdoc = htmlContent;
  } catch (err) {
    console.error("Failed to load game via fetch method:", err);
    gameFrame.src = targetUrl;
  }

  gameModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function setTabCloak(presetKey) {
  const preset = cloakPresets[presetKey] || cloakPresets.default;
  currentCloak = preset;

  document.title = preset.title;

  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "shortcut icon";
    document.head.appendChild(link);
  }
  link.href = preset.icon;

  localStorage.setItem("selectedCloak", presetKey);
}

document.addEventListener("DOMContentLoaded", () => {
  loadPanicUrlSetting();
  loadAutoCloakSetting();

  const saveBtn = document.getElementById("save-panic-url-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", savePanicUrlSetting);
  }

  const autoCloakCheckbox = document.getElementById("auto-cloak-checkbox");
  if (autoCloakCheckbox) {
    autoCloakCheckbox.addEventListener("change", () => {
      saveAutoCloakSetting();
    });
  }

  const closeWhatsNewBtn = document.getElementById("close-whats-new-btn");
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-select");
  const closeBtn = document.getElementById("close-btn");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const downloadBtn = document.getElementById("download-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const cloakSiteBtn = document.getElementById("cloak-site-btn");
  const cloakGameBtn = document.getElementById("cloak-game-btn");
  const cloakPresetSelect = document.getElementById("cloak-preset-select");
  const settingsIcon = document.getElementById("settings-icon");

  const savedCloak = localStorage.getItem("selectedCloak") || "default";
  setTabCloak(savedCloak);

  if (closeWhatsNewBtn) {
    closeWhatsNewBtn.addEventListener("click", dismissVersionModal);
  }

  checkVersionModal();

  if (settingsIcon) {
    settingsIcon.addEventListener("click", window.openSettings);
  }

  if (cloakPresetSelect) {
    cloakPresetSelect.value = savedCloak;
    cloakPresetSelect.addEventListener("change", (e) => {
      setTabCloak(e.target.value);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      visibleCount = batchSize;
      applyFilters();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      visibleCount = batchSize;
      applyFilters();
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeGame);

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      const gameFrame = document.getElementById("game-frame");
      if (!gameFrame) return;

      if (gameFrame.requestFullscreen) {
        gameFrame.requestFullscreen();
      } else if (gameFrame.webkitRequestFullscreen) {
        gameFrame.webkitRequestFullscreen();
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (!activeGameFile) return;
      const a = document.createElement("a");
      a.href = activeGameFile;
      a.download = activeGameFile.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  if (closeSettingsBtn)
    closeSettingsBtn.addEventListener("click", window.closeSettings);

  if (cloakSiteBtn) {
    cloakSiteBtn.addEventListener("click", () => {
      openInAboutBlank(window.location.href);
    });
  }

  if (cloakGameBtn) {
    cloakGameBtn.addEventListener("click", () => {
      if (activeGameFile) {
        openInAboutBlank(activeGameFile);
      }
    });
  }

  if (
    window.self === window.top &&
    localStorage.getItem("autoCloakEnabled") === "true"
  ) {
    setTimeout(() => {
      openInAboutBlank(window.location.href);
    }, 100);
  }
});

window.addEventListener("keydown", (e) => {
  const gameModal = document.getElementById("game-modal");
  const settingsModal = document.getElementById("settings-modal");

  if (e.key === "Escape") {
    if (gameModal && !gameModal.classList.contains("hidden")) {
      closeGame();
    }
    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      window.closeSettings();
    }
  }
});

window.addEventListener("scroll", () => {
  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - 500;

  const totalMatched = window.currentMatchedGames
    ? window.currentMatchedGames.length
    : 0;

  if (scrollPosition >= threshold && visibleCount < totalMatched) {
    visibleCount += batchSize;
    applyFilters();
  }
});
