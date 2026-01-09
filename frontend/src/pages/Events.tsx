import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Imports from modules
import { useEvents } from '../hooks/useEvents';
import { type Event, type EventFormData, type SponsorMatch } from '../types';
import EventCard from '../components/events/EventCard';
import EventFormModal from '../components/events/EventFormModal';
import SponsorModal from '../components/events/SponsorModal';

export default function EventsPage() {
    // 1. Get Logic from Hook
    const { events, loading, generatingIds, createEvent, updateEvent, deleteEvent, generatePoster, findSponsors } = useEvents();

    // 2. Local View State (Modals)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const [isMatchOpen, setIsMatchOpen] = useState(false);
    const [matches, setMatches] = useState<SponsorMatch[]>([]);
    const [matchEventName, setMatchEventName] = useState('');

    // 3. Handlers
    const handleOpenCreate = () => {
        setEditingEvent(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (event: Event) => {
        setEditingEvent(event);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: EventFormData) => {
        if (editingEvent) {
            return await updateEvent(editingEvent.id, data);
        } else {
            return await createEvent(data);
        }
    };

    const handleMatch = async (event: Event) => {
        const loadId = toast.loading("Analyzing...");
        const result = await findSponsors(event.id);
        toast.dismiss(loadId);

        setMatches(result);
        setMatchEventName(event.title);
        setIsMatchOpen(true);
    };

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
            <Toaster position="top-right" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Events & Promotion</h1>
                    <p className="text-slate-500 mt-1">Manage club events and utilize AI to find partners.</p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2 shadow-lg">
                    <Plus className="w-4 h-4" /> Create Event
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {events.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                isGenerating={generatingIds.has(event.id)}
                                onEdit={handleOpenEdit}
                                onDelete={deleteEvent}
                                onGeneratePoster={generatePoster}
                                onMatch={handleMatch}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals */}
            <EventFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                isEditing={!!editingEvent}
                initialData={editingEvent ? {
                    title: editingEvent.title,
                    description: editingEvent.description,
                    location: editingEvent.location,
                    date: editingEvent.date,
                    capacity: editingEvent.capacity
                } : undefined}
            />

            <SponsorModal
                isOpen={isMatchOpen}
                onClose={() => setIsMatchOpen(false)}
                matches={matches}
                eventName={matchEventName}
            />
        </div>
    );
}