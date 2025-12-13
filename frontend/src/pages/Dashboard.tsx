import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

const data = [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 5000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: 6390 },
];

const stats = [
    { name: 'Total Revenue', value: '$24,500', icon: DollarSign, change: '+12%', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Active Members', value: '124', icon: Users, change: '+4%', color: 'bg-blue-100 text-blue-600' },
    { name: 'Upcoming Events', value: '3', icon: Calendar, change: 'In 7 days', color: 'bg-violet-100 text-violet-600' },
];

const Dashboard = () => {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
                    <p className="text-slate-500">Welcome back, here is what's happening today.</p>
                </div>
                <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition">
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
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                            <span className="inline-flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2">
                                <TrendingUp className="w-3 h-3 mr-1" /> {stat.change}
                            </span>
                        </div>
                        <div className={`p-4 rounded-xl ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
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
                    className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Funding Overview</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                    {data.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-2xl text-white flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-xl font-bold opacity-90">Pro Plan</h3>
                        <p className="text-indigo-100 text-sm mt-2 opacity-80">Unlock AI features for sponsor matching and event prediction.</p>
                    </div>
                    <button className="bg-white text-indigo-600 font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-50 transition w-full">
                        Upgrade Now
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;