import { ROTATION_SMOOTHNESS, ARROW_CONFIG } from "../constants.js";
import { GeoUtils } from "../utils/GeoUtils.js";

export class ArrowAnimator {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.arrowElement = null;
    this.isAnimating = false;
  }

  // Initialize arrow element

  init() {
    this.arrowElement = document.getElementById("nav-arrow");
    if (!this.arrowElement) {
      console.error("nav-arrow element not found");
    }
  }

  // Start animation loop

  start() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  // Stop animation loop

  stop() {
    this.isAnimating = false;
  }

  // Smooth rotation update

  animate() {
    if (!this.isAnimating) return;

    const currentTarget = this.stateManager.getCurrentTarget();
    const camera = document.querySelector("[gps-camera]");

    if (camera && currentTarget) {
      // Get user heading
      const camRot = camera.getAttribute("rotation");
      const deviceHeading = this.stateManager.getDeviceHeading();
      const userHeading = deviceHeading || camRot.y;

      // Calculate bearing to target
      const bearing = GeoUtils.calculateBearing(
        this.stateManager.getUserLat(),
        this.stateManager.getUserLng(),
        currentTarget.lat,
        currentTarget.lng
      );

      // Calculate target rotation
      const angleDiff = GeoUtils.angleDifference(userHeading, bearing);
      this.stateManager.setTargetArrowRotation(-angleDiff);
    }

    this.updateArrowRotation();

    requestAnimationFrame(() => this.animate());
  }

  // Apply rotation with smoothing

  updateArrowRotation() {
    if (!this.arrowElement || !this.stateManager.getCurrentTarget()) {
      return;
    }

    const currentRotation = this.stateManager.getCurrentArrowRotation();
    const targetRotation = this.stateManager.getTargetArrowRotation();

    // Calculate difference and apply smoothing
    let diff = GeoUtils.angleDifference(currentRotation, targetRotation);
    const newRotation = currentRotation + diff * ROTATION_SMOOTHNESS;

    // Normalize and update state
    const normalizedRotation = GeoUtils.normalizeAngle(newRotation);
    this.stateManager.setCurrentArrowRotation(normalizedRotation);

    // Apply rotation to arrow (rotate around Z axis)
    this.arrowElement.setAttribute("rotation", {
      x: ARROW_CONFIG.rotationX,
      y: ARROW_CONFIG.rotationY,
      z: normalizedRotation,
    });
  }

  show() {
    if (this.arrowElement) {
      this.arrowElement.setAttribute("visible", "true");
    }
  }

  hide() {
    if (this.arrowElement) {
      this.arrowElement.setAttribute("visible", "false");
    }
  }
}
