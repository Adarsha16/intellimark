import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Search, Building2, Mail, DollarSign, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// UI Components
const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
        {children}
    </span>
);

export default function Sponsors() {
    const [sponsors, setSponsors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', company_name: '', contact_email: '', total_funding: 0 });

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

    const handleAddSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadId = toast.loading('Adding sponsor...');
        try {
            await api.post('/sponsors/', formData);
            toast.dismiss(loadId);
            toast.success('Sponsor added successfully!');
            setIsModalOpen(false);
            setFormData({ name: '', company_name: '', contact_email: '', total_funding: 0 });
            fetchSponsors();
        } catch (err) {
            toast.dismiss(loadId);
            toast.error('Failed to add sponsor');
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sponsors</h1>
                    <p className="text-slate-500 text-sm">Track partnerships and funding status.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Sponsor
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-xl"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {sponsors.map((sponsor, index) => (
                            <motion.div
                                key={sponsor.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <Badge color={sponsor.status === 'Secured' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                                        {sponsor.status}
                                    </Badge>
                                </div>

                                <h3 className="font-bold text-slate-900 text-lg">{sponsor.company_name}</h3>
                                <p className="text-sm text-slate-500 mb-4">{sponsor.name}</p>

                                <div className="space-y-2 pt-4 border-t border-slate-100">
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Mail className="w-4 h-4 mr-2 text-slate-400" /> {sponsor.contact_email}
                                    </div>
                                    <div className="flex items-center text-sm font-semibold text-slate-900">
                                        <DollarSign className="w-4 h-4 mr-2 text-emerald-500" /> {sponsor.total_funding.toLocaleString()}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Clean Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900">New Partnership</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddSponsor} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company</label>
                                <input className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required placeholder="Google, Inc." value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Person</label>
                                <input className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required placeholder="Jane Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                                <input type="email" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required placeholder="jane@google.com" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Expected Funding ($)</label>
                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" required placeholder="5000" value={formData.total_funding} onChange={e => setFormData({ ...formData, total_funding: Number(e.target.value) })} />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition mt-2">Save Sponsor</button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}