/**
 * State management module for PesisKenttä application
 * Implements immutable state pattern with centralized state store
 */

/**
 * Field profile configuration type
 * @typedef {Object} FieldProfile
 * @property {string} id - Profile identifier
 * @property {Object} homePlate - Home plate configuration
 * @property {Object} battingSector - Batting sector angles
 * @property {Object} diagonalLines - Diagonal line measurements
 * @property {Object} backBoundary - Back boundary configuration
 * @property {Object} frontArc - Front arc radii
 * @property {Object} homeArcs - Home arc radii
 * @property {Object} firstBaseCanvasOffset - First base positioning
 * @property {Object} secondBaseCanvasOffset - Second base positioning
 * @property {Object} thirdBaseCanvasOffset - Third base positioning
 * @property {number} baseRadius - Base circle radius
 * @property {number} baseLineLength - Base line length
 * @property {number} homePathFirstLine - Home path first segment length
 * @property {number} homePathEndOffset - Home path end offset
 */

/**
 * Editable points for interactive measurements
 * @typedef {Object} EditablePoints
 * @property {Point|null} homePathStart
 * @property {Point|null} homePathMid
 * @property {Point|null} homePathEnd
 */

/**
 * Application state
 * @typedef {Object} AppState
 * @property {FieldProfile} fieldProfile - Current field profile
 * @property {boolean} showMeasurementsOnField - Measurement visibility toggle
 * @property {boolean} editMode - Edit mode active state
 * @property {string|null} draggingHandle - Currently dragged handle name
 * @property {EditablePoints} editablePoints - User-modified measurement points
 * @property {Array} snapTargets - Available snap targets for dragging
 * @property {Point|null} activeSnapPoint - Current snap point during drag
 * @property {Array} measurementHitAreas - Canvas hit detection areas
 */

export const fieldProfileMen = {
  id: "Miehet",
  homePlate: {
    radius: 0.3,
    centerToHomeLine: 1.3,
    lineHalfWidth: 7.0,
  },
  battingSector: {
    originOffsetY: -0.569,
    leftAngleDeg: -32.0,
    rightAngleDeg: 32.0,
  },
  diagonalLines: {
    lengthFromHomeLine: 32.0,
  },
  backBoundary: {
    distanceFromHomeLine: 96.0,
    width: 42.0,
  },
  frontArc: {
    innerRadius: 2.5,
    outerRadius: 2.7,
  },
  homeArcs: {
    innerRadius: 5.0,
    outerRadius: 7.0,
  },
  firstBaseCanvasOffset: {
    distanceFromHomeLine: 20.0,
  },
  secondBaseCanvasOffset: {
    distanceFromRightAngle: 6.5,
  },
  thirdBaseCanvasOffset: {
    distanceFromLeftAngle: 6.5,
  },
  baseRadius: 3.0,
  baseLineLength: 7.0,
  homePathFirstLine: 15.5,
  homePathEndOffset: 6.0,
};

export const fieldProfileWomen = {
  id: "Naiset",
  homePlate: {
    radius: 0.3,
    centerToHomeLine: 1.3,
    lineHalfWidth: 7.0,
  },
  battingSector: {
    originOffsetY: -0.569,
    leftAngleDeg: -32.0,
    rightAngleDeg: 32.0,
  },
  diagonalLines: {
    lengthFromHomeLine: 27.162,
  },
  backBoundary: {
    distanceFromHomeLine: 82.0,
    width: 36.0,
  },
  frontArc: {
    innerRadius: 2.5,
    outerRadius: 2.7,
  },
  homeArcs: {
    innerRadius: 5.0,
    outerRadius: 7.0,
  },
  firstBaseCanvasOffset: {
    distanceFromHomeLine: 17.5,
  },
  secondBaseCanvasOffset: {
    distanceFromRightAngle: 7.339,
  },
  thirdBaseCanvasOffset: {
    distanceFromLeftAngle: 7.339,
  },
  baseRadius: 2.5,
  baseLineLength: 7.0,
  homePathFirstLine: 16.0,
  homePathEndOffset: 6.0,
};

export const SNAP_THRESHOLD = 0.4; // meters

/**
 * Create initial application state
 * @returns {AppState}
 */
export const createInitialState = () => ({
  fieldProfile: fieldProfileWomen,
  showMeasurementsOnField: true,
  editMode: true,
  draggingHandle: null,
  editablePoints: {
    homePathStart: null,
    homePathMid: null,
    homePathEnd: null,
  },
  snapTargets: [],
  activeSnapPoint: null,
  measurementHitAreas: [],
  // Zoom and pan state
  zoomLevel: 1.0,
  minZoom: 0.5,
  maxZoom: 3.0,
  panX: 0,
  panY: 0,
  isPanning: false,
});

/**
 * State store with immutable updates
 */
class StateStore {
  #state;
  #listeners = new Set();

  constructor(initialState) {
    this.#state = initialState;
  }

  /**
   * Get current state (read-only)
   * @returns {AppState}
   */
  getState() {
    return this.#state;
  }

  /**
   * Update state immutably
   * @param {Partial<AppState>|Function} updates - State updates or updater function
   */
  setState(updates) {
    const prevState = this.#state;
    const newState =
      typeof updates === "function"
        ? updates(prevState)
        : { ...prevState, ...updates };

    this.#state = newState;
    this.#notify();
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((listener) => listener(this.#state));
  }

  /**
   * Reset editable points to null (force re-initialization)
   */
  resetEditablePoints() {
    this.setState({
      editablePoints: {
        homePathStart: null,
        homePathMid: null,
        homePathEnd: null,
      },
    });
  }

  /**
   * Update editable point
   * @param {string} pointName - Point name (homePathStart|homePathMid|homePathEnd)
   * @param {Point} newPoint - New point coordinates
   */
  updateEditablePoint(pointName, newPoint) {
    this.setState({
      editablePoints: {
        ...this.#state.editablePoints,
        [pointName]: { ...newPoint },
      },
    });
  }

  /**
   * Set field profile and reset editable points
   * @param {FieldProfile} profile - New field profile
   */
  setFieldProfile(profile) {
    this.setState({
      fieldProfile: profile,
      editablePoints: {
        homePathStart: null,
        homePathMid: null,
        homePathEnd: null,
      },
    });
  }

  /**
   * Toggle edit mode
   */
  toggleEditMode() {
    this.setState((state) => ({
      ...state,
      editMode: !state.editMode,
    }));
  }

  /**
   * Toggle measurements visibility
   */
  toggleMeasurements() {
    this.setState((state) => ({
      ...state,
      showMeasurementsOnField: !state.showMeasurementsOnField,
    }));
  }

  /**
   * Set zoom level (clamped to min/max)
   * @param {number} zoomLevel - New zoom level
   */
  setZoom(zoomLevel) {
    this.setState((state) => ({
      ...state,
      zoomLevel: Math.max(state.minZoom, Math.min(state.maxZoom, zoomLevel)),
    }));
  }

  /**
   * Set pan offset
   * @param {number} panX - X offset in pixels
   * @param {number} panY - Y offset in pixels
   */
  setPan(panX, panY) {
    this.setState({ panX, panY });
  }

  /**
   * Set panning state
   * @param {boolean} isPanning - Whether panning is active
   */
  setIsPanning(isPanning) {
    this.setState({ isPanning });
  }

  /**
   * Reset zoom and pan to defaults
   */
  resetZoomPan() {
    this.setState({
      zoomLevel: 1.0,
      panX: 0,
      panY: 0,
    });
  }
}

export const store = new StateStore(createInitialState());
