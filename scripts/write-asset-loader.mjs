import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const loader = `(() => {
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
      node.textContent = window.__nitroLoaderDebugLog.slice(-10).join("\\n");
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
    const normalized = path.replace(/^\\.\\//, "");
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
})();`;

const clientModePath = resolve('public', 'configuration', 'client-mode.json');
let bootstrapApiBase = '';

if(existsSync(clientModePath))
{
    try
    {
        const clientMode = JSON.parse(readFileSync(clientModePath, 'utf8'));

        if(typeof clientMode.apiBaseUrl === 'string') bootstrapApiBase = clientMode.apiBaseUrl;
    }
    catch {}
}

const bootstrap = `(() => {
  const API_BASE = ${ JSON.stringify(bootstrapApiBase) };

  const getBase = () => {
    const source = document.currentScript?.src || location.href;
    return new URL(".", source);
  };

  const withCacheBust = (url) => {
    url.searchParams.set("v", Date.now().toString(36));
    return url;
  };

  const bytesToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for(let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const hexValue = (code) => {
    if(code >= 48 && code <= 57) return code - 48;
    if(code >= 65 && code <= 70) return code - 55;
    if(code >= 97 && code <= 102) return code - 87;
    return -1;
  };

  const hexToBytes = (hex) => {
    const normalized = hex.trim();
    if((normalized.length % 2) !== 0) throw new Error("Invalid encrypted hex payload.");
    const bytes = new Uint8Array(normalized.length / 2);
    for(let i = 0; i < bytes.length; i++) {
      const high = hexValue(normalized.charCodeAt(i * 2));
      const low = hexValue(normalized.charCodeAt((i * 2) + 1));
      if(high < 0 || low < 0) throw new Error("Invalid encrypted hex payload.");
      bytes[i] = (high << 4) | low;
    }
    return bytes;
  };

  const deriveAesKey = async (privateKey, serverKeyBase64) => {
    const serverBytes = Uint8Array.from(atob(serverKeyBase64), char => char.charCodeAt(0));
    const serverKey = await crypto.subtle.importKey("spki", serverBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: serverKey }, privateKey, 256);
    const salt = new TextEncoder().encode("nitro-secure-assets-v1");
    const material = new Uint8Array(secret.byteLength + salt.length);
    material.set(new Uint8Array(secret), 0);
    material.set(salt, secret.byteLength);
    const hash = await crypto.subtle.digest("SHA-256", material);
    return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
  };

  const decryptPayload = async (key, response) => {
    if(response.headers.get("X-Nitro-Sec") !== "1") return response.text();
    const bytes = hexToBytes(await response.text());
    if(bytes.length < 13) throw new Error("Encrypted response is too short.");
    const iv = bytes.slice(0, 12);
    const payload = bytes.slice(12);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, payload);
    return new TextDecoder().decode(clear);
  };

  const importTextModule = async (sourceText) => {
    const blobUrl = URL.createObjectURL(new Blob([sourceText], { type: "text/javascript" }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const loadPlainBootstrap = async () => {
    const url = withCacheBust(new URL("./asset-loader.js", getBase()));
    await import(url.href);
  };

  const loadSecureBootstrap = async () => {
    if(!API_BASE) throw new Error("Missing apiBaseUrl for secure bootstrap.");

    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", pair.publicKey);
    const publicKey = bytesToBase64(publicKeyBuffer);
    const base = API_BASE.replace(/\\/$/, "");
    const bootstrapResponse = await fetch(base + "/nitro-sec/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: publicKey })
    });

    if(!bootstrapResponse.ok) throw new Error("Secure bootstrap failed: HTTP " + bootstrapResponse.status);

    const bootstrapPayload = await bootstrapResponse.json();
    if(!bootstrapPayload || typeof bootstrapPayload.key !== "string" || !bootstrapPayload.key.length) {
      throw new Error("Secure bootstrap returned an invalid server key.");
    }

    const sessionKey = await deriveAesKey(pair.privateKey, bootstrapPayload.key);

    const fetchSecureConfig = async (file) => {
      const url = new URL(base + "/nitro-sec/file");
      url.searchParams.set("kind", "config");
      url.searchParams.set("file", file);
      url.searchParams.set("v", Date.now().toString(36));

      const response = await fetch(url.toString(), {
        headers: { "X-Nitro-Key": publicKey },
        cache: "no-store"
      });

      if(!response.ok) throw new Error("Failed to load secure config " + file + ": HTTP " + response.status);

      return decryptPayload(sessionKey, response);
    };

    const modeText = await fetchSecureConfig("client-mode.json");
    window.__nitroClientMode = JSON.parse(modeText);

    const loaderText = await fetchSecureConfig("asset-loader.js");
    await importTextModule(loaderText);
  };

  (async () => {
    try {
      await loadSecureBootstrap();
    } catch(error) {
      console.warn("[Nitro] Secure bootstrap fallback:", error?.message || error);
      await loadPlainBootstrap();
    }
  })().catch(error => {
    console.error(error);
    document.body.textContent = "Unable to load client.";
  });
})();`;

const target = resolve('public', 'configuration', 'asset-loader.js');
const bootstrapTarget = resolve('public', 'configuration', 'bootstrap.js');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, loader);
writeFileSync(bootstrapTarget, bootstrap);
