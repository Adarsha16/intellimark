import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import api from '../services/api';

// Imports from modules
import { useEvents } from '../hooks/useEvents';
import { type Event, type EventFormData, type SponsorMatch } from '../types';
import EventCard from '../components/events/EventCard';
import EventFormModal from '../components/events/EventFormModal';
import SponsorModal from '../components/events/SponsorModal';
import MarketingModal from '../components/events/MarketingModal';
import PredictionModal from '../components/events/PredictionModal';

export default function EventsPage() {
    // 1. Get Logic from Hook
    const { events, loading, generatingTasks, createEvent, updateEvent, deleteEvent, generatePoster, findSponsors, generateMarketing, fetchEvents } = useEvents();

    // 2. Local View State (Modals)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const [isMatchOpen, setIsMatchOpen] = useState(false);
    const [matches, setMatches] = useState<SponsorMatch[]>([]);
    const [matchEventName, setMatchEventName] = useState('');

    const [isMarketingOpen, setIsMarketingOpen] = useState(false);
    const [marketingData, setMarketingData] = useState<any | null>(null);
    const [marketingLoading, setMarketingLoading] = useState(false);
    const [marketingEventName, setMarketingEventName] = useState('');

    const [isPredictOpen, setIsPredictOpen] = useState(false);
    const [predictionData, setPredictionData] = useState<any | null>(null);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [predictionEventName, setPredictionEventName] = useState('');
    const [predictionEventId, setPredictionEventId] = useState<number | null>(null);

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

    const handleMarket = async (event: Event) => {
        setMarketingEventName(event.title);
        setMarketingData(null);
        setMarketingLoading(true);
        setIsMarketingOpen(true);

        // Call AI Service
        const data = await generateMarketing(event.id);

        setMarketingLoading(false);
        if (data) {
            setMarketingData(data);
        } else {
            setIsMarketingOpen(false); // Close on fail
        }
    };

    const handlePredict = async (event: Event) => {
        setPredictionEventName(event.title);
        setPredictionEventId(event.id);
        setPredictionData(null);
        setPredictionLoading(true);
        setIsPredictOpen(true);

        try {
            const res = await api.get(`/predict/${event.id}`);
            setPredictionData(res.data);
        } catch (err) {
            toast.error('Prediction failed');
            setIsPredictOpen(false);
        } finally {
            setPredictionLoading(false);
        }
    };

    const handleOptimizationComplete = async () => {
        await fetchEvents(); // Update list
        // Re-run prediction
        if (predictionEventId) {
            setPredictionLoading(true);
            try {
                const res = await api.get(`/predict/${predictionEventId}`);
                setPredictionData(res.data);

                // Update title in modal if possible? 
                // The modal uses 'predictionEventName'. We should update that too.
                const updatedEvent = (await api.get('/events/')).data.find((e: Event) => e.id === predictionEventId);
                if (updatedEvent) setPredictionEventName(updatedEvent.title);

            } catch (e) {
                toast.error("Failed to refresh prediction");
            } finally {
                setPredictionLoading(false);
            }
        }
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
                                generationStartTime={generatingTasks[event.id]}
                                onEdit={handleOpenEdit}
                                onDelete={deleteEvent}
                                onGeneratePoster={generatePoster}
                                onMatch={handleMatch}
                                onMarket={handleMarket}
                                onPredict={handlePredict}
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
                    capacity: editingEvent.capacity,
                    prize_pool: editingEvent.prize_pool,
                    organizer_name: editingEvent.organizer_name
                } : undefined}
            />

            <SponsorModal
                isOpen={isMatchOpen}
                onClose={() => setIsMatchOpen(false)}
                matches={matches}
                eventName={matchEventName}
            />

            <MarketingModal
                isOpen={isMarketingOpen}
                onClose={() => setIsMarketingOpen(false)}
                marketingData={marketingData}
                isLoading={marketingLoading}
                eventName={marketingEventName}
            />

            <PredictionModal
                isOpen={isPredictOpen}
                onClose={() => setIsPredictOpen(false)}
                prediction={predictionData}
                isLoading={predictionLoading}
                eventName={predictionEventName}
                eventId={predictionEventId}
                onOptimizationComplete={handleOptimizationComplete}
            />
        </div>
    );
}