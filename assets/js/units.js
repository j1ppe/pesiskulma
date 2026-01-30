/**
 * Measurement Unit System
 * Handles conversion between metric and imperial units
 */

class UnitSystem {
  constructor() {
    this.currentUnit = this.loadUnit();
    // Don't call setupToggle here - will be called when DOM is ready
  }

  /**
   * Load saved unit preference from localStorage
   * @returns {string} 'metric' or 'imperial'
   */
  loadUnit() {
    const saved = localStorage.getItem("measurementUnit");
    return saved === "imperial" ? "imperial" : "metric";
  }

  /**
   * Save unit preference to localStorage
   * @param {string} unit - 'metric' or 'imperial'
   */
  saveUnit(unit) {
    localStorage.setItem("measurementUnit", unit);
    this.currentUnit = unit;
  }

  /**
   * Toggle between metric and imperial
   */
  toggleUnit() {
    const newUnit = this.currentUnit === "metric" ? "imperial" : "metric";
    this.saveUnit(newUnit);
    this.updateToggleButton();
    console.log("Unit changed to:", newUnit);
    // Dispatch custom event for other modules to listen
    window.dispatchEvent(
      new CustomEvent("unitChanged", { detail: { unit: newUnit } }),
    );
    console.log("unitChanged event dispatched");
  }

  /**
   * Update toggle button appearance
   */
  updateToggleButton() {
    const toggleButton = document.getElementById("unitToggle");
    if (toggleButton) {
      const iconSpan = toggleButton.querySelector(".unit-icon");
      if (iconSpan) {
        // Use ruler icon + unit abbreviation, matching language toggle style
        const icon = '<span class="unit-icon-symbol">📐</span>';
        const unit = this.currentUnit === "metric" ? "m" : "ft";
        iconSpan.innerHTML = `${icon} ${unit}`;
      }
    }
  }

  /**
   * Setup toggle button click handler
   */
  setupToggle() {
    const toggleButton = document.getElementById("unitToggle");
    if (toggleButton) {
      toggleButton.addEventListener("click", () => this.toggleUnit());
      this.updateToggleButton();
    }
  }

  /**
   * Convert centimeters to inches
   * @param {number} cm - Value in centimeters
   * @returns {number} Value in inches
   */
  cmToInches(cm) {
    return cm * 0.393701;
  }

  /**
   * Convert meters to feet
   * @param {number} meters - Value in meters
   * @returns {number} Value in feet
   */
  metersToFeet(meters) {
    return meters * 3.28084;
  }

  /**
   * Convert centimeters to feet and inches
   * @param {number} cm - Value in centimeters
   * @returns {object} {feet: number, inches: number}
   */
  cmToFeetAndInches(cm) {
    const totalInches = this.cmToInches(cm);
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  }

  /**
   * Format centimeters for display
   * @param {number} cm - Value in centimeters
   * @param {boolean} includeUnit - Whether to include unit symbol
   * @returns {string} Formatted string
   */
  formatCm(cm, includeUnit = true) {
    if (this.currentUnit === "imperial") {
      const inches = this.cmToInches(cm);
      return includeUnit ? `${inches.toFixed(1)}"` : inches.toFixed(1);
    }
    return includeUnit ? `${cm.toFixed(1)} cm` : cm.toFixed(1);
  }

  /**
   * Format meters for display
   * @param {number} meters - Value in meters
   * @param {boolean} includeUnit - Whether to include unit symbol
   * @returns {string} Formatted string
   */
  formatMeters(meters, includeUnit = true) {
    if (this.currentUnit === "imperial") {
      const feet = this.metersToFeet(meters);
      return includeUnit ? `${feet.toFixed(1)} ft` : feet.toFixed(1);
    }
    return includeUnit ? `${meters.toFixed(2)} m` : meters.toFixed(2);
  }

  /**
   * Format centimeters as feet and inches (e.g., "5 ft 6 in")
   * @param {number} cm - Value in centimeters
   * @returns {string} Formatted string
   */
  formatFeetInches(cm) {
    if (this.currentUnit === "metric") {
      return `${cm.toFixed(1)} cm`;
    }
    const { feet, inches } = this.cmToFeetAndInches(cm);
    if (feet === 0) {
      return `${inches}"`;
    }
    if (inches === 0) {
      return `${feet} ft`;
    }
    return `${feet} ft ${inches}"`;
  }

  /**
   * Get current unit system
   * @returns {string} 'metric' or 'imperial'
   */
  getCurrentUnit() {
    return this.currentUnit;
  }

  /**
   * Check if current unit is metric
   * @returns {boolean}
   */
  isMetric() {
    return this.currentUnit === "metric";
  }

  /**
   * Check if current unit is imperial
   * @returns {boolean}
   */
  isImperial() {
    return this.currentUnit === "imperial";
  }
}

// Create global instance
window.unitSystem = new UnitSystem();

// Setup toggle button when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.unitSystem.setupToggle();
  });
} else {
  // DOM already loaded
  window.unitSystem.setupToggle();
}
