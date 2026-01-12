import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Bike, Footprints, RefreshCw, Navigation, ChevronRight, MapPin } from 'lucide-react';
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
    const [instructions, setInstructions] = useState<Array<{
        distance: number;
        duration: number;
        instruction: string;
        type: number;
        modifier?: string;
    }>>([]);
    const [isRecalculating, setIsRecalculating] = useState(false);

    // Convert OSRM maneuver types to readable instructions
    const getInstructionText = useCallback((type: number, modifier?: string, roadName?: string): string => {
        const road = roadName ? ` onto ${roadName}` : '';

        // OSRM maneuver types: https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md
        const instructions: { [key: number]: string } = {
            0: 'Unknown',
            1: 'Start',
            2: 'Go straight',
            3: 'Turn right',
            4: 'Turn left',
            5: 'Slight right',
            6: 'Slight left',
            7: 'Sharp right',
            8: 'Sharp left',
            9: 'U-turn',
            10: 'U-turn',
            11: 'Arrive',
            12: 'Enter roundabout',
            13: 'Exit roundabout',
            14: 'Change lane',
            15: 'Continue',
        };

        let instruction = instructions[type] || 'Continue';

        // Add modifier for more detail
        if (modifier) {
            const modifiers: { [key: string]: string } = {
                'left': 'left',
                'right': 'right',
                'sharp left': 'sharp left',
                'sharp right': 'sharp right',
                'slight left': 'slight left',
                'slight right': 'slight right',
                'straight': 'straight',
                'uturn': 'U-turn'
            };

            if (modifiers[modifier] && instruction === 'Continue') {
                instruction = `Turn ${modifiers[modifier]}`;
            }
        }

        return instruction + road;
    }, []);

    // Fetch Route from OSRM with turn-by-turn instructions
    const fetchRoute = useCallback(async (start: { lat: number, lng: number }, end: { lat: number, lng: number }, mode: TransportMode) => {
        setIsRecalculating(true);
        try {
            // Select appropriate OSRM server/profile
            let url = '';
            // Note: OSRM demo server only supports 'driving'. 
            // We use routing.openstreetmap.de for others (standard public instances)
            // Add steps=true to get turn-by-turn instructions
            if (mode === 'driving') {
                url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
            } else if (mode === 'cycling') {
                url = `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
            } else if (mode === 'walking') {
                url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
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

                // Extract turn-by-turn instructions from legs
                const allSteps: Array<{
                    distance: number;
                    duration: number;
                    instruction: string;
                    type: number;
                    modifier?: string;
                }> = [];

                if (route.legs && route.legs.length > 0) {
                    route.legs.forEach((leg: any) => {
                        if (leg.steps) {
                            leg.steps.forEach((step: any) => {
                                const instruction = getInstructionText(step.maneuver.type, step.maneuver.modifier, step.name);
                                allSteps.push({
                                    distance: step.distance,
                                    duration: step.duration,
                                    instruction: instruction,
                                    type: step.maneuver.type,
                                    modifier: step.maneuver.modifier
                                });
                            });
                        }
                    });
                }

                setInstructions(allSteps);
            }
        } catch (e) {
            console.error("Routing error:", e);
        } finally {
            setIsRecalculating(false);
        }
    }, [getInstructionText]);

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

    const handleRecalculate = () => {
        if (myPos) {
            fetchRoute(myPos, { lat: targetLat, lng: targetLng }, mode);
        }
    };

    return (
        <div className="relative w-full h-screen bg-white flex flex-col overflow-hidden">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-[500] w-[90%] flex flex-col gap-2 pointer-events-none">
                <div className="flex justify-between items-center w-full gap-2">
                    <Button onClick={() => navigate(-1)} variant="outline" className="bg-white shadow pointer-events-auto">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>

                    <div className="flex gap-2 items-center">
                        {stats && (
                            <div className="bg-white px-4 py-2 rounded-lg shadow font-mono text-sm font-bold border border-slate-200 pointer-events-auto flex gap-4">
                                <span>{formatDistance(stats.distance)}</span>
                                <span className="text-blue-600">{formatDuration(stats.duration)}</span>
                            </div>
                        )}

                        <Button
                            onClick={handleRecalculate}
                            variant="outline"
                            className="bg-white shadow pointer-events-auto"
                            disabled={isRecalculating || !myPos}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
                            Recalculate
                        </Button>
                    </div>
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
            <div className="flex-1 relative z-0 bg-white min-h-0">
                <MapContainer
                    center={[targetLat, targetLng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    className="w-full h-full"
                >
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

            {/* Bottom Panel with Directions */}
            <div className="bg-white border-t border-slate-200 z-10 relative flex flex-col" style={{ maxHeight: '40vh' }}>
                {/* Summary Bar */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">
                            {title}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {stats
                                ? `${formatDistance(stats.distance)} • ${formatDuration(stats.duration)}`
                                : "Calculating route..."}
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate(`/ar-view?lat=${targetLat}&lng=${targetLng}&title=${encodeURIComponent(title)}`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        <Navigation className="w-4 h-4" />
                        AR View
                    </Button>
                </div>

                {/* Turn-by-Turn Directions */}
                {instructions.length > 0 && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700">
                            <MapPin className="w-4 h-4" />
                            <span>Turn-by-Turn Directions</span>
                        </div>
                        <div className="space-y-2">
                            {instructions.map((step, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mt-0.5">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-900 text-sm">
                                            {step.instruction}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                            <span>{formatDistance(step.distance)}</span>
                                            <span>•</span>
                                            <span>{formatDuration(step.duration)}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {instructions.length === 0 && !isRecalculating && myPos && (
                    <div className="p-4 text-center text-slate-500 text-sm">
                        No directions available
                    </div>
                )}
            </div>
        </div>
    );
}
