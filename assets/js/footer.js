(() => {
  const FOOTER_BADGE =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2390EE90'/><circle cx='50' cy='50' r='45' fill='none' stroke='%23333' stroke-width='2'/><path d='M 20,50 Q 50,20 80,50' fill='none' stroke='%23333' stroke-width='1.5'/><path d='M 20,50 Q 50,80 80,50' fill='none' stroke='%23333' stroke-width='1.5'/><path d='M 50,20 Q 20,50 50,80' fill='none' stroke='%23333' stroke-width='1.5'/><path d='M 50,20 Q 80,50 50,80' fill='none' stroke='%23333' stroke-width='1.5'/></svg>";

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
