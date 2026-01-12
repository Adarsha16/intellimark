import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Routing {
    interface RoutingControlOptions {
      waypoints: L.LatLng[];
      router?: any;
      lineOptions?: {
        styles?: Array<{
          color?: string;
          weight?: number;
          opacity?: number;
        }>;
        extendToWaypoints?: boolean;
        missingRouteTolerance?: number;
      };
      showAlternatives?: boolean;
      fitSelectedRoutes?: boolean;
      addWaypoints?: boolean;
      draggableWaypoints?: boolean;
      createMarker?: (i: number, wp: any) => L.Marker;
    }

    class Control extends L.Control {
      constructor(options?: RoutingControlOptions);
      getWaypoints(): L.LatLng[];
      setWaypoints(waypoints: L.LatLng[]): void;
    }

    class OSRMv1 {
      constructor(options?: { serviceUrl?: string });
    }

    function control(options?: RoutingControlOptions): Control;
  }
}

declare module 'leaflet-routing-machine' {
  // This module extends Leaflet, so no direct exports needed
}
