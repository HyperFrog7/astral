let allGames = [];
let activeGameFile = "";

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
        openGame(name, gameLink);
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

function openGame(name, filePath) {
  const gameModal = document.getElementById("game-modal");
  const gameFrame = document.getElementById("game-frame");
  const gameTitle = document.getElementById("game-modal-title");

  if (!gameModal || !gameFrame || !gameTitle) return;

  activeGameFile = filePath;
  gameTitle.textContent = name;
  gameFrame.src = filePath;
  gameModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeGame() {
  const gameModal = document.getElementById("game-modal");
  const gameFrame = document.getElementById("game-frame");

  if (gameModal) gameModal.classList.add("hidden");
  if (gameFrame) gameFrame.src = "";
  document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-select");
  const closeBtn = document.getElementById("close-btn");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const downloadBtn = document.getElementById("download-btn");

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

  loadAllGames();
});

window.addEventListener("keydown", (e) => {
  const gameModal = document.getElementById("game-modal");
  if (
    e.key === "Escape" &&
    gameModal &&
    !gameModal.classList.contains("hidden")
  ) {
    closeGame();
  }
}); //
