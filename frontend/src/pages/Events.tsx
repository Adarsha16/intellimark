import { useEffect, useState } from 'react';
import api from '../services/api';
import { Calendar, MapPin, Users, Plus, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Events() {
    const [events, setEvents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '', description: '', location: '', date: '', capacity: 100
    });

    const fetchEvents = async () => {
        const res = await api.get('/events/');
        setEvents(res.data);
    };

    useEffect(() => { fetchEvents(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/events/', formData);
            toast.success("Event created!");
            setIsModalOpen(false);
            fetchEvents();
        } catch (err) {
            toast.error("Failed to create event");
        }
    };

    const generateStrategy = async (id: number) => {
        const loadId = toast.loading("AI is analyzing marketing trends...");
        try {
            const res = await api.post(`/events/${id}/generate-strategy`);
            toast.dismiss(loadId);
            toast.success("Strategy Generated!", { icon: '✨' });

            // Update local state to show the new strategy immediately
            setEvents(events.map(ev => ev.id === id ? { ...ev, marketing_strategy: res.data.strategy } : ev));
        } catch (err) {
            toast.dismiss(loadId);
            toast.error("AI Service Unavailable");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Events & Promotion</h1>
                    <p className="text-slate-500">Manage club events and generate AI marketing plans.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Create Event
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
                        >
                            {/* Event Date Header */}
                            <div className="h-2 bg-indigo-500 w-full"></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge variant={event.status === 'Draft' ? 'warning' : 'success'}>{event.status}</Badge>
                                    <span className="text-xs font-medium text-slate-400">
                                        {new Date(event.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2">{event.title}</h3>
                                <p className="text-slate-500 text-sm line-clamp-2 mb-4">{event.description}</p>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                                        {new Date(event.date).toLocaleString()}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                                        {event.location}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Users className="w-4 h-4 mr-2 text-indigo-500" />
                                        Max {event.capacity} Attendees
                                    </div>
                                </div>

                                {/* AI Section */}
                                <div className="pt-4 border-t border-slate-100">
                                    {event.marketing_strategy ? (
                                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-3 rounded-lg border border-indigo-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-violet-600" />
                                                <span className="text-xs font-bold text-violet-700 uppercase">AI Strategy</span>
                                            </div>
                                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                                {event.marketing_strategy.replace(/\*\*/g, '')}
                                            </p>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                            onClick={() => generateStrategy(event.id)}
                                        >
                                            <Sparkles className="w-4 h-4" /> Generate Marketing Plan
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Simple Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Create New Event</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input className="w-full border p-2 rounded-lg" placeholder="Event Title" required onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            <textarea className="w-full border p-2 rounded-lg" placeholder="Description" onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="border p-2 rounded-lg" type="datetime-local" required onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                <input className="border p-2 rounded-lg" placeholder="Location" required onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>
                            <input className="w-full border p-2 rounded-lg" type="number" placeholder="Capacity" onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}