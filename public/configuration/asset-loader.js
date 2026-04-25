(() => {
  const ASSET_KEY = new TextEncoder().encode("slogga-dist-assets-2026");
  const MODE_DEFAULTS = {
    distObfuscationEnabled: true,
    secureAssetsEnabled: true,
    secureApiEnabled: true
  };

  const isDebug = () => {
    try {
      const search = new URLSearchParams(location.search);
      return search.get("loaderDebug") === "1" || localStorage.getItem("nitro.loader.debug") === "1";
    } catch {
      return false;
    }
  };

  const debug = (message) => {
    try {
      window.__nitroLoaderDebug = message;
      const log = Array.isArray(window.__nitroLoaderDebugLog) ? window.__nitroLoaderDebugLog : [];
      log.push(message);
      window.__nitroLoaderDebugLog = log.slice(-30);
      if(!isDebug()) {
        document.getElementById("nitro-loader-debug")?.remove();
        return;
      }
      let node = document.getElementById("nitro-loader-debug");
      if(!node) {
        node = document.createElement("div");
        node.id = "nitro-loader-debug";
        node.style.cssText = "position:fixed;left:8px;top:8px;z-index:2147483647;padding:6px 8px;max-width:70vw;background:rgba(0,0,0,.85);color:#fff;font:12px monospace;white-space:pre-wrap";
        document.body.appendChild(node);
      }
      node.textContent = window.__nitroLoaderDebugLog.slice(-10).join("\n");
    } catch {}
  };

  const getBase = () => {
    const source = document.currentScript?.src || location.href;
    return new URL(".", source);
  };

  const withCacheBust = (url) => {
    url.searchParams.set("v", Date.now().toString(36));
    return url;
  };

  const renderShell = () => {
    const root = document.getElementById("root");
    if(!root || root.firstChild) return;
    root.innerHTML = '<div style="position:fixed;inset:0;background:linear-gradient(180deg,#6eadc8 0%,#78b7cf 45%,#8ec4d7 100%);overflow:hidden;z-index:1"><div style="position:absolute;left:0;top:0;width:220px;height:220px;background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,0));clip-path:polygon(0 0,100% 0,0 100%)"></div><div style="position:absolute;right:0;bottom:0;width:32vw;max-width:420px;height:100%;background:linear-gradient(270deg,rgba(255,255,255,.16),rgba(255,255,255,0))"></div><div style="position:absolute;top:50%;right:8vw;transform:translateY(-50%);display:flex;flex-direction:column;gap:18px;width:260px"><div style="height:86px;background:#a2bfd1;border:2px solid #3f6a85;border-radius:8px;box-shadow:inset 0 2px rgba(255,255,255,.35),0 4px 6px rgba(0,0,0,.25)"></div><div style="height:190px;background:#a2bfd1;border:2px solid #3f6a85;border-radius:8px;box-shadow:inset 0 2px rgba(255,255,255,.35),0 4px 6px rgba(0,0,0,.25)"></div></div></div>';
  };

  const decodeAsset = (bytes) => {
    const output = new Uint8Array(bytes.length);
    for(let index = 0; index < bytes.length; index++) {
      output[index] = bytes[index] ^ ASSET_KEY[index % ASSET_KEY.length] ^ ((index * 31) & 255);
    }
    return output;
  };

  const gunzip = async (bytes) => {
    if(!("DecompressionStream" in self)) throw new Error("gzip decompression unsupported");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };

  const resolveAssetCandidates = (path) => {
    const base = getBase();
    const normalized = path.replace(/^\.\//, "");
    const file = normalized.split("/").pop();
    const urls = [
      new URL("./src/assets/" + file, base),
      new URL("./assets/" + file, base),
      new URL("/src/assets/" + file, base.origin),
      new URL("/assets/" + file, base.origin),
      new URL("/client/src/assets/" + file, base.origin),
      new URL("/client/assets/" + file, base.origin)
    ];
    return [...new Map(urls.map(url => [url.href, url])).values()];
  };

  const fetchBytes = async (path) => {
    let error = null;
    debug("loader: fetching " + path);
    for(const candidate of resolveAssetCandidates(path)) {
      try {
        debug("loader: try " + candidate.href);
        const response = await fetch(withCacheBust(candidate), { cache: "no-store" });
        if(!response.ok) {
          error = new Error("asset " + candidate.pathname + " " + response.status);
          continue;
        }
        debug("loader: ok " + candidate.href);
        return new Uint8Array(await response.arrayBuffer());
      } catch(caught) {
        error = caught;
      }
    }
    throw error || new Error("asset " + path + " not found");
  };

  const loadDatAsset = async (path) => gunzip(decodeAsset(await fetchBytes(path)));

  const injectCssText = (bytes) => {
    const node = document.createElement("style");
    node.textContent = new TextDecoder().decode(bytes);
    document.head.appendChild(node);
    debug("loader: css injected from dat");
  };

  const loadPlainCss = async (path) => {
    const href = resolveAssetCandidates(path)[0];
    href.searchParams.set("v", Date.now().toString(36));
    await new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href.href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("plain css failed"));
      document.head.appendChild(link);
    });
    debug("loader: css linked");
  };

  const importBytes = async (bytes) => {
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
    try {
      debug("loader: importing app blob");
      await import(blobUrl);
      debug("loader: app blob imported");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const importPlainJs = async (path) => {
    const href = resolveAssetCandidates(path)[0];
    href.searchParams.set("v", Date.now().toString(36));
    debug("loader: importing plain js");
    await import(href.href);
    debug("loader: plain js imported");
  };

  const readClientMode = async () => {
    try {
      if(window.__nitroClientMode && typeof window.__nitroClientMode === "object") {
        debug("loader: client-mode preset");
        return window.__nitroClientMode;
      }
      const url = withCacheBust(new URL("./client-mode.json", getBase()));
      const response = await fetch(url, { cache: "no-store" });
      if(!response.ok) throw new Error("client-mode " + response.status);
      const payload = await response.json();
      const mode = { ...MODE_DEFAULTS, ...(payload && typeof payload === "object" ? payload : {}) };
      window.__nitroClientMode = mode;
      debug("loader: client-mode loaded");
      return mode;
    } catch(error) {
      window.__nitroClientMode = { ...MODE_DEFAULTS };
      debug("loader: client-mode fallback " + (error?.message || error));
      return window.__nitroClientMode;
    }
  };

  (async () => {
    debug("loader: start");
    renderShell();
    const mode = await readClientMode();
    if(mode.distObfuscationEnabled) {
      const [cssBytes, jsBytes] = await Promise.all([
        loadDatAsset("./assets/app.css.dat"),
        loadDatAsset("./assets/app.js.dat")
      ]);
      injectCssText(cssBytes);
      await importBytes(jsBytes);
      return;
    }
    await loadPlainCss("./assets/app.css");
    await importPlainJs("./assets/app.js");
  })().catch(error => {
    console.error(error);
    debug("loader: failed " + (error?.message || error));
    document.body.textContent = "Unable to load client.";
  });
})();