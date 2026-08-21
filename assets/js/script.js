const ASTRAL_CDN_URL = "https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/";
const BOOKS_CDN_URL = "https://cdn.jsdelivr.net/gh/HyperFrog7/books@main/";

function getBookUrl(category, fileId) {
  if (!fileId) return "";
  if (fileId.startsWith("http")) return fileId;

  const cleanId = fileId.replace(/^(\.\/|\/)/, "");
  const catKey = (category || "").toLowerCase();

  if (
    cleanId.startsWith("gn-math/") ||
    cleanId.startsWith("astral/") ||
    cleanId.startsWith("seraph/") ||
    cleanId.startsWith("ugs/")
  ) {
    return `${BOOKS_CDN_URL}${cleanId}`;
  }

  const folder = catKey || "astral";
  return `${BOOKS_CDN_URL}${folder}/${cleanId}`;
}

let allGames = [];
let activeGameFile = "";
let visibleCount = 48;

const RECENT_KEY = "astral_recent_games";
const FAVORITES_KEY = "astral_favorite_games";
const COLLAPSED_KEY = "astral_collapsed_categories";
const VERSION_KEY = "astral_seen_version";
const batchSize = 48;

let changelogData = null;

async function loadChangelog() {
  try {
    const response = await fetch(
      `${ASTRAL_CDN_URL}assets/media/changelog.json?t=${Date.now()}`,
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    changelogData = await response.json();
    if (!Array.isArray(changelogData) || changelogData.length === 0) return;

    renderChangelogModal(changelogData);
    checkVersionModal(changelogData[0].version);
  } catch (error) {
    console.error("Error loading changelog:", error);
  }
}

function renderChangelogModal(entries) {
  if (!entries || entries.length === 0) return;

  const latest = entries[0];
  const olderEntries = entries.slice(1);

  const versionBadge = document.querySelector(
    "#whats-new-modal .modal-header .version-badge",
  );
  const tagline = document.querySelector("#whats-new-modal .release-tagline");
  const list = document.querySelector("#whats-new-modal .changelog-list");
  const pastList = document.getElementById("past-updates-list");
  const toggleBtn = document.getElementById("toggle-past-updates-btn");

  if (versionBadge) versionBadge.textContent = latest.version || "";
  if (tagline) tagline.textContent = latest.tagline || "";

  if (list) {
    list.innerHTML = "";
    (latest.changes || []).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry;
      list.appendChild(li);
    });
  }

  if (pastList) {
    pastList.innerHTML = "";
    olderEntries.forEach((release) => {
      const entrySection = document.createElement("div");
      entrySection.className = "past-update-entry";

      const header = document.createElement("div");
      header.className = "past-update-header";

      const badge = document.createElement("span");
      badge.className = "version-badge";
      badge.textContent = release.version || "";

      const taglineSpan = document.createElement("span");
      taglineSpan.textContent = release.tagline || "";

      header.appendChild(badge);
      header.appendChild(taglineSpan);

      const ul = document.createElement("ul");
      ul.className = "changelog-list";
      (release.changes || []).forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry;
        ul.appendChild(li);
      });

      entrySection.appendChild(header);
      entrySection.appendChild(ul);
      pastList.appendChild(entrySection);
    });
  }

  if (toggleBtn) {
    toggleBtn.style.display = olderEntries.length > 0 ? "" : "none";
  }
}

function showLoadingState() {
  const container = document.getElementById("game-grid");
  if (!container) return;

  const skeletonCount = 18;
  let cardsHtml = "";
  for (let i = 0; i < skeletonCount; i++) {
    cardsHtml += `
      <div class="skeleton-card">
        <div class="skeleton-icon"></div>
        <div class="skeleton-title"></div>
      </div>
    `;
  }

  container.innerHTML = `<div class="skeleton-grid">${cardsHtml}</div>`;
}

function showErrorState(message) {
  const container = document.getElementById("game-grid");
  if (!container) return;
  container.innerHTML = `
    <div class="loading-state">
      <p>${message}</p>
      <button id="retry-load-btn" class="modal-btn">Retry</button>
    </div>
  `;
  const retryBtn = document.getElementById("retry-load-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", loadAllGames);
  }
}

async function loadAllGames() {
  showLoadingState();
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
    showErrorState("Couldn't load games. Check your connection and try again.");
  }
}

