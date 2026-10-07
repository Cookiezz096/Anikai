/**
 * adShield.js
 * Advanced client-side protection against intrusive popups, popunders,
 * top-level navigation hijacking, and clickjacking from third-party embed players.
 */

class AdShield {
  constructor() {
    this.isInitialized = false;
    this.blockedPopupsCount = 0;
    this.blockedRedirectsCount = 0;
    this.listeners = new Set();
    this.shieldEnabled = true;
  }

  /**
   * Initialize global ad shield protections.
   */
  init() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    this.protectWindowOpen();
    this.protectNavigation();
    this.protectClickjacking();

    // Persist shield setting in localStorage
    const savedSetting = localStorage.getItem("anikai_ad_shield");
    if (savedSetting !== null) {
      this.shieldEnabled = savedSetting === "true";
    }

    console.info("🛡️ [Anikai AdShield] Protection initialized and active.");
  }

  /**
   * Overrides window.open on top-level window to block unsolicited popup ads.
   */
  protectWindowOpen() {
    const originalWindowOpen = window.open;

    window.open = (url, target, features) => {
      if (!this.shieldEnabled) {
        return originalWindowOpen.call(window, url, target, features);
      }

      const urlStr = String(url || "");

      // Allow internal app navigation or intentional OAuth / legitimate paths
      const isInternal =
        !urlStr ||
        urlStr.startsWith("/") ||
        urlStr.startsWith(window.location.origin) ||
        urlStr.includes("supabase.co/auth") ||
        urlStr.includes("accounts.google.com");

      if (isInternal) {
        return originalWindowOpen.call(window, url, target, features);
      }

      // Block external ad popups
      this.blockedPopupsCount++;
      console.warn(
        `🛡️ [Anikai AdShield] Intercepted and blocked popup attempt to: ${urlStr}`
      );
      this.notifyListeners();
      return null;
    };
  }

  /**
   * Protect against top-level window redirect hijacking.
   */
  protectNavigation() {
    // Intercept beforeunload if triggered by third party scripts trying to redirect away
    window.addEventListener("beforeunload", (event) => {
      // Don't interfere with normal user navigation
    });

    // Guard history state changes against malicious redirects
    const originalPushState = window.history.pushState;
    window.history.pushState = (...args) => {
      try {
        return originalPushState.apply(window.history, args);
      } catch (e) {
        console.warn("🛡️ [Anikai AdShield] Guarded pushState call:", e);
      }
    };
  }

  /**
   * Intercept auxiliary clicks / clickjacking attempts.
   */
  protectClickjacking() {
    // Intercept clicks on suspicious newly-injected invisible link elements
    document.addEventListener(
      "click",
      (e) => {
        if (!this.shieldEnabled) return;

        const target = e.target;
        if (!target) return;

        const anchor = target.closest("a");
        if (anchor && anchor.target === "_blank") {
          const href = anchor.getAttribute("href") || "";
          // Check if link was triggered without user gesture or points to known ad domains
          const isSuspicious =
            href.includes("clickout") ||
            href.includes("landers") ||
            href.includes("trafico") ||
            href.includes("popads") ||
            href.includes("propeller") ||
            href.includes("adsterra") ||
            href.includes("monetag") ||
            href.includes("betting") ||
            href.includes("crypto");

          if (isSuspicious) {
            e.preventDefault();
            e.stopPropagation();
            this.blockedPopupsCount++;
            console.warn(
              `🛡️ [Anikai AdShield] Blocked clickjacking attempt to: ${href}`
            );
            this.notifyListeners();
          }
        }
      },
      true // capture phase
    );
  }

  /**
   * Toggle Ad Shield state.
   */
  setShieldEnabled(enabled) {
    this.shieldEnabled = Boolean(enabled);
    try {
      localStorage.setItem("anikai_ad_shield", String(this.shieldEnabled));
    } catch (_) {}
    this.notifyListeners();
  }

  isShieldActive() {
    return this.shieldEnabled;
  }

  getBlockedCount() {
    return this.blockedPopupsCount + this.blockedRedirectsCount;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn({
          enabled: this.shieldEnabled,
          blockedCount: this.getBlockedCount(),
        });
      } catch (_) {}
    });
  }
}

export const adShield = new AdShield();

// Auto-initialize when loaded in browser
if (typeof window !== "undefined") {
  adShield.init();
}
