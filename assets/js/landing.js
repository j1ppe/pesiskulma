/**
 * Landing page interactivity
 * Handles mobile phone click navigation
 */
(() => {
  // Click handlers for mobile phones
  document
    .querySelectorAll(".hero-landing__mobile")
    .forEach((mobileElement) => {
      const targetPage = mobileElement.getAttribute("data-page");
      if (!targetPage) return;

      // Click handler
      mobileElement.addEventListener("click", () => {
        window.location.href = targetPage;
      });

      // Keyboard accessibility (Enter / Space)
      mobileElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.location.href = targetPage;
        }
      });
    });
})();
