import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Download, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// --- Types ---
interface ChartData {
    name: string;
    amount: number;
}

interface DashboardStats {
    revenue: number;
    members: number;
    upcomingEvents: number;
    revenueChange: string; // Calculated or Mocked for now
}

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        revenue: 0,
        members: 0,
        upcomingEvents: 0,
        revenueChange: '+0%'
    });

    // --- Data Processing Helper ---
    const processChartData = (sponsors: any[]) => {
        const last6Months = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });

            // Filter sponsors created/updated in this month
            // Note: In a real app, ensure your backend returns created_at. 
            // If missing, we mock distribution for visual demo purposes.
            const monthlyTotal = sponsors.reduce((acc, sponsor) => {
                // Mocking date logic if created_at is missing, otherwise use real date
                const sponsorDate = sponsor.created_at ? new Date(sponsor.created_at) : new Date();
                if (sponsorDate.getMonth() === d.getMonth() && sponsorDate.getFullYear() === d.getFullYear()) {
                    return acc + (sponsor.total_funding || 0);
                }
                return acc;
            }, 0);

            last6Months.push({ name: monthName, amount: monthlyTotal });
        }
        return last6Months;
    };

    // --- Fetch Data ---
    useEffect(() => {
        const loadDashboard = async () => {
            try {
                // Fetch all required data in parallel
                const [sponsorsRes, eventsRes, usersRes] = await Promise.allSettled([
                    api.get('/sponsors/'),
                    api.get('/events/'),
                    api.get('/admin/users') // Might fail if not admin, handled below
                ]);

                // 1. Process Sponsors (Revenue)
                let sponsors = [];
                let totalRevenue = 0;

                if (sponsorsRes.status === 'fulfilled') {
                    sponsors = sponsorsRes.value.data;
                    totalRevenue = sponsors.reduce((acc: number, curr: any) => acc + (curr.total_funding || 0), 0);
                }

                // 2. Process Events
                let upcomingCount = 0;
                if (eventsRes.status === 'fulfilled') {
                    const now = new Date();
                    upcomingCount = eventsRes.value.data.filter((e: any) => new Date(e.date) > now).length;
                }

                // 3. Process Users (Active Members)
                let memberCount = 0;
                if (usersRes.status === 'fulfilled') {
                    memberCount = usersRes.value.data.length;
                } else {
                    // Fallback if non-admin user can't see user list
                    memberCount = 1; // At least you!
                }

                setStats({
                    revenue: totalRevenue,
                    members: memberCount,
                    upcomingEvents: upcomingCount,
                    revenueChange: '+12%' // Hardcoded growth for now as we lack history DB
                });

                // 4. Generate Chart Data
                // If we have no date data, we might generate a flat line or mock it
                // For this demo, let's assume we want to visualize the funding distribution
                const processedChart = processChartData(sponsors);
                setChartData(processedChart);

            } catch (error) {
                console.error("Dashboard load failed", error);
                toast.error("Could not load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    // --- Render Loading State ---
    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        );
    }

    // --- Render Dashboard ---
    return (
        <div className="space-y-8 pb-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        Dashboard Overview
                    </h2>
                    <p className="text-gray-600 font-medium">Analytics & Performance Metrics</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Funding</p>
                            <h3 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                                {formatCurrency(stats.revenue)}
                            </h3>
                            <div className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {stats.revenueChange}
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-300">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                {/* Members Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Users</p>
                            <h3 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                                {stats.members}
                            </h3>
                            <div className="inline-flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                <Users className="w-3 h-3 mr-1" /> Active
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                {/* Events Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all duration-300 group"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Events</p>
                            <h3 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
                                {stats.upcomingEvents}
                            </h3>
                            <div className="inline-flex items-center text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-100">
                                <Calendar className="w-3 h-3 mr-1" /> Upcoming
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform duration-300">
                            <Calendar className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-purple-100"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Funding Trends</h3>
                            <p className="text-sm text-gray-500 mt-1">Sponsorship acquisition over the last 6 months</p>
                        </div>
                    </div>

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        background: '#1e293b',
                                        color: 'white',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [formatCurrency(value), "Funding"]}
                                />
                                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={`url(#gradient-${index})`}
                                        />
                                    ))}
                                </Bar>
                                <defs>
                                    {chartData.map((_, index) => (
                                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    ))}
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

// Quick fix for Sparkles icon import if needed
const Sparkles = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M9 3v4" /><path d="M3 5h4" /><path d="M3 9h4" /></svg>
);

export default Dashboard;