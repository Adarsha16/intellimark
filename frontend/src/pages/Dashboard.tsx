import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Download } from 'lucide-react';

const data = [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 5000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: 6390 },
];

const stats = [
    { name: 'Total Revenue', value: '$24,500', icon: DollarSign, change: '+12%', color: 'from-emerald-400 to-emerald-600' },
    { name: 'Active Members', value: '124', icon: Users, change: '+4%', color: 'from-blue-400 to-blue-600' },
    { name: 'Upcoming Events', value: '3', icon: Calendar, change: 'In 7 days', color: 'from-violet-400 to-violet-600' },
];

const Dashboard = () => {
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        Dashboard Overview
                    </h2>
                    <p className="text-gray-600">Welcome back, here is what's happening today.</p>
                </div>
                <button className="bg-white/90 backdrop-blur-sm border-2 border-purple-100 text-purple-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-50 hover:border-purple-200 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 group">
                    <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                    Download Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg border-2 border-purple-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    {stat.name}
                                </p>
                                <h3 className="text-4xl font-bold text-gray-900 mb-3">
                                    {stat.value}
                                </h3>
                                <div className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                                    {stat.change}
                                </div>
                            </div>
                            <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="w-7 h-7" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-2 border-purple-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Funding Overview</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                                <span>2024</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 13 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 13 }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f3e8ff', opacity: 0.3 }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        background: 'linear-gradient(to bottom right, #7c3aed, #4f46e5)',
                                        color: 'white',
                                        fontWeight: 600
                                    }}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                    {data.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={`url(#gradient${index})`}
                                        />
                                    ))}
                                </Bar>
                                <defs>
                                    {data.map((_, index) => (
                                        <linearGradient key={`gradient${index}`} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={index % 2 === 0 ? '#9333ea' : '#7c3aed'} />
                                            <stop offset="100%" stopColor={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
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

export default Dashboard;