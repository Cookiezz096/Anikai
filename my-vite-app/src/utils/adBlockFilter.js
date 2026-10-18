/**
 * adBlockFilter.js
 *
 * Client-side ad-domain filter for the streaming player layout.
 *
 * Layers of protection (all operate within the same-origin window only —
 * the sandboxed iframe itself cannot be inspected):
 *
 *  1. DOMAIN BLOCKLIST  — curated list of known ad/tracker/popup domains.
 *  2. NETWORK INTERCEPT — overrides fetch + XMLHttpRequest to null-route any
 *                         request whose host matches the blocklist.
 *  3. DOM GUARDIAN      — MutationObserver watches a target container for
 *                         dynamically injected <script>, <iframe>, and <a>
 *                         elements pointing to blocked domains and removes them.
 *  4. SCRIPT INJECTION  — overrides document.createElement so ad networks
 *                         cannot silently append foreign scripts.
 *
 * Usage:
 *   import { adBlockFilter } from './adBlockFilter';
 *   adBlockFilter.init();                          // once, at app startup
 *   const stop = adBlockFilter.guardContainer(ref.current);  // per-player
 *   stop();                                        // cleanup on unmount
 */

// ─── Blocked domain patterns ─────────────────────────────────────────────────
// Matches hostname substrings. Keep sorted alphabetically for easy maintenance.
export const BLOCKED_DOMAINS = [
  // Ad networks & exchanges
  "adskeeper.com",
  "adsterra.com",
  "adtrafficquality.google",
  "advertiserurl.com",
  "aff.biz",
  "affault.com",
  "affiliatefuture.com",
  "afftrack.com",
  "amazon-adsystem.com",
  "at.atwola.com",
  "atdmt.com",

  // Popunder / popup farms
  "clickadu.com",
  "clickaine.com",
  "clickout.com",
  "clksite.com",
  "contentabc.com",
  "cpx.to",

  // Trackers
  "doubleclick.net",
  "ds.serving-sys.com",

  // Crypto / betting redirectors
  "exoclick.com",
  "exoclicks.com",

  // Fingerprinters
  "fingerprintjs.com",
  "fout.jp",

  // Ad brokers
  "ga-mobile.ru",
  "go.biz",
  "growthpulsemedia.com",

  // Hit counters / tracking pixels
  "hb.adtera.com",
  "hitcpm.com",
  "hotmart.com",

  // In-video ad injectors
  "imasdk.googleapis.com",

  // Junk pop-traffic
  "juicyads.com",
  "justpremium.com",

  // Known popup/popunder networks
  "kinetic.com",

  // Link shorteners used by ad farms
  "landers.com",

  // Monetization layers
  "mgid.com",
  "monetag.com",
  "moonicorn.com",
  "mopub.com",

  // Native ad injectors
  "nativo.com",
  "nend.net",

  // Ad overlay / outstream
  "openx.com",
  "outbrain.com",

  // Pop-under networks
  "popad.co",
  "popadvert.com",
  "popads.net",
  "popunder.ru",
  "popundermedia.com",
  "propellerads.com",
  "pub.network",

  // Redirect/cloaking layers
  "redirect.ru",
  "revcontent.com",
  "rnetwork.co",
  "rtmark.net",

  // Session hijackers
  "s.innovid.com",
  "searchadvertising.com",
  "smartadserver.com",
  "smartclip.net",
  "ssp.mediavine.com",

  // Taboola / native spam
  "taboola.com",
  "tpc.googlesyndication.com",
  "trafico.to",
  "trafficfactory.biz",
  "trafficjunky.net",
  "traffshop.net",

  // Video ad SDKs
  "unrulymedia.com",
  "video.unruly.co",
  "videoadex.com",
  "vidoomy.com",

  // General spamvertising
  "wowtrk.com",
  "yads.zedo.com",
  "yieldmanager.com",
  "zedo.com",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the given URL string's hostname matches any blocked domain.
 * Accepts full URLs, protocol-relative URLs (//) and bare hostnames.
 */
export function isBlockedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    let url = rawUrl.trim();
    if (url.startsWith("//")) url = "https:" + url;
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    // Bare domain or relative path — check substring
    const lower = rawUrl.toLowerCase();
    return BLOCKED_DOMAINS.some((d) => lower.includes(d));
  }
}

// ─── Core class ──────────────────────────────────────────────────────────────

