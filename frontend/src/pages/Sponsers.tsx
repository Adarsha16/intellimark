import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Plus, Building2, Mail, DollarSign, X,
    Pencil, Trash2, FileText, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
interface Sponsor {
    id: number;
    name: string;
    company_name: string;
    contact_email: string;
    total_funding: number;
    status: string;
    notes?: string;
}

// --- Helper Component: Badge ---
const Badge = ({ children, status }: { children: React.ReactNode, status: string }) => {
    let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

    switch (status) {
        case 'Secured': colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"; break;
        case 'Negotiating': colorClass = "bg-amber-50 text-amber-700 border-amber-200"; break;
        case 'Contacted': colorClass = "bg-blue-50 text-blue-700 border-blue-200"; break;
        case 'Potential': colorClass = "bg-slate-50 text-slate-600 border-slate-200"; break;
    }

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
            {children}
        </span>
    );
};

export default function Sponsors() {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        company_name: '',
        contact_email: '',
        total_funding: 0,
        status: 'Potential',
        notes: ''
    });

    // Fetch Data
    const fetchSponsors = async () => {
        try {
            const res = await api.get('/sponsors/');
            setSponsors(res.data);
        } catch (err) {
            toast.error("Failed to load sponsors");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSponsors(); }, []);

    // Modal Handlers
    const openCreateModal = () => {
        setEditingId(null);
        setFormData({ name: '', company_name: '', contact_email: '', total_funding: 0, status: 'Potential', notes: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (sponsor: Sponsor) => {
        setEditingId(sponsor.id);
        setFormData({
            name: sponsor.name,
            company_name: sponsor.company_name,
            contact_email: sponsor.contact_email,
            total_funding: sponsor.total_funding,
            status: sponsor.status || 'Potential',
            notes: sponsor.notes || ''
        });
        setIsModalOpen(true);
    };

    // CRUD Actions
    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to remove this sponsor? This cannot be undone.")) return;
        try {
            await api.delete(`/sponsors/${id}`);
            toast.success("Sponsor removed");
            setSponsors(prev => prev.filter(s => s.id !== id));
        } catch (err) { toast.error("Failed to delete"); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadId = toast.loading(editingId ? 'Updating...' : 'Adding...');
        try {
            if (editingId) {
                await api.put(`/sponsors/${editingId}`, formData);
                toast.success('Sponsor updated successfully');
            } else {
                await api.post('/sponsors/', formData);
                toast.success('New sponsor added');
            }
            setIsModalOpen(false);
            fetchSponsors();
        } catch (err) {
            toast.error('Operation failed');
        } finally {
            toast.dismiss(loadId);
        }
    };

    // Filter Logic
    const filteredSponsors = sponsors.filter(s =>
        s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* --- Header & Actions --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sponsors & Partners</h1>
                    <p className="text-slate-500 text-sm">Manage relationships and track funding sources.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Sponsor
                    </button>
                </div>
            </div>

            {/* --- Loading Skeleton --- */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-xl"></div>)}
                </div>
            )}

            {/* --- Grid Layout --- */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredSponsors.map((sponsor) => (
                            <motion.div
                                layout
                                key={sponsor.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                            >
                                {/* Card Header */}
                                <div className="p-5 flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight">{sponsor.company_name}</h3>
                                            <p className="text-sm text-slate-500">{sponsor.name}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(sponsor)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(sponsor.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="px-5 pb-5 flex-1 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge status={sponsor.status}>{sponsor.status}</Badge>
                                    </div>

                                    {/* Notes Section (Important for AI) */}
                                    {sponsor.notes && (
                                        <div className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-3">
                                                "{sponsor.notes}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex justify-between items-center text-sm">
                                    <div className="flex items-center text-slate-500">
                                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                        <span className="truncate max-w-[120px]" title={sponsor.contact_email}>{sponsor.contact_email}</span>
                                    </div>
                                    <div className="flex items-center font-bold text-slate-700">
                                        <DollarSign className="w-4 h-4 text-emerald-500 mr-1" />
                                        {sponsor.total_funding.toLocaleString()}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {!loading && filteredSponsors.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-slate-900 font-medium">No sponsors found</h3>
                            <p className="text-slate-500 text-sm">Try adjusting your search or add a new sponsor.</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- Create/Edit Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">{editingId ? 'Edit Sponsor' : 'New Partnership'}</h3>
                                <p className="text-xs text-slate-500">Enter details below to track this relationship.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-1 rounded-full shadow-sm border border-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <form id="sponsorForm" onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Company Name</label>
                                        <input className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" required placeholder="e.g. Google" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Contact Person</label>
                                        <input className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" required placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Email Address</label>
                                    <input type="email" className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" required placeholder="john@company.com" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Total Funding ($)</label>
                                        <input type="number" className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" required value={formData.total_funding} onChange={e => setFormData({ ...formData, total_funding: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Status</label>
                                        <select className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="Potential">Potential</option>
                                            <option value="Contacted">Contacted</option>
                                            <option value="Negotiating">Negotiating</option>
                                            <option value="Secured">Secured</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block flex justify-between">
                                        Notes & Preferences
                                        <span className="text-slate-400 font-normal lowercase text-[10px]">(Crucial for AI matching)</span>
                                    </label>
                                    <textarea
                                        className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition h-24 resize-none"
                                        placeholder="Describe what they fund (e.g., 'Interested in hackathons, sustainability, and AI projects.')"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">Cancel</button>
                            <button form="sponsorForm" type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95">
                                {editingId ? 'Save Changes' : 'Create Sponsor'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}