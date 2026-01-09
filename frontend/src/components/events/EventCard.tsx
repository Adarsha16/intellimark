import { Calendar, MapPin, Pencil, Trash2, Image as ImageIcon, Loader2, Handshake, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { motion } from 'framer-motion';
import { type Event } from '../../types';

interface EventCardProps {
    event: Event;
    isGenerating: boolean;
    onEdit: (event: Event) => void;
    onDelete: (id: number) => void;
    onGeneratePoster: (id: number) => void;
    onMatch: (event: Event) => void;
}

const API_BASE_URL = 'http://localhost:8000';

export default function EventCard({ event, isGenerating, onEdit, onDelete, onGeneratePoster, onMatch }: EventCardProps) {

    const getPosterUrl = (strategy?: string) => {
        if (!strategy || !strategy.includes("**Poster:**")) return null;
        return `${API_BASE_URL}${strategy.split('**Poster:** ')[1].trim()}`;
    };

    const posterUrl = getPosterUrl(event.marketing_strategy);

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
                    <Badge variant={event.status === 'Draft' ? 'warning' : 'success'}>{event.status}</Badge>
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
                </div>

                <div className="space-y-3 mt-auto">
                    {isGenerating ? (
                        <Button disabled variant="outline" className="w-full gap-2 border-violet-100 bg-violet-50 text-violet-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                        </Button>
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

            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <Button className="w-full gap-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white" onClick={() => onMatch(event)}>
                    <Handshake className="w-4 h-4" /> Find Sponsors (AI)
                </Button>
            </div>
        </motion.div>
    );
}