(() => {
  const FOOTER_BADGE = "assets/images/jippe-logo.png";

  const FOOTER_HTML = `
    <p>
      <img class="footer-badge" alt="PesisKulma-logo" src="${FOOTER_BADGE}" />
      PesisKulma - Designed & Built by JiPPE
    </p>
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
