import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { type Event, type EventFormData, type SponsorMatch } from '../types';

interface EventsContextType {
    events: Event[];
    loading: boolean;
    generatingTasks: Record<number, number>; // eventId -> startTime (timestamp)
    createEvent: (data: EventFormData) => Promise<boolean>;
    updateEvent: (id: number, data: EventFormData) => Promise<boolean>;
    deleteEvent: (id: number) => Promise<void>;
    generatePoster: (id: number) => Promise<void>;
    findSponsors: (id: number) => Promise<SponsorMatch[]>;
    fetchEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    // Persist generation start times: eventId -> timestamp
    const [generatingTasks, setGeneratingTasks] = useState<Record<number, number>>({});

    const fetchEvents = useCallback(async () => {
        try {
            const res = await api.get('/events/');
            setEvents(res.data);
            return res.data;
        } catch (error) {
            console.error(error);
            toast.error("Failed to load events");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const createEvent = async (data: EventFormData) => {
        const toastId = toast.loading("Creating event...");
        try {
            await api.post('/events/', data);
            toast.success("Event created!", { id: toastId });
            await fetchEvents();
            return true;
        } catch (err) {
            toast.error("Failed to create event", { id: toastId });
            return false;
        }
    };

    const updateEvent = async (id: number, data: EventFormData) => {
        const toastId = toast.loading("Updating event...");
        try {
            await api.put(`/events/${id}`, data);
            toast.success("Event updated!", { id: toastId });
            await fetchEvents();
            return true;
        } catch (err) {
            toast.error("Failed to update event", { id: toastId });
            return false;
        }
    };

    const deleteEvent = async (id: number) => {
        if (!confirm("Delete this event?")) return;
        try {
            await api.delete(`/events/${id}`);
            setEvents(prev => prev.filter(e => e.id !== id));
            toast.success("Event deleted");
        } catch (err) {
            toast.error("Failed to delete event");
        }
    };

    const generatePoster = async (id: number) => {
        // 1. Get current poster state (to know when it changes)
        const currentEvent = events.find(e => e.id === id);
        const initialStrategy = currentEvent?.marketing_strategy || "";

        // 2. Mark start time
        setGeneratingTasks(prev => ({ ...prev, [id]: Date.now() }));
        toast.success("AI Generation started... (approx 45s)");

        try {
            await api.post(`/events/${id}/generate-poster`);

            // 3. Poll until logic
            const intervalId = setInterval(async () => {
                try {
                    // Silent fetch to check status
                    const res = await api.get('/events/');
                    const updatedList = res.data;
                    const target = updatedList.find((e: Event) => e.id === id);

                    if (!target) {
                        clearInterval(intervalId);
                        return;
                    }

                    const newStrategy = target.marketing_strategy || "";

                    // CHECK: Has the strategy changed? AND does it have a poster?
                    // We compare with initial state. If initial had a poster, we wait for it to CHANGE (different URL or timestamp).
                    // Since backend appends/overwrites, simple string inequality + existence check is usually enough.
                    // To be robust: If initial had poster, we wait for newStrategy != initialStrategy

                    const hasNewData = newStrategy !== initialStrategy && newStrategy.includes("**Poster:**");

                    if (hasNewData) {
                        clearInterval(intervalId);

                        // Remove from tracking
                        setGeneratingTasks(prev => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                        });

                        setEvents(updatedList);
                        toast.success("Poster generated!", { icon: '🎨' });
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);

            // Timeout after 5 minutes (300s)
            // Timeout Removed: User requested infinite wait
            // The generation will only stop if the user refreshes or the interval is cleared by success.

        } catch (err) {
            console.error(err);
            toast.error("Failed to start generation");
            setGeneratingTasks(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const findSponsors = async (id: number): Promise<SponsorMatch[]> => {
        try {
            const res = await api.get<SponsorMatch[]>(`/events/${id}/match-sponsors`);
            return res.data;
        } catch (err) {
            toast.error("Failed to calculate matches");
            return [];
        }
    };

    return (
        <EventsContext.Provider value={{
            events,
            loading,
            generatingTasks,
            createEvent,
            updateEvent,
            deleteEvent,
            generatePoster,
            findSponsors,
            fetchEvents
        }}>
            {children}
        </EventsContext.Provider>
    );
}

export function useEvents() {
    const context = useContext(EventsContext);
    if (context === undefined) {
        throw new Error('useEvents must be used within an EventsProvider');
    }
    return context;
}
