import { useEffect, useState } from 'react';
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

export default function EventFormModal({ isOpen, onClose, onSubmit, initialData, isEditing }: EventFormModalProps) {
    const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM);
    const [showMap, setShowMap] = useState(false);

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

    const grabLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        toast.promise(
            new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setFormData(prev => ({
                            ...prev,
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        }));
                        resolve(pos);
                    },
                    (err) => reject(err)
                );
            }),
            {
                loading: 'Getting coordinates...',
                success: 'Location captured!',
                error: 'Could not get location.',
            }
        );
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
                                    onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                                />
                                <p className="text-[10px] text-slate-400 italic">Click map to set coordinates.</p>
                            </div>
                        ) : (
                            <Button type="button" variant="outline" onClick={grabLocation} className="w-full gap-2 text-xs">
                                <Target className="w-3 h-3" /> Use My Current GPS Location
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