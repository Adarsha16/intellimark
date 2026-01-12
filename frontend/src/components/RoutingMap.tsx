import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';



// --- Custom Marker Icons ---
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const eventIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface RoutingControllerProps {
    userLat: number;
    userLng: number;
    targetLat: number;
    targetLng: number;
    profile: string; // 'car', 'bike', or 'foot'
}

// Internal component to handle the Routing Machine logic
function RoutingController({ userLat, userLng, targetLat, targetLng, profile }: RoutingControllerProps) {
    const map = useMap();
    const routingControlRef = useRef<any>(null);

    useEffect(() => {
        if (!map) return;

        // 1. cleanup previous routing control
        if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
        }

        // 2. Define OSRM service URL based on profile
        // profiles: 'routed-car', 'routed-bike', 'routed-foot'
        const routerUrl = `https://routing.openstreetmap.de/routed-${profile}/route/v1`;

        // 3. Create new routing control
        const control = (L.Routing as any).control({
            waypoints: [
                L.latLng(userLat, userLng),
                L.latLng(targetLat, targetLng)
            ],
            router: new (L.Routing as any).OSRMv1({
                serviceUrl: routerUrl
            }),
            lineOptions: {
                styles: [{ color: '#4F46E5', weight: 6, opacity: 0.9 }], // Indigo color
                extendToWaypoints: true,
                missingRouteTolerance: 0
            },
            showAlternatives: true, // Show grey lines for alternative paths
            fitSelectedRoutes: true,
            addWaypoints: false,    // Disable adding points by dragging line
            draggableWaypoints: false,

            // 4. Custom Marker Logic
            createMarker: function (i: number, wp: any) {
                // i = 0 is the User (Start)
                // i = nWps - 1 is the Event (Destination)
                if (i === 0) {
                    return L.marker(wp.latLng, { icon: userIcon })
                        .bindPopup("<b>You are here</b>");
                } else {
                    return L.marker(wp.latLng, { icon: eventIcon })
                        .bindPopup("<b>Destination</b>");
                }
            }
        } as any).addTo(map);

        routingControlRef.current = control;

        // Cleanup on unmount or prop change
        return () => {
            if (routingControlRef.current) {
                map.removeControl(routingControlRef.current);
            }
        };
    }, [map, userLat, userLng, targetLat, targetLng, profile]);

    return null;
}

interface RoutingMapProps {
    userLat: number;
    userLng: number;
    targetLat: number;
    targetLng: number;
    profile: string;
}

export default function RoutingMap({ userLat, userLng, targetLat, targetLng, profile }: RoutingMapProps) {
    return (
        <MapContainer
            center={[userLat, userLng]}
            zoom={13}
            className="w-full h-full z-0"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RoutingController
                userLat={userLat}
                userLng={userLng}
                targetLat={targetLat}
                targetLng={targetLng}
                profile={profile}
            />
        </MapContainer>
    );
}