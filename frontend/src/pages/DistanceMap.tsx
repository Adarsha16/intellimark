import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, MapPin, User } from 'lucide-react';
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
function BoundsHandler({ pos1, pos2 }: { pos1: { lat: number, lng: number } | null, pos2: { lat: number, lng: number } }) {
    const map = useMap();
    useEffect(() => {
        if (pos1 && pos2) {
            const bounds = L.latLngBounds([pos1, pos2]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (pos2) {
            map.setView(pos2, 15);
        }
    }, [pos1, pos2, map]);
    return null;
}

export default function DistanceMap() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const targetLat = parseFloat(searchParams.get('lat') || '0');
    const targetLng = parseFloat(searchParams.get('lng') || '0');
    const title = searchParams.get('title') || 'Target';

    const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
    const [distance, setDistance] = useState(0); // Calculated distance

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });

                // Distance Calc (Haversine)
                const R = 6371e3;
                const φ1 = pos.coords.latitude * Math.PI / 180;
                const φ2 = targetLat * Math.PI / 180;
                const Δφ = (targetLat - pos.coords.latitude) * Math.PI / 180;
                const Δλ = (targetLng - pos.coords.longitude) * Math.PI / 180;

                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                setDistance(Math.round(R * c));
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
    }, [targetLat, targetLng]);

    return (
        <div className="relative w-full h-screen bg-slate-100 flex flex-col">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-[500] w-[90%] flex justify-between pointer-events-none">
                <Button onClick={() => navigate(-1)} variant="outline" className="bg-white shadow pointer-events-auto">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="bg-white px-4 py-2 rounded-lg shadow font-mono text-sm font-bold border border-slate-200 pointer-events-auto">
                    {distance}m to destination
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
                        <>
                            <Marker position={myPos} opacity={0.8}>
                                <Popup>You</Popup>
                            </Marker>
                            <Polyline positions={[myPos, { lat: targetLat, lng: targetLng }]} color="blue" dashArray="10, 10" />
                        </>
                    )}

                    <BoundsHandler pos1={myPos} pos2={{ lat: targetLat, lng: targetLng }} />
                </MapContainer>
            </div>

            <div className="bg-white p-6 border-t border-slate-200 z-10 relative">
                <h3 className="font-bold text-lg mb-2">Navigation Started</h3>
                <p className="text-slate-500 text-sm">Path visualized. Switch to AR for camera guidance.</p>
                <Button className="w-full mt-4 bg-indigo-600 text-white gap-2" onClick={() => navigate(`/ar-view?lat=${targetLat}&lng=${targetLng}&title=${title}`)}>
                    <Navigation className="w-4 h-4" /> Switch to Live AR View
                </Button>
            </div>
        </div>
    );
}
