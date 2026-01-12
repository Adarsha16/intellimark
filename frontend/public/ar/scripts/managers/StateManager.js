export class StateManager {
  constructor() {
    this.currentTarget = null
    this.userLat = 0
    this.userLng = 0
    this.deviceHeading = 0
    this.currentArrowRotation = 0
    this.targetArrowRotation = 0
    this.hasArrived = false
  }

  getCurrentTarget() {
    return this.currentTarget
  }

  setCurrentTarget(target) {
    this.currentTarget = target
  }

  getUserLat() {
    return this.userLat
  }

  setUserLat(lat) {
    this.userLat = lat
  }

  getUserLng() {
    return this.userLng
  }

  setUserLng(lng) {
    this.userLng = lng
  }

  setUserPosition(lat, lng) {
    this.userLat = lat
    this.userLng = lng
  }

  getDeviceHeading() {
    return this.deviceHeading
  }

  setDeviceHeading(heading) {
    this.deviceHeading = heading
  }

  getCurrentArrowRotation() {
    return this.currentArrowRotation
  }

  setCurrentArrowRotation(rotation) {
    this.currentArrowRotation = rotation
  }

  getTargetArrowRotation() {
    return this.targetArrowRotation
  }

  setTargetArrowRotation(rotation) {
    this.targetArrowRotation = rotation
  }

  getHasArrived() {
    return this.hasArrived
  }

  setHasArrived(arrived) {
    this.hasArrived = arrived
  }

  reset() {
    this.currentTarget = null
    this.userLat = 0
    this.userLng = 0
    this.deviceHeading = 0
    this.currentArrowRotation = 0
    this.targetArrowRotation = 0
    this.hasArrived = false
  }
}
