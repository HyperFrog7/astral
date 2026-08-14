let allGames = [];
let activeGameFile = "";

const cloakPresets = {
  default: {
    title: "Astral",
    icon: "logo.svg",
  },
  google: {
    title: "Google",
    icon: "images/google.png",
  },
  drive: {
    title: "My Drive - Google Drive",
    icon: "images/drive.png",
  },
  classroom: {
    title: "Classes",
    icon: "images/classroom.png",
  },
  clever: {
    title: "Clever | Portal",
    icon: "images/clever.png",
  },
  grades: {
    title: "Grades",
    icon: "images/grades.png",
  },
  newtab: {
    title: "New Tab",
    icon: "educational site",
  },
};

let currentCloak = cloakPresets.default;

window.openSettings = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.remove("hidden");
};

window.closeSettings = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.add("hidden");
};

function openInAboutBlank(url) {
  const targetUrl = url || window.location.href;

  const win = window.open("about:blank", "_blank");
  if (!win) {
    alert("Please allow popups for tab cloaking to work sonion.");
    return;
  }

  const doc = win.document;

  doc.title = currentCloak.title;

  const link = doc.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = currentCloak.icon;
  doc.head.appendChild(link);

  const iframe = doc.createElement("iframe");
  iframe.src = targetUrl;

  doc.body.style.margin = "0";
  doc.body.style.padding = "0";
  doc.body.style.overflow = "hidden";
  doc.body.style.backgroundColor = "#000";

  iframe.style.width = "100vw";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  iframe.style.outline = "none";

  doc.body.appendChild(iframe);
  const redirectUrl =
    localStorage.getItem("panicRedirectUrl") || "https://www.google.com";
  window.location.replace(redirectUrl);
}

function loadPanicUrlSetting() {
  const input = document.getElementById("panic-url-input");
  if (!input) return;

  const savedUrl = localStorage.getItem("panicRedirectUrl") || "";
  input.value = savedUrl;
}

function savePanicUrlSetting() {
  const input = document.getElementById("panic-url-input");
  if (!input) return;

  let url = input.value.trim();

  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
    input.value = url;
  }

  if (url) {
    localStorage.setItem("panicRedirectUrl", url);
  } else {
    localStorage.removeItem("panicRedirectUrl");
  }
}

function getCategoryKey(game) {
  const filePath = game.file || game.url || "";
  if (filePath.indexOf("games/gn-math/") !== -1) return "GN-Math";
  if (filePath.indexOf("games/ugs/") !== -1) return "UGS";
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

  categorySelect.innerHTML = `
    <option value="all">All (${allGames.length})</option>
    <option value="astral">Astral (${astralCount})</option>
    <option value="gn-math">GN-Math (${gnMathCount})</option>
    <option value="ugs">UGS (${ugsCount})</option>
  `;
}