function checkVersionModal(currentVersion) {
  const seenVersion = localStorage.getItem(VERSION_KEY);

  if (seenVersion !== currentVersion) {
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
  if (
    Array.isArray(changelogData) &&
    changelogData.length > 0 &&
    changelogData[0].version
  ) {
    localStorage.setItem(VERSION_KEY, changelogData[0].version);
  }
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
    icon: `${ASTRAL_CDN_URL}assets/media/logo.svg`,
  },
  google: {
    title: "Google",
    icon: `${ASTRAL_CDN_URL}assets/media/google.png`,
  },
  drive: {
    title: "My Drive - Google Drive",
    icon: `${ASTRAL_CDN_URL}assets/media/drive.png`,
  },
  classroom: {
    title: "Classes",
    icon: `${ASTRAL_CDN_URL}assets/media/classroom.png`,
  },
  clever: {
    title: "Clever | Portal",
    icon: `${ASTRAL_CDN_URL}assets/media/clever.png`,
  },
  grades: {
    title: "Grades",
    icon: `${ASTRAL_CDN_URL}assets/media/grades.png`,
  },
  newtab: {
    title: "New Tab",
    icon: `${ASTRAL_CDN_URL}assets/media/logo.svg`,
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

async function openInAboutBlank() {
  try {
    let response = await fetch(
      `${ASTRAL_CDN_URL}assets/payloads/singlefile.html`,
    );

    if (!response.ok) {
      response = await fetch("assets/payloads/singlefile.html");
    }

    if (!response.ok) {
      throw new Error(
        `Failed to retrieve singlefile.html (${response.status})`,
      );
    }

    let htmlContent = await response.text();

    htmlContent = htmlContent.replace(/assets\/images\//g, "assets/media/");

    const win = window.open("about:blank", "_blank");
    if (!win) {
      alert("Please allow popups for tab cloaking to work.");
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
  const explicitCategory = (game.category || "").toLowerCase();
  if (explicitCategory === "gn-math") return "GN-Math";
  if (explicitCategory === "ugs") return "UGS";
  if (explicitCategory === "seraph") return "Seraph";
  if (explicitCategory === "astral") return "Astral";

  const filePath = game.file || game.url || "";
  if (filePath.includes("gn-math/")) return "GN-Math";
  if (filePath.includes("ugs/")) return "UGS";
  if (filePath.includes("seraph/")) return "Seraph";
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

function renderCategorySection(container, title, gamesList, totalCount) {
  if (!gamesList || gamesList.length === 0) return;

  const favorites = getFavorites();
  const collapsedList = getCollapsedCategories();
  const isInitiallyCollapsed = collapsedList.includes(title);

  const section = document.createElement("div");
  section.className = "category-section";

  const displayCount =
    typeof totalCount === "number" ? totalCount : gamesList.length;

  const header = document.createElement("div");
  header.className = "category-header";
  header.innerHTML = `
    <span>${title} (${displayCount})</span>
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

  const fallbackLogo = `${ASTRAL_CDN_URL}assets/media/logo.svg`;

  gamesList.forEach((game) => {
    const name = game.name || game.title || "Untitled Game";
    let rawIcon = game.icon || game.cover || "";
    let imageSrc = fallbackLogo;

    if (
      rawIcon &&
      !rawIcon.startsWith("http") &&
      !rawIcon.startsWith("data:")
    ) {
      const cleanIconPath = rawIcon.replace(/^(\.\/|\/)/, "");
      imageSrc = `${ASTRAL_CDN_URL}${cleanIconPath}`;
    } else if (rawIcon) {
      imageSrc = rawIcon;
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
        onerror="this.onerror=null; this.src='${fallbackLogo}';"
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

function renderCategorizedGames(
  gamesList,
  isFiltered = false,
  categoryTotals = {},
) {
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
    const totalForCategory = categoryTotals[categoryName]
      ? categoryTotals[categoryName].length
      : grouped[categoryName].length;
    renderCategorySection(
      container,
      categoryName,
      grouped[categoryName],
      totalForCategory,
    );
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
          !filePath.includes("seraph/");
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
  const categoryTotals = groupGamesByCategory(matched);
  renderCategorizedGames(visibleGames, isFiltered, categoryTotals);
}

window.searchGames = function () {
  applyFilters();
};

window.changeCategory = function () {
  applyFilters();
};

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

  gameTitle.textContent = name || "Untitled Game";

  const category = getCategoryKey(gameObj);
  let targetUrl = getBookUrl(category, filePath);
  activeGameFile = targetUrl;

  const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

  try {
    const response = await fetch(targetUrl + "?t=" + Date.now());
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    let htmlContent = await response.text();

    if (htmlContent.includes("<head>")) {
      htmlContent = htmlContent.replace(
        "<head>",
        `<head><base href="${baseUrl}">`,
      );
    } else {
      htmlContent = `<base href="${baseUrl}">` + htmlContent;
    }

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
  loadAllGames();
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
  const togglePastUpdatesBtn = document.getElementById(
    "toggle-past-updates-btn",
  );
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

  if (togglePastUpdatesBtn) {
    togglePastUpdatesBtn.addEventListener("click", () => {
      const pastList = document.getElementById("past-updates-list");
      if (!pastList) return;
      const isNowHidden = pastList.classList.toggle("hidden");
      togglePastUpdatesBtn.textContent = isNowHidden
        ? "Show past updates"
        : "Hide past updates";
    });
  }

  loadChangelog();

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
      openInAboutBlank();
    });
  }

  if (cloakGameBtn) {
    cloakGameBtn.addEventListener("click", () => {
      if (activeGameFile) {
        window.open(activeGameFile, "_blank");
      }
    });
  }

  if (
    window.self === window.top &&
    localStorage.getItem("autoCloakEnabled") === "true"
  ) {
    setTimeout(() => {
      openInAboutBlank();
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

let isScrolling = false;
window.addEventListener("scroll", () => {
  if (isScrolling) return;

  isScrolling = true;
  requestAnimationFrame(() => {
    const scrollPosition = Math.ceil(window.innerHeight + window.scrollY);
    const threshold = document.body.offsetHeight - 500;

    const totalMatched = window.currentMatchedGames
      ? window.currentMatchedGames.length
      : 0;

    if (scrollPosition >= threshold && visibleCount < totalMatched) {
      visibleCount += batchSize;
      applyFilters();
    }
    isScrolling = false;
  });
});
