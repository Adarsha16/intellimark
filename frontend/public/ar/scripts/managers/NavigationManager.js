import { ARRIVAL_THRESHOLD_METERS, UI_UPDATE_INTERVAL } from '../constants.js'
import { GeoUtils } from '../utils/GeoUtils.js'
import { UIEffects } from '../components/UIEffects.js'

export class NavigationManager {
  constructor(locations, stateManager, arSceneManager, hudController, arrowAnimator) {
    this.locations = locations
    this.stateManager = stateManager
    this.arSceneManager = arSceneManager
    this.hudController = hudController
    this.arrowAnimator = arrowAnimator
    this.updateInterval = null
  }

  init() {
    this.setupGPSListener()
    this.startUIUpdateLoop()
  }

  // GPS position listener
  setupGPSListener() {
    window.addEventListener('gps-camera-update-position', (e) => {
      this.stateManager.setUserPosition(e.detail.position.latitude, e.detail.position.longitude)
      this.updateNavigation()
    })
  }

  // UI update loop
  startUIUpdateLoop() {
    this.updateInterval = setInterval(() => {
      this.updateNavigation()
      UIEffects.updateAllCountdowns()
    }, UI_UPDATE_INTERVAL)
  }

  stopUIUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  // Set active target by id
  setTarget(locationId) {
    const newTarget = this.locations.find((l) => l.id === locationId)
    const currentTarget = this.stateManager.getCurrentTarget()

    if (!newTarget || newTarget === currentTarget) return

    // Hide old target AR content
    if (currentTarget) {
      this.arSceneManager.hideLocationContent(currentTarget.id)
    }

    // Set new target
    this.stateManager.setCurrentTarget(newTarget)
    this.stateManager.setHasArrived(false)

    // Show new target AR content
    this.arSceneManager.showLocationContent(newTarget.id)

    // Show arrow
    this.arrowAnimator.show()

    // Trigger immediate update
    this.updateNavigation()
  }

  // Update navigation data and UI
  updateNavigation() {
    const currentTarget = this.stateManager.getCurrentTarget()
    if (!currentTarget) return

    // Calculate distance and bearing
    const distance = GeoUtils.calculateDistance(
      this.stateManager.getUserLat(),
      this.stateManager.getUserLng(),
      currentTarget.lat,
      currentTarget.lng
    )

    const bearing = GeoUtils.calculateBearing(
      this.stateManager.getUserLat(),
      this.stateManager.getUserLng(),
      currentTarget.lat,
      currentTarget.lng
    )

    const direction = GeoUtils.getCardinalDirection(bearing)

    // Update signal strength
    UIEffects.updateSignalStrength(distance)

    // Check arrival
    this.checkArrival(distance)

    // Update HUD
    this.hudController.update(distance, direction)
    this.hudController.toggleArrival(this.stateManager.getHasArrived())

    // Update arrow rotation target
    this.updateArrowTarget(bearing)
  }

  // Arrival check
  checkArrival(distance) {
    const hasArrived = this.stateManager.getHasArrived()

    if (distance < ARRIVAL_THRESHOLD_METERS && !hasArrived) {
      this.stateManager.setHasArrived(true)
      UIEffects.createConfetti()
    } else if (distance >= ARRIVAL_THRESHOLD_METERS && hasArrived) {
      // Reset if they walk away
      this.stateManager.setHasArrived(false)
    }
  }

  // Arrow rotation target
  updateArrowTarget(bearing) {
    const camera = document.querySelector('[gps-camera]')
    if (!camera) return

    const camRot = camera.getAttribute('rotation')
    const deviceHeading = this.stateManager.getDeviceHeading()
    const userHeading = deviceHeading || camRot.y

    const angleDiff = GeoUtils.angleDifference(userHeading, bearing)
    this.stateManager.setTargetArrowRotation(-angleDiff)
  }

  // Current target getter
  getCurrentTarget() {
    return this.stateManager.getCurrentTarget()
  }
}
