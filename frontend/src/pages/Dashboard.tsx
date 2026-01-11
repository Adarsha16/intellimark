import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
    Briefcase, Users, Calendar, DollarSign, RefreshCw,
    Loader2, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// --- Types ---
interface RealDataStats {
    totalRevenue: number;
    securedRevenue: number;
    totalSponsors: number;
    totalMembers: number;
    totalEvents: number;
    upcomingEventsCount: number;
}

interface ActivityLog {
    id: number;
    action: string;
    details: string;
    timestamp: string;
    user_email: string;
}

// Modern Corporate Palette
const COLORS = {
    primary: '#6366f1',   // Indigo
    success: '#10b981',   // Emerald
    warning: '#f59e0b',   // Amber
    danger: '#ef4444',    // Red
    slate: '#64748b',     // Slate
    chart: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- REAL DATA STATE ---
    const [stats, setStats] = useState<RealDataStats>({
        totalRevenue: 0,
        securedRevenue: 0,
        totalSponsors: 0,
        totalMembers: 0,
        totalEvents: 0,
        upcomingEventsCount: 0
    });

    const [chartFundingByStatus, setChartFundingByStatus] = useState<any[]>([]);
    const [chartEventsByMonth, setChartEventsByMonth] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);

    // AI State
    const [strategyReport, setStrategyReport] = useState<string | null>(null);
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

    // --- DATA PROCESSORS (PURE LOGIC) ---

    // 1. Group Funding by Status (e.g., Secured vs Potential)
    const processFundingChart = (sponsors: any[]) => {
        const map: Record<string, number> = {};
        sponsors.forEach(s => {
            const status = s.status || "Unknown";
            map[status] = (map[status] || 0) + (s.total_funding || 0);
        });
        return Object.keys(map).map(key => ({
            name: key,
            value: map[key]
        })).sort((a, b) => b.value - a.value); // Sort highest funding first
    };

    // 2. Timeline of Events (Real dates)
    const processEventTimeline = (events: any[]) => {
        const map: Record<string, number> = {};
        events.forEach(e => {
            if (!e.date) return;
            const date = new Date(e.date);
            const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            map[key] = (map[key] || 0) + 1;
        });
        // Convert to array and sort chronologically is tricky with just strings, 
        // so we trust the DB sort or limit to recent months in a real app.
        // For now, we return keys as they come.
        return Object.keys(map).map(key => ({
            name: key,
            events: map[key]
        }));
    };

    const fetchData = async () => {
        setRefreshing(true);
        try {
            // Fetch everything in parallel
            const [sponsorsRes, eventsRes, usersRes, logsRes] = await Promise.allSettled([
                api.get('/sponsors/'),
                api.get('/events/'),
                api.get('/admin/users'),
                api.get('/admin/logs')
            ]);

            // --- 1. SPONSORS ---
            let sponsors = [];
            if (sponsorsRes.status === 'fulfilled') {
                sponsors = sponsorsRes.value.data;
            }

            const totalRev = sponsors.reduce((acc: number, s: any) => acc + (s.total_funding || 0), 0);
            const securedRev = sponsors
                .filter((s: any) => s.status === 'Secured')
                .reduce((acc: number, s: any) => acc + (s.total_funding || 0), 0);

            // --- 2. EVENTS ---
            let events = [];
            if (eventsRes.status === 'fulfilled') {
                events = eventsRes.value.data;
            }
            const upcoming = events.filter((e: any) => new Date(e.date) > new Date()).length;

            // --- 3. USERS ---
            let memberCount = 0;
            if (usersRes.status === 'fulfilled') memberCount = usersRes.value.data.length;

            // --- 4. LOGS ---
            if (logsRes.status === 'fulfilled') {
                setRecentLogs(logsRes.value.data.slice(0, 6)); // Top 6
            }

            // Update State
            setStats({
                totalRevenue: totalRev,
                securedRevenue: securedRev,
                totalSponsors: sponsors.length,
                totalMembers: memberCount,
                totalEvents: events.length,
                upcomingEventsCount: upcoming
            });

            setChartFundingByStatus(processFundingChart(sponsors));
            setChartEventsByMonth(processEventTimeline(events));

        } catch (error) {
            console.error(error);
            toast.error("Connection error. Using cached data if available.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const generateStrategy = async () => {
        setIsGeneratingStrategy(true);
        try {
            const res = await api.post('/admin/generate-strategy');
            setStrategyReport(res.data.report);
            toast.success("Analysis Complete");
        } catch (err) {
            toast.error("AI Service Unavailable");
        } finally {
            setIsGeneratingStrategy(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium">Aggregating secure data...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h2>
                    <p className="text-slate-500 font-medium mt-1">Real-time performance metrics & AI strategy.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Syncing...' : 'Refresh Data'}
                </button>
            </div>

            {/* --- KPI CARDS (Bento Row 1) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Pipeline Value"
                    value={formatCurrency(stats.totalRevenue)}
                    subValue={`${formatCurrency(stats.securedRevenue)} secured`}
                    icon={DollarSign}
                    color="primary"
                />
                <MetricCard
                    title="Sponsor Relationships"
                    value={stats.totalSponsors.toString()}
                    subValue="Active partners"
                    icon={Briefcase}
                    color="warning"
                />
                <MetricCard
                    title="Events Scheduled"
                    value={stats.upcomingEventsCount.toString()}
                    subValue={`out of ${stats.totalEvents} total`}
                    icon={Calendar}
                    color="success"
                />
                <MetricCard
                    title="Club Members"
                    value={stats.totalMembers.toString()}
                    subValue="Registered users"
                    icon={Users}
                    color="slate"
                />
            </div>

            {/* --- ANALYTICS ROW (Bento Row 2) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 1. FUNDING DISTRIBUTION (Honest Data) */}
                <motion.div
                    initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col"
                >
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Revenue by Status</h3>
                        <p className="text-sm text-slate-500">Actual financial distribution based on deal stages.</p>
                    </div>

                    {chartFundingByStatus.length > 0 ? (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartFundingByStatus} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => formatCurrency(val)}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                                        {chartFundingByStatus.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState text="Add sponsors with funding amounts to see analytics." />
                    )}
                </motion.div>

                {/* 2. ACTIVITY LOG (Security & Audit) */}
                <motion.div
                    initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">System Audit Log</h3>
                            <p className="text-sm text-slate-500">Recent administrative actions and security events.</p>
                        </div>
                        <ShieldCheck className="w-5 h-5 text-slate-300" />
                    </div>

                    <div className="space-y-0">
                        {recentLogs.length > 0 ? (
                            recentLogs.map((log, idx) => (
                                <div key={log.id} className="flex gap-4 items-start py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition">
                                    <div className="min-w-[4rem] text-[11px] font-medium text-slate-400 pt-1">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-700">
                                            {log.action} <span className="font-normal text-slate-500">by {log.user_email}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 font-mono bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                                            {log.details || "No details provided"}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState text="No recent system activity recorded." />
                        )}
                    </div>
                </motion.div>
            </div>

            {/* --- AI STRATEGY SECTION (Full Width) --- */}
            <motion.div
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-xl shadow-slate-900/10 border border-slate-700/50"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                            <Sparkles className="w-7 h-7 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight">AI Chief Strategist</h3>
                            <p className="text-slate-400 text-sm mt-1">Generates actionable insights based on your {stats.totalEvents} events and {stats.totalSponsors} sponsors.</p>
                        </div>
                    </div>
                    <button
                        onClick={generateStrategy}
                        disabled={isGeneratingStrategy}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isGeneratingStrategy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isGeneratingStrategy ? 'Analyzing Database...' : 'Generate Strategic Report'}
                    </button>
                </div>

                <div className="bg-slate-950/30 rounded-xl p-6 border border-white/5 min-h-[160px] max-h-[400px] overflow-y-auto custom-scrollbar">
                    {strategyReport ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                            {/* Simple markdown parser replacer for bolding */}
                            {strategyReport.split('\n').map((line, i) => (
                                <p key={i} className={`mb-2 ${line.startsWith('**') ? 'text-indigo-200 font-bold mt-4' : 'text-slate-300'}`}>
                                    {line.replace(/\*\*/g, '')}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500">
                            <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                            <p>No strategy generated yet. Click the button to analyze your data.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// --- Subcomponents ---

const MetricCard = ({ title, value, subValue, icon: Icon, color }: any) => {
    const bgStyles: any = {
        primary: "bg-indigo-50 text-indigo-600",
        success: "bg-emerald-50 text-emerald-600",
        warning: "bg-amber-50 text-amber-600",
        slate: "bg-slate-100 text-slate-600",
    };

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgStyles[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
                <p className="text-sm font-semibold text-slate-700 mt-1">{title}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{subValue}</p>
            </div>
        </motion.div>
    );
};

const EmptyState = ({ text }: { text: string }) => (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
        <p className="text-sm text-slate-400 font-medium">{text}</p>
    </div>
);

export default Dashboard;