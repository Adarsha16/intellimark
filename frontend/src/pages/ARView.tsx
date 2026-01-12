import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Loader2, Navigation, Compass, Camera, Zap, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

// A-Frame custom elements
const AScene: any = 'a-scene';
const AEntity: any = 'a-entity';
const ACamera: any = 'a-camera';
const AText: any = 'a-text';

const ARRIVAL_THRESHOLD = 15;
const SIGNAL_THRESHOLDS = {
    EXCELLENT: 20,
    GOOD: 50,
    FAIR: 100,
    POOR: 200,
};

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export default function ARView() {
    const [loading, setLoading] = useState(true);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [distance, setDistance] = useState<number | null>(null);
    const [bearing, setBearing] = useState<number>(0);
    const [heading, setHeading] = useState<number>(0);
    const [visualRotation, setVisualRotation] = useState<number>(0);
    const [hasArrived, setHasArrived] = useState(false);
    const [isTargeted, setIsTargeted] = useState(false);
    const [infoVisible, setInfoVisible] = useState(false);

    // Refs for smooth animation logic
    const prevRotation = useRef<number>(0);
    const lastHeading = useRef<number>(0);
    const lastBearing = useRef<number>(0);

    // Cleanup on unmount - ensure no black overlay persists
    useEffect(() => {
        // Store original body/html styles
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyMargin = document.body.style.margin;
        const originalBodyPadding = document.body.style.padding;
        const originalBodyBg = document.body.style.backgroundColor;

        // Set body styles for AR view
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        // Add class to body to identify AR is active
        document.body.classList.add('ar-active');
        document.documentElement.classList.add('ar-active');

        return () => {
            // Restore original styles on unmount
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.margin = originalBodyMargin;
            document.body.style.padding = originalBodyPadding;
            if (originalBodyBg) {
                document.body.style.backgroundColor = originalBodyBg;
            } else {
                document.body.style.backgroundColor = '';
            }

            // Remove AR active class
            document.body.classList.remove('ar-active');
            document.documentElement.classList.remove('ar-active');

            // Clean up any A-Frame scenes
            const aScenes = document.querySelectorAll('a-scene');
            aScenes.forEach(scene => {
                if (scene.parentNode) {
                    scene.parentNode.removeChild(scene);
                }
            });

            // Force a repaint to ensure styles are applied
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
        };
    }, []);

    const params = new URLSearchParams(window.location.search);
    const targetLat = parseFloat(params.get('lat') || '0');
    const targetLng = parseFloat(params.get('lng') || '0');
    const title = params.get('title') || 'Target';

    // Haversine formula for distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Bearing calculation
    const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const radLat1 = lat1 * Math.PI / 180;
        const radLat2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const y = Math.sin(Δλ) * Math.cos(radLat2);
        const x = Math.cos(radLat1) * Math.sin(radLat2) -
            Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(Δλ);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };

    const getCardinalDirection = (angle: number) => {
        return CARDINAL_DIRECTIONS[Math.round(angle / 45) % 8];
    };

    const getSignalLevel = (dist: number | null) => {
        if (dist === null) return 0;
        if (dist < SIGNAL_THRESHOLDS.EXCELLENT) return 5;
        if (dist < SIGNAL_THRESHOLDS.GOOD) return 4;
        if (dist < SIGNAL_THRESHOLDS.FAIR) return 3;
        if (dist < SIGNAL_THRESHOLDS.POOR) return 2;
        return 1;
    };

    const requestPermissions = async () => {
        try {
            await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                if (response !== 'granted') throw new Error('Orientation permission denied');
            }

            setPermissionGranted(true);
            setLoading(false);
        } catch (err) {
            console.error(err);
            alert("Permissions required for AR navigation.");
        }
    };

    // Sensor Smoothing & Rotation logic
    useEffect(() => {
        if (!permissionGranted) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newDist = calculateDistance(latitude, longitude, targetLat, targetLng);
                const newBear = calculateBearing(latitude, longitude, targetLat, targetLng);

                // Low pass filter for bearing
                const smoothedBear = lastBearing.current * 0.7 + newBear * 0.3;
                lastBearing.current = smoothedBear;

                // setUserCoords({ lat: latitude, lng: longitude }); // Removed unused state
                setDistance(newDist);
                setBearing(smoothedBear);

                if (newDist < ARRIVAL_THRESHOLD) {
                    setHasArrived(true);
                } else {
                    setHasArrived(false);
                }
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        const handleOrientation = (event: DeviceOrientationEvent) => {
            const rawHeading = (event as any).webkitCompassHeading || Math.abs(event.alpha! - 360);

            // Low pass filter for heading
            const smoothedHeading = lastHeading.current * 0.8 + rawHeading * 0.2;
            lastHeading.current = smoothedHeading;
            setHeading(smoothedHeading);
        };

        window.addEventListener('deviceorientation', handleOrientation);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [permissionGranted, targetLat, targetLng]);

    // Shortest-path rotation effect for arrow and "targeting" detection
    useEffect(() => {
        const rawTarget = (bearing - heading + 360) % 360;

        // Calculate the difference between current and target
        let delta = rawTarget - (prevRotation.current % 360);

        // Normalize delta to -180 to 180 range (shortest path)
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        const newRotation = prevRotation.current + delta;
        prevRotation.current = newRotation;
        setVisualRotation(newRotation);

        // Detect if pointing at target (within 15 degrees)
        const angleDiff = Math.abs(delta);
        if (angleDiff < 15) {
            setIsTargeted(true);
        } else {
            setIsTargeted(false);
        }
    }, [bearing, heading]);

    if (!permissionGranted) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center relative shadow-2xl">
                        <Navigation className="w-12 h-12 text-white animate-bounce" />
                    </div>
                </div>
                <h1 className="text-3xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">AR COMMANDER</h1>
                <p className="text-slate-400 mb-10 max-w-xs leading-relaxed">
                    Unlock professional-grade spatial navigation with real-time AR tracking.
                </p>
                <Button onClick={requestPermissions} className="w-full max-w-xs py-8 text-xl font-black gap-3 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] bg-gradient-to-r from-indigo-600 to-purple-600 border-none ring-2 ring-indigo-400/20 group hover:scale-[1.02] active:scale-95 transition-all">
                    <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform" /> INITIALIZE SENSORS
                </Button>
            </div>
        );
    }

    const signalLevel = getSignalLevel(distance);

    return (
        <div className="fixed inset-0 bg-black touch-none overflow-hidden" style={{ isolation: 'isolate' }}>
            {loading && (
                <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-white">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-6" />
                        <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
                    </div>
                    <p className="font-bold tracking-widest text-sm opacity-50 uppercase">Syncing Spatial Data</p>
                </div>
            )}

            {/* A-Frame AR Scene */}
            <AScene
                vr-mode-ui="enabled: false"
                embedded
                arjs="sourceType: webcam; debugUIEnabled: false; videoTexture: true; trackingMethod: best;"
                renderer="antialias: true; alpha: true; precision: high; logarithmicDepthBuffer: true"
                cursor="rayOrigin: mouse"
                raycaster="objects: .clickable"
            >
                <ACamera gps-camera="minDistance: 1; positionMinAccuracy: 100;" rotation-reader>
                    {/* Viewport-Locked Holographic Navigation Arrow */}
                    {!hasArrived && distance && (
                        <AEntity
                            id="nav-arrow"
                            position="0 -0.5 -1.2"
                            rotation={`-90 0 ${visualRotation}`}
                            scale={isTargeted ? "1.2 1.2 1.2" : "1 1 1"}
                            animation={`property: scale; dur: 300; easing: easeOutQuad; to: ${isTargeted ? '1.2 1.2 1.2' : '1 1 1'}`}
                        >
                            {/* Inner Core */}
                            <AEntity
                                geometry="primitive: cylinder; height: 0.2; radius: 0.02"
                                material={`color: ${isTargeted ? '#818cf8' : '#f4c542'}; emissive: ${isTargeted ? '#6366f1' : '#f4c542'}; emissiveIntensity: 1`}
                            />
                            {/* Outer Secondary Shell */}
                            <AEntity
                                geometry="primitive: cylinder; height: 0.22; radius: 0.05"
                                material={`color: ${isTargeted ? '#4f46e5' : '#f4c542'}; opacity: 0.4; transparent: true; metalness: 0.8; roughness: 0.1`}
                                animation="property: rotation; to: 0 360 0; dur: 2000; loop: true; easing: linear"
                            />
                            {/* Arrowhead */}
                            <AEntity
                                geometry="primitive: cone; radius-bottom: 0.1; radius-top: 0; height: 0.15"
                                position="0 0.18 0"
                                material={`color: ${isTargeted ? '#6366f1' : '#f4c542'}; emissive: ${isTargeted ? '#818cf8' : '#c99a1f'}; emissiveIntensity: 0.8`}
                                animation="property: position; to: 0 0.2 0; dur: 1000; dir: alternate; loop: true; easing: easeInOutSine"
                            />
                            {/* Energy Rings around Arrow */}
                            <AEntity
                                geometry="primitive: torus; radius: 0.08; radius-tubular: 0.005"
                                rotation="90 0 0"
                                position="0 0.05 0"
                                material={`color: ${isTargeted ? '#818cf8' : '#fcd34d'}; opacity: 0.6; transparent: true`}
                                animation="property: scale; from: 0.5 0.5 0.5; to: 1.5 1.5 1.5; dur: 1000; loop: true; easing: linear"
                                animation__fade="property: material.opacity; from: 0.6; to: 0; dur: 1000; loop: true; easing: linear"
                            />
                        </AEntity>
                    )}
                </ACamera>

                {targetLat && targetLng && (
                    <AEntity gps-entity-place={`latitude: ${targetLat}; longitude: ${targetLng};`}>
                        {/* Interactive 3D Crystal Marker */}
                        <AEntity position="0 8 0">
                            {/* The Crystal */}
                            <AEntity
                                class="clickable"
                                geometry="primitive: octahedron; radius: 3.5"
                                material={`color: ${isTargeted ? '#34d399' : '#10b981'}; metalness: 0.9; roughness: 0.1; emissive: ${isTargeted ? '#10b981' : '#059669'}; emissiveIntensity: ${isTargeted ? 2 : 1}`}
                                animation="property: rotation; to: 0 360 360; dur: 8000; easing: linear; loop: true"
                                animation__hover="property: scale; from: 1 1 1; to: 1.1 1.1 1.1; dur: 1500; dir: alternate; loop: true; easing: easeInOutSine"
                                onClick={() => {
                                    setInfoVisible(!infoVisible);
                                }}
                            />

                            {/* Orbital Concentric Rings */}
                            {[1, 2, 3].map((i) => (
                                <AEntity
                                    key={i}
                                    geometry={`primitive: torus; radius: ${3.8 + i * 0.5}; radius-tubular: 0.02`}
                                    material={`color: #34d399; opacity: ${0.4 / i}; transparent: true; emissive: #10b981; emissiveIntensity: 0.5`}
                                    rotation={`${Math.random() * 360} ${Math.random() * 360} ${Math.random() * 360}`}
                                    animation={`property: rotation; to: ${Math.random() > 0.5 ? 360 : -360} 360 360; dur: ${4000 + i * 2000}; easing: linear; loop: true`}
                                />
                            ))}

                            {/* Ground Dynamic Pulse Assembly */}
                            <AEntity position="0 -8 0">
                                {[1, 2, 3, 4].map((i) => (
                                    <AEntity
                                        key={i}
                                        geometry={`primitive: ring; radiusInner: ${3.5 + i * 0.2}; radiusOuter: ${3.7 + i * 0.2}`}
                                        rotation="-90 0 0"
                                        material={`color: #10b981; shader: flat; opacity: ${0.8 / i}; side: double; transparent: true`}
                                        animation={`property: scale; from: 1 1 1; to: ${2 + i}; dur: ${1500 + i * 500}; loop: true; easing: easeOutQuad`}
                                        animation__fade={`property: material.opacity; from: ${0.8 / i}; to: 0; dur: ${1500 + i * 500}; loop: true; easing: easeOutQuad`}
                                    />
                                ))}
                            </AEntity>

                            {/* Floating Information Label */}
                            <AEntity
                                position="0 7 0"
                                look-at="[gps-camera]"
                                scale={infoVisible ? "1.2 1.2 1.2" : "1 1 1"}
                                animation="property: position; to: 0 7.5 0; dur: 2000; dir: alternate; loop: true; easing: easeInOutSine"
                            >
                                <AText
                                    value={title}
                                    align="center"
                                    color="#ffffff"
                                    width="25"
                                    font="roboto"
                                    wrap-count="20"
                                />
                                {infoVisible && (
                                    <AEntity
                                        position="0 -2 0"
                                        geometry="primitive: plane; width: 8; height: 2"
                                        material="color: #000000; opacity: 0.7; transparent: true; shader: flat"
                                    >
                                        <AText
                                            value="Event location targeted.\nClick to view details."
                                            align="center"
                                            color="#10b981"
                                            width="7"
                                            position="0 0 0.1"
                                        />
                                    </AEntity>
                                )}
                            </AEntity>
                        </AEntity>
                    </AEntity>
                )}
            </AScene>

            {/* Premium Navigation HUD */}
            <div className="absolute top-0 left-0 right-0 z-[60] p-6 pointer-events-none">
                <div className="max-w-xl mx-auto flex flex-col gap-4">
                    {/* Main Bar */}
                    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 flex items-center justify-between pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top duration-700">
                        <div className="flex items-center gap-5 border-r border-white/5 pr-6 flex-1 hover:translate-y-[-2px] transition-transform">
                            <div className={`p-3 rounded-2xl transition-colors duration-500 ${isTargeted ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-white/5'}`}>
                                <Navigation className={`w-6 h-6 ${isTargeted ? 'text-white' : 'text-indigo-400'}`} />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black mb-1">Range</div>
                                <div className="text-xl font-black text-white tabular-nums tracking-tight">
                                    {distance ? `${Math.round(distance)}` : '--'}<span className="text-xs ml-1 text-white/40 uppercase">Mtrs</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 px-6 border-r border-white/5 flex-1 hover:translate-y-[-2px] transition-transform">
                            <div className="bg-white/5 p-3 rounded-2xl group">
                                <Compass className="w-6 h-6 text-emerald-400 group-hover:rotate-[360deg] transition-transform duration-1000" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black mb-1">Bearing</div>
                                <div className="text-xl font-black text-white tracking-widest">{getCardinalDirection(bearing)}</div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center px-6 flex-1">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black mb-2">Signal</div>
                            <div className="flex items-end gap-1.5 h-6">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div
                                        key={i}
                                        className={`w-2 rounded-full transition-all duration-500 ${i <= signalLevel ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 'bg-white/10'}`}
                                        style={{ height: `${30 + i * 15}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Secondary Status Badges */}
                    <div className="flex justify-center gap-3 animate-in fade-in zoom-in duration-1000 delay-300">
                        {isTargeted && (
                            <div className="bg-indigo-500 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg animate-pulse">
                                <Zap className="w-3 h-3 fill-white" /> Target Locked
                            </div>
                        )}
                        <div className="bg-white/10 backdrop-blur-md text-white/60 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/5">
                            Sensor: {Math.round(heading)}°
                        </div>
                    </div>
                </div>
            </div>

            {/* Arrival Banner - Full Premium Overhaul */}
            {hasArrived && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-500">
                    <div className="relative max-w-sm w-full">
                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full scale-150 animate-pulse" />

                        <div className="relative bg-slate-900 border border-emerald-500/30 p-10 rounded-[3rem] shadow-[0_50px_100px_rgba(16,185,129,0.3)] text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-white mb-3 tracking-tighter italic">ARRIVAL SUCCESS</h2>
                            <p className="text-emerald-400 font-mono text-[10px] uppercase tracking-[0.5em] mb-8 font-bold">Waypoint Reached</p>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2">Location Identifier</p>
                                <p className="text-white font-black text-2xl truncate">{title}</p>
                            </div>

                            <Button
                                onClick={() => window.history.back()}
                                className="w-full py-8 text-lg font-black bg-emerald-500 hover:bg-emerald-400 text-white rounded-[1.5rem] shadow-[0_20px_40px_rgba(16,185,129,0.4)] border-none transition-all active:scale-95"
                            >
                                BACK
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Navigation Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-[50] p-8 pointer-events-none flex justify-between items-end animate-in slide-in-from-bottom duration-700">
                <button
                    onClick={() => window.history.back()}
                    className="pointer-events-auto bg-black/40 hover:bg-black/60 backdrop-blur-2xl p-6 rounded-[2rem] text-white transition-all border border-white/10 shadow-2xl active:scale-90 group"
                >
                    <ArrowLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="pointer-events-auto bg-indigo-600/90 backdrop-blur-2xl p-7 rounded-[2.5rem] text-white shadow-[0_30px_60px_rgba(79,70,229,0.5)] border border-indigo-400/30 border-b-8 border-indigo-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-ping" />
                        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-indigo-200">Active Node</span>
                    </div>
                    <div className="font-black text-2xl leading-none tracking-tighter mb-1">{title}</div>
                    <div className="text-[10px] text-white/50 font-mono tracking-widest">SEQ-NAV.v1.0.4</div>
                </div>
            </div>
        </div>
    );
}
