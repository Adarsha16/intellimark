import { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Building2, Mail, DollarSign, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
            <Toaster position="top-right" />

            <div className="fixed top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none"></div>
            <div className="fixed bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-100">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    Sponsors
                                </h1>
                            </div>
                            <p className="text-gray-600 text-sm ml-13">Track partnerships and funding status.</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" /> Add Sponsor
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-56 bg-gradient-to-br from-purple-100 to-indigo-100 animate-pulse rounded-2xl"></div>
                        ))}
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
                                    className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-600 group-hover:from-purple-500 group-hover:to-indigo-600 group-hover:text-white transition-all duration-300 shadow-md">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <Badge color={sponsor.status === 'Secured' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white'}>
                                            {sponsor.status}
                                        </Badge>
                                    </div>

                                    <h3 className="font-bold text-gray-900 text-xl mb-1">{sponsor.company_name}</h3>
                                    <p className="text-sm text-purple-600 font-medium mb-5">{sponsor.name}</p>

                                    <div className="space-y-3 pt-5 border-t-2 border-purple-50">
                                        <div className="flex items-center text-sm text-gray-600 bg-purple-50/50 rounded-lg px-3 py-2">
                                            <Mail className="w-4 h-4 mr-2 text-purple-500" />
                                            <span className="truncate">{sponsor.contact_email}</span>
                                        </div>
                                        <div className="flex items-center text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent px-3 py-2 bg-purple-50/50 rounded-lg">
                                            <DollarSign className="w-5 h-5 mr-2 text-emerald-500" />
                                            ${sponsor.total_funding.toLocaleString()}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-900/40 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-purple-100"
                        >
                            <div className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-600 to-indigo-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-xl text-white">New Partnership</h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddSponsor} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Company Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building2 className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <input
                                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                                            required
                                            placeholder="Google, Inc."
                                            value={formData.company_name}
                                            onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Contact Person
                                    </label>
                                    <input
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                                        required
                                        placeholder="Jane Doe"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <input
                                            type="email"
                                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                                            required
                                            placeholder="jane@google.com"
                                            value={formData.contact_email}
                                            onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Expected Funding ($)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                                            required
                                            placeholder="5000"
                                            value={formData.total_funding}
                                            onChange={e => setFormData({ ...formData, total_funding: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 mt-2"
                                >
                                    Save Sponsor
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}