export class HUDController {
  constructor() {
    this.distElement = null;
    this.dirElement = null;
    this.arrivalElement = null;
  }

  init() {
    this.distElement = document.getElementById("dist-info");
    this.dirElement = document.getElementById("dir-info");
    this.arrivalElement = document.getElementById("arrival-msg");

    if (!this.distElement || !this.dirElement) {
      console.error("HUD elements not found");
    }
  }

  updateDistance(distance) {
    if (this.distElement) {
      this.distElement.innerText = `${Math.round(distance)} m`;
    }
  }

  updateDirection(direction) {
    if (this.dirElement) {
      this.dirElement.innerText = direction;
    }
  }

  update(distance, direction) {
    this.updateDistance(distance);
    this.updateDirection(direction);
  }

  showArrival() {
    if (this.arrivalElement) {
      this.arrivalElement.style.display = "block";
    }
  }

  hideArrival() {
    if (this.arrivalElement) {
      this.arrivalElement.style.display = "none";
    }
  }

  toggleArrival(hasArrived) {
    if (hasArrived) {
      this.showArrival();
    } else {
      this.hideArrival();
    }
  }
}
