(() => {
  const FOOTER_BADGE = "assets/images/jippe-logo.png";

  const FOOTER_HTML = `
    <div class="footer-content">
      <p class="footer-main">
        <img class="footer-badge" alt="PesisKulma-logo" src="${FOOTER_BADGE}" />
        <span data-i18n="footer.designedBy">PesisKulma - Designed & Built by JiPPE</span>
      </p>
      <p class="footer-privacy" data-i18n="footer.privacyNotice">This site uses Google Analytics to collect anonymous usage statistics.</p>
    </div>
  `;

  function renderFooter() {
    const targets = document.querySelectorAll("[data-footer]");
    targets.forEach((node) => {
      node.innerHTML = FOOTER_HTML;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderFooter);
  } else {
    renderFooter();
  }
})();
