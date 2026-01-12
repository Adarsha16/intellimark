// Navigation
export const ARRIVAL_THRESHOLD_METERS = 15
export const ROTATION_SMOOTHNESS = 0.15

// Signal thresholds (meters)
export const SIGNAL_THRESHOLDS = {
  EXCELLENT: 20,
  GOOD: 50,
  FAIR: 100,
  POOR: 200,
}

// Signal bars
export const SIGNAL_BAR_COUNT = 5

// UI and confetti
export const UI_UPDATE_INTERVAL = 1000
export const CONFETTI_COUNT = 100
export const CONFETTI_REMOVAL_DELAY = 7000
export const CONFETTI_DURATION_MIN = 2
export const CONFETTI_DURATION_MAX = 5
export const CONFETTI_DELAY_MAX = 2
export const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF']

// Geo
export const EARTH_RADIUS_METERS = 6371e3
export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI

// Cardinal directions
export const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const DIRECTION_ANGLE_STEP = 45

// Carousel
export const CAROUSEL_CONFIG = {
  type: 'carousel',
  focusAt: 'center',
  perView: 1.5,
  peek: { before: 24, after: 24 },
  breakpoints: {
    480: {
      perView: 1,
      peek: { before: 16, after: 16 },
    },
  },
}

// AR marker
export const AR_MARKER = {
  crystalRadius: 3.5,
  crystalPosition: '0 10 0', // Changed from "0 5 0" (added 5 meters)
  crystalColor: '#10b981',
  crystalEmissive: '#34d399',
  crystalEmissiveIntensity: 1,
  crystalMetalness: 0.7,
  crystalRoughness: 0.2,
  pulseRingColor: '#10b981',
  pulseRingRadiusInner: 3.5,
  pulseRingRadiusOuter: 4.5,
  pulseRingPosition: '0 8 0', // Changed from "0 0.5 0" (positioned at base)
  textScale: '12 12 12',
  textPosition: '0 20 0', // Changed from "0 12 0" (added 8 meters to clear crystal)
  animationDuration: 3000,
  animationTo: '0 5 0', // Changed from "0 2.5 0" (maintains 2m animation bounce)
  rotationDuration: 5000,
  pulseDuration: 2000,
  pulseScaleFrom: '1 1 1',
  pulseScaleTo: '6 6 6',
}

// Arrow
export const ARROW_CONFIG = {
  rotationX: -45,
  rotationY: 0,
}
