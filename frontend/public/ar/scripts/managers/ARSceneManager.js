import { AR_MARKER } from '../constants.js'

export class ARSceneManager {
  constructor(locations, stateManager) {
    this.locations = locations
    this.stateManager = stateManager
    this.container = null
  }

  init() {
    this.container = document.getElementById('destinations-container')
    if (!this.container) {
      console.error('destinations-container not found')
      return
    }

    this.createLocationMarkers()
    this.setupDeviceOrientation()
  }

  // Create markers for each location
  createLocationMarkers() {
    this.locations.forEach((loc) => {
      const entity = this.createLocationEntity(loc)
      this.container.appendChild(entity)
    })
  }

  // Create one location entity
  createLocationEntity(loc) {
    const entity = document.createElement('a-entity')
    entity.setAttribute('gps-entity-place', `latitude: ${loc.lat}; longitude: ${loc.lng};`)
    entity.setAttribute('id', loc.id)

    const contentWrapper = this.createContentWrapper(loc)
    entity.appendChild(contentWrapper)

    return entity
  }

  // Wrapper with visual elements
  createContentWrapper(loc) {
    const contentWrapper = document.createElement('a-entity')
    contentWrapper.setAttribute('id', `${loc.id}-content`)
    contentWrapper.setAttribute('visible', 'false')

    const pinContainer = this.createPinContainer()
    const pulseRing = this.createPulseRing()
    const text = this.createLocationText(loc.name)

    contentWrapper.appendChild(pulseRing)
    contentWrapper.appendChild(pinContainer)
    contentWrapper.appendChild(text)

    return contentWrapper
  }

  // Pin container with animation
  createPinContainer() {
    const pinContainer = document.createElement('a-entity')
    pinContainer.setAttribute('position', '0 0 0')
    pinContainer.setAttribute(
      'animation',
      `property: position; dir: alternate; dur: ${AR_MARKER.animationDuration}; loop: true; to: ${AR_MARKER.animationTo}`
    )

    const crystal = this.createCrystal()
    pinContainer.appendChild(crystal)

    return pinContainer
  }

  // Crystal marker
  createCrystal() {
    const crystal = document.createElement('a-octahedron')
    crystal.setAttribute('radius', AR_MARKER.crystalRadius)
    crystal.setAttribute('color', AR_MARKER.crystalColor)
    crystal.setAttribute('position', AR_MARKER.crystalPosition)
    crystal.setAttribute(
      'material',
      `emissive: ${AR_MARKER.crystalEmissive}; emissiveIntensity: ${AR_MARKER.crystalEmissiveIntensity}; metalness: ${AR_MARKER.crystalMetalness}; roughness: ${AR_MARKER.crystalRoughness}; opacity: 1`
    )
    crystal.setAttribute(
      'animation',
      `property: rotation; to: 0 360 0; dur: ${AR_MARKER.rotationDuration}; loop: true; easing: linear`
    )

    return crystal
  }

  // Pulsing ring effect
  createPulseRing() {
    const pulseRing = document.createElement('a-ring')
    pulseRing.setAttribute('color', AR_MARKER.pulseRingColor)
    pulseRing.setAttribute('radius-inner', AR_MARKER.pulseRingRadiusInner)
    pulseRing.setAttribute('radius-outer', AR_MARKER.pulseRingRadiusOuter)
    pulseRing.setAttribute('rotation', '-90 0 0')
    pulseRing.setAttribute('position', AR_MARKER.pulseRingPosition)
    pulseRing.setAttribute(
      'animation__scale',
      `property: scale; dir: normal; dur: ${AR_MARKER.pulseDuration}; loop: true; from: ${AR_MARKER.pulseScaleFrom}; to: ${AR_MARKER.pulseScaleTo}`
    )
    pulseRing.setAttribute(
      'animation__fade',
      `property: material.opacity; dir: normal; dur: ${AR_MARKER.pulseDuration}; loop: true; from: 0.8; to: 0`
    )

    return pulseRing
  }

  // Location label
  createLocationText(name) {
    const text = document.createElement('a-text')
    text.setAttribute('value', name)
    text.setAttribute('scale', AR_MARKER.textScale)
    text.setAttribute('align', 'center')
    text.setAttribute('color', '#ffffff')
    text.setAttribute('look-at', '[gps-camera]')
    text.setAttribute('position', AR_MARKER.textPosition)
    text.setAttribute('material', 'shader: flat; side: double')

    return text
  }

  // Device orientation listeners
  setupDeviceOrientation() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', this.handleOrientation.bind(this), true)
      window.addEventListener('deviceorientation', this.handleOrientation.bind(this), true)
    }
  }

  // Orientation handler
  handleOrientation(event) {
    if (event.webkitCompassHeading) {
      // iOS
      this.stateManager.setDeviceHeading(event.webkitCompassHeading)
    } else if (event.alpha) {
      // Android
      this.stateManager.setDeviceHeading(360 - event.alpha)
    }
  }

  // Show content by id
  showLocationContent(locationId) {
    const content = document.getElementById(`${locationId}-content`)
    if (content) {
      content.setAttribute('visible', 'true')
    }
  }

  // Hide content by id
  hideLocationContent(locationId) {
    const content = document.getElementById(`${locationId}-content`)
    if (content) {
      content.setAttribute('visible', 'false')
    }
  }
}
