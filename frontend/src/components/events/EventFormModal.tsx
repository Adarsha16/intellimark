import { useEffect, useState, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { type EventFormData } from '../../types';
import { formatDateForInput } from '../../utils/dateUtils';
import { Map as MapIcon, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../MapPicker';

interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: EventFormData) => Promise<boolean>;
    initialData?: EventFormData;
    isEditing: boolean;
}

const DEFAULT_FORM: EventFormData = {
    title: '',
    description: '',
    location: '',
    date: '',
    capacity: 100,
    prize_pool: '',
    organizer_name: '',
    latitude: 0,
    longitude: 0
};

// Module-level lock to prevent StrictMode double-invocation issues
let geoLockActive = false;

export default function EventFormModal({ isOpen, onClose, onSubmit, initialData, isEditing }: EventFormModalProps) {
    const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM);
    const [showMap, setShowMap] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    // Ref for synchronous locking

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                ...initialData,
                date: formatDateForInput(initialData.date),
                latitude: initialData.latitude || 0,
                longitude: initialData.longitude || 0
            });
        }
        if (isOpen && !initialData) setFormData(DEFAULT_FORM);
    }, [isOpen, initialData]);

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (res.ok) {
                const data = await res.json();
                // Construct a nice address string
                // Preference: display_name is usually long, address parts might be better?
                // Using display_name is simplest for now, maybe taking first 2 parts?
                // Let's take the full display_name but maybe truncate or rely on user to edit.
                // Usually "Building, Road, Suburb" is best.
                // Nominatim 'display_name' is very verbose. `address` object has specific fields.
                // Let's try to get specific parts if available.
                const addr = data.address || {};
                const shortLoc = [
                    addr.building || addr.shop || addr.amenity || addr.tourism,
                    addr.road,
                    addr.suburb || addr.city || addr.town
                ].filter(Boolean).join(", ");

                const finalLoc = shortLoc || data.display_name || "";

                if (finalLoc) {
                    setFormData(prev => ({ ...prev, location: finalLoc }));
                }
            }
        } catch (e) {
            console.error("Reverse geocode failed", e);
        }
    };

    const grabLocation = async () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        if (geoLockActive) return;

        geoLockActive = true;
        setIsLoadingLocation(true);
        toast.dismiss();
        const toastId = toast.loading("Getting your location...");

        // Helper to attempt geolocation
        const attemptGeolocation = (isRetry: boolean = false): void => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    if (!geoLockActive) return;

                    const { latitude, longitude, accuracy } = pos.coords;
                    console.log(`[GEO] Acquired location: ${latitude}, ${longitude} (Accuracy: ${Math.round(accuracy)}m)`);

                    setFormData(prev => ({
                        ...prev,
                        latitude: latitude,
                        longitude: longitude
                    }));

                    // Warn if accuracy is poor (e.g. keying off IP implementation which is usually > 5000m)
                    // GPS is usually < 50m. WiFi is ~100-500m.
                    if (accuracy > 1000) {
                        toast("Location accuracy is low (" + Math.round(accuracy) + "m). You might want to adjust it on the map.", {
                            icon: '⚠️',
                            duration: 5000,
                        });
                    }

                    // Silent reverse geocode
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        if (res.ok) {
                            const data = await res.json();
                            const addr = data.address || {};
                            const shortLoc = [
                                addr.building || addr.shop || addr.amenity || addr.tourism,
                                addr.road,
                                addr.suburb || addr.city || addr.town
                            ].filter(Boolean).join(", ");
                            const finalLoc = shortLoc || data.display_name || "";

                            if (finalLoc) {
                                setFormData(prev => ({ ...prev, location: finalLoc }));
                            }
                        }
                    } catch (err) {
                        console.error("Address lookup failed", err);
                    }

                    toast.dismiss(toastId);
                    if (accuracy <= 1000) toast.success("Location captured!");
                    geoLockActive = false;
                    setIsLoadingLocation(false);
                },
                (err) => {
                    // If PERMISSION_DENIED on first attempt, retry after delay
                    if (err.code === 1 && !isRetry) {
                        toast.dismiss(toastId);
                        const retryToastId = toast.loading("Waiting for location permission...");
                        setTimeout(() => {
                            toast.dismiss(retryToastId);
                            attemptGeolocation(true);
                        }, 2000);
                        return;
                    }

                    if (!geoLockActive) return;

                    console.error("Geolocation error:", err);
                    toast.dismiss(toastId);

                    let msg = "Could not get location.";
                    if (err.code === 1) msg = "Please allow location access in your browser.";
                    if (err.code === 2) msg = "Position unavailable.";
                    if (err.code === 3) msg = "Location request timed out.";

                    toast.error(msg);
                    geoLockActive = false;
                    setIsLoadingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
            );
        };

        // Start the first attempt
        attemptGeolocation(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSubmit(formData);
        if (success) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 my-8">
                <h2 className="text-xl font-bold mb-6">{isEditing ? "Edit Event" : "Create New Event"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input className="w-full border p-2.5 rounded-lg" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea className="w-full border p-2.5 rounded-lg h-24" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input className="w-full border p-2.5 rounded-lg" type="datetime-local" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                            <input className="w-full border p-2.5 rounded-lg" type="number" required value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                        </div>
                    </div>

                    {/* LOCATION SECTION */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-700">Location & Coordinates</label>

                        <input
                            className="w-full border p-2.5 rounded-lg bg-white"
                            placeholder="Location Name (e.g. Hall A)"
                            required
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />

                        {/* Coordinate Picker UI */}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={!showMap ? 'primary' : 'outline'}
                                onClick={() => setShowMap(false)}
                                className="flex-1 gap-2 text-xs h-8"
                            >
                                <Target className="w-3 h-3" /> Auto / Manual
                            </Button>
                            <Button
                                type="button"
                                variant={showMap ? 'primary' : 'outline'}
                                onClick={() => setShowMap(true)}
                                className="flex-1 gap-2 text-xs h-8"
                            >
                                <MapIcon className="w-3 h-3" /> Map Pick
                            </Button>
                        </div>

                        {showMap ? (
                            <div className="space-y-2 animate-in fade-in">
                                <label className="text-[10px] uppercase font-bold text-slate-400">Pick on Map</label>
                                <MapPicker
                                    lat={formData.latitude || 0}
                                    lng={formData.longitude || 0}
                                    onChange={(lat, lng) => {
                                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                                        reverseGeocode(lat, lng);
                                    }}
                                />
                                <p className="text-[10px] text-slate-400 italic">Click map to set coordinates.</p>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={grabLocation}
                                disabled={isLoadingLocation}
                                className="w-full gap-2 text-xs disabled:opacity-50 disabled:cursor-wait"
                            >
                                <Target className={`w-3 h-3 ${isLoadingLocation ? 'animate-pulse' : ''}`} />
                                {isLoadingLocation ? 'Locating...' : 'Use My Current GPS Location'}
                            </Button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Lat</label>
                                <input
                                    className="w-full border p-2 rounded text-xs"
                                    type="number" step="any" placeholder="0.0000"
                                    value={formData.latitude || ''}
                                    onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400">Lng</label>
                                <input
                                    className="w-full border p-2 rounded text-xs"
                                    type="number" step="any" placeholder="0.0000"
                                    value={formData.longitude || ''}
                                    onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Official Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organizer Name (Optional)</label>
                            <input className="w-full border p-2.5 rounded-lg" placeholder="e.g. IntelliMark Gaming" value={formData.organizer_name || ''} onChange={e => setFormData({ ...formData, organizer_name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prize Pool / Perks</label>
                            <input className="w-full border p-2.5 rounded-lg" placeholder="e.g. $10,000 Cash" value={formData.prize_pool || ''} onChange={e => setFormData({ ...formData, prize_pool: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">{isEditing ? "Save Changes" : "Create Event"}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}