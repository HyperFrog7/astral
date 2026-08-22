(function () {
  const CDN_BASE = "https://cdn.jsdelivr.net/gh/hyperfrog7/Astral@main/";

  async function boot() {
    try {
      const fetchOpts = { cache: "no-store" };

      let htmlResponse = await fetch(
        `${CDN_BASE}assets/payloads/singlefile.html?t=${Date.now()}`,
        fetchOpts,
      );
      if (!htmlResponse.ok) {
        htmlResponse = await fetch(
          "assets/payloads/singlefile.html",
          fetchOpts,
        );
      }
      if (!htmlResponse.ok) {
        throw new Error(
          `Failed to load singlefile.html (${htmlResponse.status})`,
        );
      }

      const html = await htmlResponse.text();
      const parsed = new DOMParser().parseFromString(html, "text/html");

      const appRoot = document.getElementById("app-root");
      if (appRoot) {
        appRoot.innerHTML = parsed.body.innerHTML;
      }

      let scriptResponse = await fetch(
        `${CDN_BASE}assets/js/script.js?t=${Date.now()}`,
        fetchOpts,
      );
      if (!scriptResponse.ok) {
        scriptResponse = await fetch("assets/js/script.js", fetchOpts);
      }
      if (!scriptResponse.ok) {
        throw new Error(`Failed to load script.js (${scriptResponse.status})`);
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
      console.error("Error loading Astral:", error);
      const appRoot = document.getElementById("app-root");
      if (appRoot) {
        appRoot.innerHTML =
          '<div style="padding: 40px;">' +
          "<h2>Unable to load resources</h2>" +
          "<p>Please refresh the page.</p>" +
          "</div>";
      }
    }
  }

  boot();
})();
