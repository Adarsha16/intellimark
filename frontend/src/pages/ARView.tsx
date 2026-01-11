import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, MapPin, Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function ARView() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const targetLat = parseFloat(searchParams.get('lat') || '0');
    const targetLng = parseFloat(searchParams.get('lng') || '0');
    const title = searchParams.get('title') || 'Target';

    const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
    const [bearing, setBearing] = useState(0); // Heading to target
    const [heading, setHeading] = useState(0); // Device heading
    const [distance, setDistance] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // 1. Camera Access
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => console.error("Camera error:", err));

        return () => {
            // Cleanup stream
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 2. Geolocation & Bearing Calculation
    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat1 = pos.coords.latitude;
                const lon1 = pos.coords.longitude;
                setMyPos({ lat: lat1, lng: lon1 });

                // Calculate Distance (Haversine)
                const R = 6371e3; // metres
                const φ1 = lat1 * Math.PI / 180;
                const φ2 = targetLat * Math.PI / 180;
                const Δφ = (targetLat - lat1) * Math.PI / 180;
                const Δλ = (targetLng - lon1) * Math.PI / 180;

                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                setDistance(Math.round(R * c));

                // Calculate Bearing
                const y = Math.sin(Δλ) * Math.cos(φ2);
                const x = Math.cos(φ1) * Math.sin(φ2) -
                    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
                const θ = Math.atan2(y, x);
                const brng = (θ * 180 / Math.PI + 360) % 360;
                setBearing(brng);
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        // Device Orientation (Simulated or Real)
        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (event.alpha) setHeading(event.alpha);
        };
        window.addEventListener('deviceorientation', handleOrientation);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [targetLat, targetLng]);

    // Derived AR Position
    // If heading matches bearing within ±30 deg, show target
    const angleDiff = ((bearing - heading + 540) % 360) - 180; // -180 to 180

    // Convert angleDiff to screen X percentage (approx FOV 60 deg)
    // 0 deg -> 50%, -30 deg -> 0%, +30 deg -> 100%
    const screenX = 50 + (angleDiff / 30) * 50;
    const isVisible = Math.abs(angleDiff) < 45;

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Camera Feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-80"
            />

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-50">
                <Button onClick={() => navigate(-1)} variant="outline" className="bg-white/80 backdrop-blur">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
            </div>

            {/* HUD Stats */}
            <div className="absolute top-4 right-4 z-50 bg-black/50 backdrop-blur rounded-lg p-3 text-white text-xs border border-white/20">
                <div className="font-bold flex items-center gap-2"><Navigation className="w-3 h-3 text-blue-400" /> {title}</div>
                <div className="mt-1">Dist: <span className="text-xl font-mono text-green-400">{distance}m</span></div>
                <div className="mt-1 text-slate-400">Brng: {bearing.toFixed(0)}°</div>
            </div>

            {/* AR Target Marker */}
            {isVisible && (
                <div
                    className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `${Math.max(10, Math.min(90, screenX))}%` }}
                >
                    <div className="bg-red-500 rounded-full p-2 animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                        <MapPin className="w-8 h-8 text-white fill-current" />
                    </div>
                    <div className="bg-white/90 px-3 py-1 rounded-full mt-2 font-bold shadow-lg text-sm text-slate-900">
                        {title}
                        <div className="text-[10px] font-normal text-slate-500 text-center">{distance}m away</div>
                    </div>
                </div>
            )}

            {/* Compass Strip at Bottom */}
            <div className="absolute bottom-10 left-0 w-full flex justify-center">
                <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/20 flex items-center gap-4">
                    <Compass className="w-5 h-5 text-slate-300" />
                    <div className="text-white font-mono">
                        {myPos ? `${heading.toFixed(0)}°` : 'Searching GPS...'}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${Math.abs(angleDiff) < 10 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
            </div>

            {/* Simulation Warning (for Desktop) */}
            <div className="absolute bottom-1 w-full text-center text-[10px] text-white/30 pointer-events-none">
                On Desktop? Sensors are simulated. Use Mobile for real AR.
            </div>
        </div>
    );
}
