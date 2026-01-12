import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Pencil, Trash2, Image as ImageIcon, Loader2, Handshake, Users, Banknote, Building2, Map as MapIcon, Megaphone, Target, Navigation } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import { type Event } from '../../types';

interface EventCardProps {
    event: Event;
    generationStartTime?: number;
    onEdit: (event: Event) => void;
    onDelete: (id: number) => void;
    onGeneratePoster: (id: number) => void;
    onMatch: (event: Event) => void;
    onMarket: (event: Event) => void;
    onPredict: (event: Event) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function EventCard({ event, generationStartTime, onEdit, onDelete, onGeneratePoster, onMatch, onMarket, onPredict }: EventCardProps) {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing...");

    useEffect(() => {
        if (!generationStartTime) {
            setProgress(0);
            return;
        }

        // Poll for REAL progress
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/events/${event.id}/progress`);
                if (res.ok) {
                    const data = await res.json();
                    if (typeof data.progress === 'number') {
                        setProgress(data.progress);
                        setStatusText(data.message || "Processing...");

                        // Stop if done
                        if (data.progress >= 100) clearInterval(interval);
                    }
                }
            } catch (e) {
                console.error("Progress poll failed", e);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [generationStartTime, event.id]);

    const getPosterUrl = (strategy?: string) => {
        if (!strategy || !strategy.includes("**Poster:**")) return null;
        // Robust parsing: Split by marker, take the LAST part to ensure we get the latest generation
        // This handles cases where multiple poster lines might have accumulated.
        const parts = strategy.split('**Poster:**');
        const afterMarker = parts[parts.length - 1].trim();
        const urlPart = afterMarker.split('\n')[0].trim();
        return `${API_BASE_URL}${urlPart}`;
    };

    const posterUrl = getPosterUrl(event.marketing_strategy);

    const getTimeState = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) return { label: 'Ongoing', variant: 'info' };
        if (date > now) return { label: 'Upcoming', variant: 'primary' };
        return { label: 'Completed', variant: 'neutral' };
    };
    const timeState = getTimeState(event.date);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group"
        >
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500 w-full"></div>

            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                        <Badge variant={timeState.variant as any}>{timeState.label}</Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(event)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(event.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">{event.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">{event.description}</p>

                <div className="space-y-3 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center text-sm text-slate-700">
                        <Calendar className="w-4 h-4 mr-3 text-indigo-500" />
                        {new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="flex items-center text-sm text-slate-700">
                        <MapPin className="w-4 h-4 mr-3 text-indigo-500" />
                        {event.location}
                    </div>
                    <div className="flex items-center text-sm text-slate-700">
                        <Users className="w-4 h-4 mr-3 text-indigo-500" />
                        Capacity: {event.capacity}
                    </div>
                    {event.prize_pool && (
                        <div className="flex items-center text-sm text-slate-700">
                            <Banknote className="w-4 h-4 mr-3 text-indigo-500" />
                            Prize: {event.prize_pool}
                        </div>
                    )}
                    {event.organizer_name && (
                        <div className="flex items-center text-sm text-slate-700">
                            <Building2 className="w-4 h-4 mr-3 text-indigo-500" />
                            Org: {event.organizer_name}
                        </div>
                    )}
                </div>

                <div className="space-y-3 mt-auto">
                    {generationStartTime ? (
                        <div className="space-y-2">
                            <Button disabled variant="outline" className="w-full gap-2 border-violet-100 bg-violet-50 text-violet-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {statusText}
                            </Button>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full gap-2 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200" onClick={() => onGeneratePoster(event.id)}>
                            <ImageIcon className="w-4 h-4" />
                            {posterUrl ? 'Regenerate Poster' : 'Generate AI Poster'}
                        </Button>
                    )}

                    {posterUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group/image">
                            <img src={posterUrl} alt="AI Poster" className="w-full h-40 object-cover" />
                            <a href={posterUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity text-white text-xs">
                                View Full Size
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                {/* AR / Map Actions */}
                {(event.latitude && event.longitude) ? (
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            className="bg-white gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => navigate(`/distance-map?lat=${event.latitude}&lng=${event.longitude}&title=${encodeURIComponent(event.title)}`)}
                        >
                            <MapIcon className="w-4 h-4" /> Map
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2 border-none shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700"
                            onClick={() => navigate(`/ar-view?lat=${event.latitude}&lng=${event.longitude}&title=${encodeURIComponent(event.title)}`)}
                        >
                            <Navigation className="w-4 h-4" /> AR Nav
                        </Button>
                    </div>
                ) : (
                    <div className="text-[10px] text-center text-slate-400 py-1">
                        No GPS coordinates set
                    </div>
                )}

                <Button className="w-full gap-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white" onClick={() => onMatch(event)}>
                    <Handshake className="w-4 h-4" /> Find Sponsors (AI)
                </Button>
                <Button className="w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg border-none" onClick={() => onMarket(event)}>
                    <Megaphone className="w-4 h-4" /> Market Event (AI)
                </Button>
                <Button className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md hover:shadow-lg border-none" onClick={() => onPredict(event)}>
                    <Target className="w-4 h-4" /> Predict Success (AI)
                </Button>
            </div>
        </motion.div>
    );
}