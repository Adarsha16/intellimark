import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
    Briefcase, Users, Calendar, DollarSign, RefreshCw,
    Loader2, Sparkles, ShieldCheck, Download, FileText, TrendingUp
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ... (skipping unchanged parts)

{/* Activity Trend Chart (Full Width) */ }
<motion.div
    initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
>
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activity Trend</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Event & Member growth over time</p>
        </div>
    </div>

    <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
            {/* @ts-ignore */}
            <AreaChart data={activityTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSponsors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                />
                <Line
                    type="monotone"
                    dataKey="events"
                    name="Events"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                    type="monotone"
                    dataKey="users"
                    name="New Members"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>

    {/* Legend is now built-in to the chart, removing custom legend */}
</motion.div>

{/* --- AI Strategy Section (Full Width) --- */ }
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

    <div className="bg-slate-950/30 rounded-xl p-6 border border-white/5 min-h-[160px] max-h-[500px] overflow-y-auto custom-scrollbar">
        {strategyReport ? (
            <div className="prose prose-invert prose-sm max-w-none">
                {strategyReport.split('\n').map((line, i) => (
                    <p key={i} className={`mb-2 leading-relaxed ${line.trim().startsWith('###') || line.trim().startsWith('**') ? 'text-indigo-200 font-bold mt-6 text-lg' : 'text-slate-300'}`}>
                        {line.replace(/\#\#\#|\*\*/g, '')}
                    </p>
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500">
                <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                <p>No strategy generated yet. Click the button above to analyze your data.</p>
            </div>
        )}
    </div>
</motion.div>
        </div >
    );
};

// --- Helper Components ---

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