/**
 * Internationalization (i18n) System
 * Simple localization for static websites
 */

const i18n = {
  currentLanguage: "fi",
  translations: {},

  /**
   * Initialize i18n system
   */
  async init() {
    // Load language from localStorage or use default
    this.currentLanguage = localStorage.getItem("language") || "fi";

    // Load translation file
    await this.loadLanguage(this.currentLanguage);

    // Apply translations to page
    this.applyTranslations();

    // Update language selector UI
    this.updateLanguageSelector();

    // Setup language selector event listeners
    this.setupLanguageSelector();
  },

  /**
   * Load translation JSON file
   */
  async loadLanguage(lang) {
    try {
      const response = await fetch(`./assets/i18n/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
      this.translations = await response.json();
      this.currentLanguage = lang;
      localStorage.setItem("language", lang);
    } catch (error) {
      console.error(`Failed to load language ${lang}:`, error);
      // Fallback to Finnish if loading fails
      if (lang !== "fi") {
        await this.loadLanguage("fi");
      }
    }
  },

  /**
   * Change language
   */
  async changeLanguage(lang) {
    await this.loadLanguage(lang);
    this.applyTranslations();
    this.updateLanguageSelector();

    // Trigger custom event for other scripts to react
    window.dispatchEvent(
      new CustomEvent("languageChanged", { detail: { language: lang } }),
    );
  },

  /**
   * Translate a key
   */
  t(key) {
    const keys = key.split(".");
    let value = this.translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation missing: ${key}`);
        return key;
      }
    }

    return value;
  },

  /**
   * Apply translations to all elements with data-i18n
   */
  applyTranslations() {
    // Translate text content
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      element.textContent = this.t(key);
    });

    // Translate placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      element.placeholder = this.t(key);
    });

    // Translate titles
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.getAttribute("data-i18n-title");
      element.title = this.t(key);
    });

    // Translate aria-labels
    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      const key = element.getAttribute("data-i18n-aria");
      element.setAttribute("aria-label", this.t(key));
    });
  },

  /**
   * Update language selector UI
   */
  updateLanguageSelector() {
    const selector = document.querySelector(".language-selector");
    if (!selector) return;

    const toggle = document.getElementById("languageToggle");

    // Update active language
    selector.querySelectorAll("[data-lang]").forEach((button) => {
      const lang = button.getAttribute("data-lang");
      if (lang === this.currentLanguage) {
        button.classList.add("active");

        // Update toggle to show current language code
        if (toggle) {
          toggle.innerHTML = `<span class="globe-icon">🌐</span><span class="lang-code">${lang.toUpperCase()}</span>`;
        }
      } else {
        button.classList.remove("active");
      }
    });
  },

  /**
   * Setup language selector event listeners
   */
  setupLanguageSelector() {
    const toggle = document.getElementById("languageToggle");
    const dropdown = document.getElementById("languageDropdown");

    if (!toggle || !dropdown) return;

    // Toggle dropdown on click
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== toggle) {
        dropdown.classList.remove("active");
      }
    });

    // Language selection
    dropdown.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const lang = button.getAttribute("data-lang");
        await this.changeLanguage(lang);
        dropdown.classList.remove("active");
      });
    });
  },
};

// Export for use in other modules
window.i18n = i18n;

// Helper function for translations
window.t = (key) => i18n.t(key);

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => i18n.init());
} else {
  i18n.init();
}