function renderCategorizedGames(gamesList) {
  const container = document.getElementById("game-grid");
  if (!container) return;

  container.innerHTML = "";

  if (!gamesList || gamesList.length === 0) {
    container.innerHTML = '<div class="no-results">No games found</div>';
    return;
  }

  const grouped = groupGamesByCategory(gamesList);

  Object.keys(grouped).forEach((categoryName) => {
    const gamesInCat = grouped[categoryName];
    if (!gamesInCat || gamesInCat.length === 0) return;

    const section = document.createElement("div");
    section.className = "category-section";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
      <span>${categoryName} (${gamesInCat.length})</span>
      <span class="toggle-icon">−</span>
    `;

    const grid = document.createElement("div");
    grid.className = "category-grid";

    header.addEventListener("click", () => {
      const isCollapsed = grid.classList.toggle("collapsed");
      const icon = header.querySelector(".toggle-icon");
      if (icon) {
        icon.textContent = isCollapsed ? "+" : "−";
      }
    });

    gamesInCat.forEach((game) => {
      const name = game.name || game.title || "Untitled Game";
      let imageSrc = game.icon || game.cover || "";
      const gameLink = game.file || game.url || "#";

      if (imageSrc.indexOf("/") === 0) {
        imageSrc = imageSrc.substring(1);
      }

      const card = document.createElement("a");
      card.className = "game-card";
      card.href = "#";

      card.innerHTML = `
        <img
          src="${imageSrc}"
          alt="${name}"
          class="game-icon"
          loading="lazy"
          onerror="this.style.display='none';"
        />
        <h3 class="game-title">${name}</h3>
      `;

      card.addEventListener("click", (e) => {
        e.preventDefault();
        openGame(game);
      });

      grid.appendChild(card);
    });

    section.appendChild(header);
    section.appendChild(grid);
    container.appendChild(section);
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
          filePath.indexOf("games/gn-math/") === -1 &&
          filePath.indexOf("games/ugs/") === -1;
      } else {
        const targetPath = "games/" + selectedCategory + "/";
        matchesCategory =
          filePath.indexOf(targetPath) !== -1 || category === selectedCategory;
      }
    }

    return matchesSearch && matchesCategory;
  });

  renderCategorizedGames(matched);
}

window.searchGames = function () {
  applyFilters();
};

window.changeCategory = function () {
  applyFilters();
};

async function loadAllGames() {
  try {
    const astralResponse = await fetch("games/astral.json");
    const astralGames = await astralResponse.json();

    const gnMathResponse = await fetch("games/gn-math/gn-math.json");
    const gnMathGames = await gnMathResponse.json();

    const ugsResponse = await fetch("games/ugs/ugs.json");
    const ugsGames = await ugsResponse.json();

    allGames = [...astralGames, ...gnMathGames, ...ugsGames];

    updateCategoryDropdown();
    renderCategorizedGames(allGames);
  } catch (error) {
    console.error("Error loading games:", error);
  }
}

function openGame(gameParam, fallbackPath) {
  const gameModal = document.getElementById("game-modal");
  const gameFrame = document.getElementById("game-frame");
  const gameTitle = document.getElementById("game-modal-title");

  if (!gameModal || !gameFrame || !gameTitle) return;

  const name =
    typeof gameParam === "object"
      ? gameParam.name || gameParam.title
      : gameParam;
  let filePath =
    typeof gameParam === "object"
      ? gameParam.file || gameParam.url
      : fallbackPath;

  if (!filePath) return;

  activeGameFile = filePath;
  gameTitle.textContent = name || "Untitled Game";

  if (window.location.protocol === "file:" && !filePath.startsWith("http")) {
    if (
      typeof gameParam === "object" &&
      gameParam.id &&
      filePath.includes("gn-math") &&
      !filePath.endsWith(".html")
    ) {
      filePath = `https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/games/gn-math/assets/${gameParam.id}/index.html`;
    } else {
      filePath =
        "https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/" + filePath;
    }
  }

  gameFrame.src = filePath;

  gameModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeGame() {
  const gameModal = document.getElementById("game-modal");
  const gameFrame = document.getElementById("game-frame");

  if (gameModal) gameModal.classList.add("hidden");
  if (gameFrame) {
    if (gameFrame.dataset.blobUrl) {
      URL.revokeObjectURL(gameFrame.dataset.blobUrl);
      delete gameFrame.dataset.blobUrl;
    }
    gameFrame.src = "about:blank";
  }

  document.body.style.overflow = "";
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

  const saveBtn = document.getElementById("save-panic-url-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", savePanicUrlSetting);
  }

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

  if (settingsIcon) {
    settingsIcon.addEventListener("click", window.openSettings);
  }

  if (cloakPresetSelect) {
    cloakPresetSelect.value = savedCloak;
    cloakPresetSelect.addEventListener("change", (e) => {
      setTabCloak(e.target.value);
    });
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (categorySelect) categorySelect.addEventListener("change", applyFilters);
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

  loadAllGames();
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
