import { useState, useEffect } from 'react';
import api from '../services/api'; // Adjust path to your api service
import toast from 'react-hot-toast';
import { type Event, type EventFormData, type SponsorMatch } from '../types';

export function useEvents() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events/');
            setEvents(res.data);
        } catch (error) {
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvents(); }, []);

    const createEvent = async (data: EventFormData) => {
        const toastId = toast.loading("Creating event...");
        try {
            await api.post('/events/', data);
            toast.success("Event created!", { id: toastId });
            fetchEvents();
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
            fetchEvents();
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
        setGeneratingIds(prev => new Set(prev).add(id));
        toast.success("AI Generation started... (approx 30s)");

        try {
            await api.post(`/events/${id}/generate-poster`);

            // Poll logic
            const intervalId = setInterval(async () => {
                const res = await api.get('/events/');
                const target = res.data.find((e: Event) => e.id === id);
                if (target?.marketing_strategy?.includes("**Poster:**")) {
                    clearInterval(intervalId);
                    setGeneratingIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    setEvents(res.data); // Update list with new image
                    toast.success("Poster generated!", { icon: '🎨' });
                }
            }, 3000);

            // Timeout after 60s
            setTimeout(() => {
                clearInterval(intervalId);
                setGeneratingIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    return next;
                });
            }, 60000);

        } catch (err) {
            toast.error("Failed to start generation");
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
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

    return {
        events,
        loading,
        generatingIds,
        createEvent,
        updateEvent,
        deleteEvent,
        generatePoster,
        findSponsors
    };
}