class AdBlockFilter {
  constructor() {
    this._isInitialized = false;
    this._blockedRequests = 0;
    this._blockedDomNodes = 0;
    this._listeners = new Set();
    this._originalFetch = null;
    this._originalXhrOpen = null;
    this._originalCreateElement = null;
    this._observers = new WeakMap(); // container -> MutationObserver
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** One-time initialization: patches network APIs and element creation. */
  init() {
    if (this._isInitialized || typeof window === "undefined") return;
    this._isInitialized = true;
    this._patchFetch();
    this._patchXhr();
    this._patchCreateElement();
    console.info("🔒 [AdBlockFilter] Network & DOM filter active.");
  }

  /**
   * Attaches a MutationObserver to a DOM container element, removing any
   * dynamically injected ad scripts, ad iframes, or clickjack anchors.
   *
   * @param {HTMLElement} container - The player wrapper element to monitor.
   * @returns {() => void}          - Cleanup function to disconnect the observer.
   */
  guardContainer(container) {
    if (!container || typeof MutationObserver === "undefined") return () => {};
    if (this._observers.has(container)) {
      this._observers.get(container).disconnect();
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (this._shouldRemoveNode(node)) {
            node.parentNode?.removeChild(node);
            this._blockedDomNodes++;
            this._notify();
            console.warn(
              "[AdBlockFilter] Removed injected ad element:",
              node.nodeName,
              node.src || node.href || ""
            );
          }
        }
      }
    });

    observer.observe(container, { childList: true, subtree: true });
    this._observers.set(container, observer);

    return () => {
      observer.disconnect();
      this._observers.delete(container);
    };
  }

  /** Total number of blocked network requests. */
  get blockedRequests() { return this._blockedRequests; }

  /** Total number of removed DOM ad nodes. */
  get blockedDomNodes() { return this._blockedDomNodes; }

  /** Combined block count for UI display. */
  get totalBlocked() { return this._blockedRequests + this._blockedDomNodes; }

  /**
   * Subscribe to filter events. Listener called with { blockedRequests, blockedDomNodes, total }.
   * @returns {() => void} Unsubscribe function.
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _notify() {
    const payload = {
      blockedRequests: this._blockedRequests,
      blockedDomNodes: this._blockedDomNodes,
      total: this.totalBlocked,
    };
    this._listeners.forEach((fn) => {
      try { fn(payload); } catch (_) {}
    });
  }

  /** Returns true if the element is a known ad-injected node that should be removed. */
  _shouldRemoveNode(el) {
    const tag = el.tagName?.toLowerCase();

    // Block external <script> tags loading from ad domains
    if (tag === "script") {
      const src = el.getAttribute("src") || "";
      return src ? isBlockedUrl(src) : false;
    }

    // Block nested ad <iframe> elements (different from our video player iframe)
    if (tag === "iframe") {
      // Never remove our video player iframe
      if (
        el.classList?.contains("enhanced-video-player") ||
        el.classList?.contains("sp-iframe") ||
        el.classList?.contains("video") ||
        el.hasAttribute("allowfullscreen")
      ) {
        return false;
      }
      const src = el.getAttribute("src") || "";
      return src ? isBlockedUrl(src) : false;
    }

    // Block invisible overlay <a> anchors pointing to ad domains (clickjack traps)
    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      const style = el.style || {};
      const isInvisibleOverlay =
        (style.position === "fixed" || style.position === "absolute") &&
        parseInt(style.zIndex, 10) > 100;
      return href ? isBlockedUrl(href) || isInvisibleOverlay : isInvisibleOverlay;
    }

    return false;
  }

  /** Patches window.fetch to null-route requests to blocked domains. */
  _patchFetch() {
    if (typeof window.fetch !== "function") return;
    this._originalFetch = window.fetch.bind(window);
    const self = this;

    window.fetch = function patchedFetch(resource, options) {
      const url = typeof resource === "string" ? resource : resource?.url || "";
      if (isBlockedUrl(url)) {
        self._blockedRequests++;
        self._notify();
        console.warn("[AdBlockFilter] Blocked fetch ->", url);
        return Promise.resolve(new Response("", { status: 200 }));
      }
      return self._originalFetch(resource, options);
    };
  }

  /** Patches XMLHttpRequest.open to null-route requests to blocked domains. */
  _patchXhr() {
    if (typeof window.XMLHttpRequest === "undefined") return;
    this._originalXhrOpen = XMLHttpRequest.prototype.open;
    const self = this;

    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      if (isBlockedUrl(String(url || ""))) {
        self._blockedRequests++;
        self._notify();
        console.warn("[AdBlockFilter] Blocked XHR ->", url);
        return self._originalXhrOpen.call(this, method, "data:text/plain,", ...rest);
      }
      return self._originalXhrOpen.call(this, method, url, ...rest);
    };
  }

  /**
   * Patches document.createElement so ad SDKs that pre-configure src before
   * appending cannot bypass the DOM guardian.
   */
  _patchCreateElement() {
    if (typeof document?.createElement !== "function") return;
    this._originalCreateElement = document.createElement.bind(document);
    const self = this;

    document.createElement = function patchedCreateElement(tag, options) {
      const el = self._originalCreateElement(tag, options);
      const lower = (tag || "").toLowerCase();

      if (lower === "script") {
        let _src = "";
        const proto = Object.getPrototypeOf(el);
        const descriptor =
          Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src") ||
          Object.getOwnPropertyDescriptor(proto, "src");

        if (descriptor) {
          Object.defineProperty(el, "src", {
            get() { return _src; },
            set(value) {
              _src = value;
              if (isBlockedUrl(value)) {
                self._blockedRequests++;
                self._notify();
                console.warn(`[AdBlockFilter] Blocked <${lower}> src ->`, value);
                descriptor.set?.call(this, "data:text/javascript,");
              } else {
                descriptor.set?.call(this, value);
              }
            },
            configurable: true,
          });
        }
      }

      return el;
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export const adBlockFilter = new AdBlockFilter();

// Auto-initialize in browser context
if (typeof window !== "undefined") {
  adBlockFilter.init();
}
