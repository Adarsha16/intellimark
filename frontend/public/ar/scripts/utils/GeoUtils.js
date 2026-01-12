import {
  EARTH_RADIUS_METERS,
  DEG_TO_RAD,
  RAD_TO_DEG,
  CARDINAL_DIRECTIONS,
  DIRECTION_ANGLE_STEP,
} from "../constants.js";

export class GeoUtils {
  // Distance in meters using Haversine
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const delPhi = (lat2 - lat1) * DEG_TO_RAD;
    const delLambda = (lon2 - lon1) * DEG_TO_RAD;

    const a =
      Math.sin(delPhi / 2) * Math.sin(delPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(delLambda / 2) *
        Math.sin(delLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
  }

  // Bearing in degrees from start to destination
  static calculateBearing(startLat, startLng, destLat, destLng) {
    const startLatRad = startLat * DEG_TO_RAD;
    const startLngRad = startLng * DEG_TO_RAD;
    const destLatRad = destLat * DEG_TO_RAD;
    const destLngRad = destLng * DEG_TO_RAD;

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x =
      Math.cos(startLatRad) * Math.sin(destLatRad) -
      Math.sin(startLatRad) *
        Math.cos(destLatRad) *
        Math.cos(destLngRad - startLngRad);

    let brng = Math.atan2(y, x);
    brng = brng * RAD_TO_DEG;
    return (brng + 360) % 360;
  }

  // Cardinal direction from angle
  static getCardinalDirection(angle) {
    return CARDINAL_DIRECTIONS[Math.round(angle / DIRECTION_ANGLE_STEP) % 8];
  }

  // Normalize angle to -180..180
  static normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  // Difference between two angles normalized
  static angleDifference(angle1, angle2) {
    let diff = angle2 - angle1;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }
}
