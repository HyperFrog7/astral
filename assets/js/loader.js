(function () {
  const CDN_BASE = "https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/";

  async function loadApp(htmlPath, scriptPath, isModule) {
    const appRoot = document.getElementById("app-root");
    if (appRoot) {
      appRoot.innerHTML =
        '<div style="padding: 40px;"><h2>Loading...</h2></div>';
    }

    try {
      const fetchOpts = { cache: "no-store" };

      let htmlResponse = await fetch(
        `${CDN_BASE}${htmlPath}?t=${Date.now()}`,
        fetchOpts,
      );
      if (!htmlResponse.ok) {
        htmlResponse = await fetch(htmlPath, fetchOpts);
      }
      if (!htmlResponse.ok) {
        throw new Error(`Failed to load ${htmlPath} (${htmlResponse.status})`);
      }

      const html = await htmlResponse.text();
      const parsed = new DOMParser().parseFromString(html, "text/html");

      if (appRoot) {
        appRoot.innerHTML = parsed.body.innerHTML;
      }

      if (isModule) {
        const sc = document.createElement("script");
        sc.type = "module";
        sc.src = `${CDN_BASE}${scriptPath}?t=${Date.now()}`;
        document.body.appendChild(sc);
        return;
      }

      let scriptResponse = await fetch(
        `${CDN_BASE}${scriptPath}?t=${Date.now()}`,
        fetchOpts,
      );
      if (!scriptResponse.ok) {
        scriptResponse = await fetch(scriptPath, fetchOpts);
      }
      if (!scriptResponse.ok) {
        throw new Error(
          `Failed to load ${scriptPath} (${scriptResponse.status})`,
        );
      }

      const js = await scriptResponse.text();
      const blob = new Blob([js], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);

      const sc = document.createElement("script");
      sc.src = blobUrl;
      sc.onload = function () {
        URL.revokeObjectURL(blobUrl);
        window.dispatchEvent(new Event("DOMContentLoaded"));
        document.dispatchEvent(new Event("DOMContentLoaded"));
      };
      document.body.appendChild(sc);
    } catch (error) {
      console.error("Error loading app:", error);
      if (appRoot) {
        appRoot.innerHTML =
          '<div style="padding: 40px;">' +
          "<h2>Unable to load</h2>" +
          "<p>Please refresh the page.</p>" +
          "</div>";
      }
    }
  }

  function loadBooks() {
    loadApp("assets/payloads/singlefile.html", "assets/js/script.js", false);
  }

  function loadChat() {
    loadApp("assets/payloads/chat-app.html", "assets/js/chat.js", true);
  }

  function initPicker() {
    const booksBtn = document.getElementById("pick-books-btn");
    const chatBtn = document.getElementById("pick-chat-btn");

    if (!booksBtn && !chatBtn) {
      // No picker UI on this page (e.g. study.svg) - preserve old
      // behavior and load the games app directly.
      loadBooks();
      return;
    }

    if (booksBtn) booksBtn.addEventListener("click", loadBooks);
    if (chatBtn) chatBtn.addEventListener("click", loadChat);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPicker, {
      once: true,
    });
  } else {
    initPicker();
  }
})();
