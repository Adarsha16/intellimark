import { useEffect, useState } from 'react';
import api from '../services/api';
import { Calendar, MapPin, Users, Plus, Sparkles, Handshake, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Pencil, Trash2 } from 'lucide-react';

export default function Events() {
    const [events, setEvents] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    // Matching State
    const [isMatchOpen, setIsMatchOpen] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [selectedEventName, setSelectedEventName] = useState('');

    const [formData, setFormData] = useState({
        title: '', description: '', location: '', date: '', capacity: 100
    });

    const fetchEvents = async () => {
        const res = await api.get('/events/');
        setEvents(res.data);
    };
    // Modify handleCreate to handle Updates
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/events/${editingId}`, formData);
                toast.success("Event updated!");
            } else {
                await api.post('/events/', formData);
                toast.success("Event created!");
            }
            setIsCreateOpen(false);
            fetchEvents();
        } catch (err) {
            toast.error("Operation failed");
        }
    };

    const openEdit = (event: any) => {
        setEditingId(event.id);
        setFormData({
            title: event.title,
            description: event.description,
            location: event.location,
            date: event.date, // Note: You might need to format string 'YYYY-MM-DDTHH:MM' for input type="datetime-local"
            capacity: event.capacity
        });
        setIsCreateOpen(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ title: '', description: '', location: '', date: '', capacity: 100 });
        setIsCreateOpen(true);
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this event?")) return;
        await api.delete(`/events/${id}`);
        toast.success("Event deleted");
        fetchEvents();
    }

    useEffect(() => { fetchEvents(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/events/', formData);
            toast.success("Event created!");
            setIsCreateOpen(false);
            fetchEvents();
        } catch (err) {
            toast.error("Failed to create event");
        }
    };

    const handleMatch = async (event: any) => {
        const loadId = toast.loading(`Matching sponsors for ${event.title}...`);
        try {
            const res = await api.get(`/events/${event.id}/match-sponsors`);
            setMatches(res.data);
            setSelectedEventName(event.title);
            setIsMatchOpen(true);
            toast.dismiss(loadId);
        } catch (err) {
            toast.dismiss(loadId);
            toast.error("Failed to match sponsors");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Events & Promotion</h1>
                    <p className="text-slate-500">Manage club events and find the perfect sponsors.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
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
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col"
                        >
                            <div className="h-2 bg-indigo-500 w-full"></div>
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={event.status === 'Draft' ? 'warning' : 'success'}>{event.status}</Badge>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(event)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(event.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2">{event.title}</h3>
                                <p className="text-slate-500 text-sm line-clamp-2 mb-4 min-h-[40px]">{event.description}</p>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                                        {new Date(event.date).toLocaleString()}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600">
                                        <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                                        {event.location}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-1 gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-white"
                                    onClick={() => handleMatch(event)}
                                >
                                    <Handshake className="w-4 h-4" /> Find Sponsors (AI)
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* CREATE EVENT MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">Create New Event</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input className="w-full border p-2 rounded-lg" placeholder="Event Title" required onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            <textarea className="w-full border p-2 rounded-lg" placeholder="Description (Important for AI matching)" required onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="border p-2 rounded-lg" type="datetime-local" required onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                <input className="border p-2 rounded-lg" placeholder="Location" required onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit">Create</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SPONSOR MATCHING RESULTS MODAL */}
            {isMatchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-xl text-slate-900">AI Sponsor Matches</h3>
                                <p className="text-sm text-slate-500">Best partners for <span className="font-semibold text-indigo-600">{selectedEventName}</span></p>
                            </div>
                            <button onClick={() => setIsMatchOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {matches.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No sponsors found in database to match against.</p>
                            ) : (
                                matches.map((match: any) => {
                                    // Calculate percentage
                                    const percentage = Math.round(match.match_score * 100);
                                    let colorClass = "bg-red-500";
                                    if (percentage > 70) colorClass = "bg-emerald-500";
                                    else if (percentage > 40) colorClass = "bg-amber-500";

                                    return (
                                        <div key={match.sponsor_id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${colorClass}`}>
                                                {percentage}%
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">{match.company_name}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-1">{match.notes || "No notes available"}</p>
                                            </div>
                                            <Button variant="outline" className="text-xs">Contact</Button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}