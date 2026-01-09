import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { type EventFormData } from '../../types';

interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: EventFormData) => Promise<boolean>;
    initialData?: EventFormData;
    isEditing: boolean;
}

const DEFAULT_FORM: EventFormData = { title: '', description: '', location: '', date: '', capacity: 100 };

export default function EventFormModal({ isOpen, onClose, onSubmit, initialData, isEditing }: EventFormModalProps) {
    const [formData, setFormData] = useState<EventFormData>(DEFAULT_FORM);

    useEffect(() => {
        if (isOpen && initialData) setFormData(initialData);
        if (isOpen && !initialData) setFormData(DEFAULT_FORM);
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSubmit(formData);
        if (success) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100">
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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input className="w-full border p-2.5 rounded-lg" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
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