import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Bike, Footprints } from 'lucide-react'; // Added icons
import { Button } from '../components/ui/Button';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Re-use icon fix (should ideally be in a shared utility)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle auto-zoom
function BoundsHandler({ pos1, pos2, routeCoords }: {
    pos1: { lat: number, lng: number } | null,
    pos2: { lat: number, lng: number },
    routeCoords: { lat: number, lng: number }[] | null
}) {
    const map = useMap();
    useEffect(() => {
        if (routeCoords && routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (pos1 && pos2) {
            const bounds = L.latLngBounds([pos1, pos2]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (pos2) {
            map.setView(pos2, 15);
        }
    }, [pos1, pos2, routeCoords, map]);
    return null;
}

type TransportMode = 'driving' | 'cycling' | 'walking';

export default function DistanceMap() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const targetLat = parseFloat(searchParams.get('lat') || '0');
    const targetLng = parseFloat(searchParams.get('lng') || '0');
    const title = searchParams.get('title') || 'Target';

    const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
    const [routeCoords, setRouteCoords] = useState<{ lat: number; lng: number }[] | null>(null);
    const [stats, setStats] = useState<{ distance: number, duration: number } | null>(null);
    const [mode, setMode] = useState<TransportMode>('driving');

    // Fetch Route from OSRM
    const fetchRoute = useCallback(async (start: { lat: number, lng: number }, end: { lat: number, lng: number }, mode: TransportMode) => {
        try {
            // Select appropriate OSRM server/profile
            let url = '';
            // Note: OSRM demo server only supports 'driving'. 
            // We use routing.openstreetmap.de for others (standard public instances)
            if (mode === 'driving') {
                url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            } else if (mode === 'cycling') {
                // Often routed-bike uses 'driving' as the profile name in the URL path for "default profile of this instance"
                url = `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            } else if (mode === 'walking') {
                // Similarly for foot
                url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Routing failed: ${res.statusText}`);

            const data = await res.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                // GeoJSON coordinates are [lon, lat] -> Leaflet needs [lat, lon]
                const coords = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                setRouteCoords(coords);
                setStats({
                    distance: route.distance, // meters
                    duration: route.duration  // seconds
                });
            }
        } catch (e) {
            console.error("Routing error:", e);
        }
    }, []);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMyPos(currentPos);
                // Initial fetch
                fetchRoute(currentPos, { lat: targetLat, lng: targetLng }, mode);
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
    }, [targetLat, targetLng]); // Only runs once on mount/target change for geolocation

    // Re-fetch when mode changes
    useEffect(() => {
        if (myPos) {
            fetchRoute(myPos, { lat: targetLat, lng: targetLng }, mode);
        }
    }, [mode, myPos, targetLat, targetLng, fetchRoute]);


    const formatDuration = (seconds: number) => {
        const min = Math.round(seconds / 60);
        if (min < 60) return `${min} min`;
        const hr = Math.floor(min / 60);
        const remMin = min % 60;
        return `${hr} hr ${remMin} min`;
    };

    const formatDistance = (meters: number) => {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    };

    return (
        <div className="relative w-full h-screen bg-slate-100 flex flex-col">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-[500] w-[90%] flex flex-col gap-2 pointer-events-none">
                <div className="flex justify-between items-center w-full">
                    <Button onClick={() => navigate(-1)} variant="outline" className="bg-white shadow pointer-events-auto">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>

                    {stats && (
                        <div className="bg-white px-4 py-2 rounded-lg shadow font-mono text-sm font-bold border border-slate-200 pointer-events-auto flex gap-4">
                            <span>{formatDistance(stats.distance)}</span>
                            <span className="text-blue-600">{formatDuration(stats.duration)}</span>
                        </div>
                    )}
                </div>

                {/* Mode Switcher */}
                <div className="bg-white/90 backdrop-blur p-1 rounded-lg shadow self-start pointer-events-auto flex gap-1 border border-slate-200">
                    <Button
                        variant={mode === 'driving' ? 'primary' : 'ghost'}
                        onClick={() => setMode('driving')}
                        className="h-8 px-3 py-1 text-xs"
                    >
                        <Car className="w-4 h-4 mr-2" /> Drive
                    </Button>
                    <Button
                        variant={mode === 'cycling' ? 'primary' : 'ghost'}
                        onClick={() => setMode('cycling')}
                        className="h-8 px-3 py-1 text-xs"
                    >
                        <Bike className="w-4 h-4 mr-2" /> Cycle
                    </Button>
                    <Button
                        variant={mode === 'walking' ? 'primary' : 'ghost'}
                        onClick={() => setMode('walking')}
                        className="h-8 px-3 py-1 text-xs"
                    >
                        <Footprints className="w-4 h-4 mr-2" /> Walk
                    </Button>
                </div>
            </div>

            {/* Real Map */}
            <div className="flex-1 relative z-0">
                <MapContainer center={[targetLat, targetLng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Target Marker */}
                    <Marker position={[targetLat, targetLng]}>
                        <Popup>{title}</Popup>
                    </Marker>

                    {/* User Marker */}
                    {myPos && (
                        <Marker position={myPos} opacity={0.8}>
                            <Popup>You</Popup>
                        </Marker>
                    )}

                    {/* Route Polyline */}
                    {routeCoords && (
                        <Polyline
                            positions={routeCoords}
                            color={mode === 'walking' ? '#10b981' : mode === 'cycling' ? '#8b5cf6' : '#3b82f6'}
                            weight={5}
                            opacity={0.7}
                        />
                    )}

                    {/* Fallback dotted line if no route yet */}
                    {myPos && !routeCoords && (
                        <Polyline positions={[myPos, { lat: targetLat, lng: targetLng }]} color="gray" dashArray="10, 10" />
                    )}

                    <BoundsHandler pos1={myPos} pos2={{ lat: targetLat, lng: targetLng }} routeCoords={routeCoords} />
                </MapContainer>
            </div>

            <div className="bg-white p-6 border-t border-slate-200 z-10 relative">
                <h3 className="font-bold text-lg mb-2">
                    Navigation: {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </h3>
                <p className="text-slate-500 text-sm">
                    {stats
                        ? `Estimated travel time: ${formatDuration(stats.duration)}.`
                        : "Calculating route..."}
                </p>
            </div>
        </div>
    );
}
