import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Users, ShieldAlert, Activity, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Badge } from '../components/ui/Badge';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function Settings() {
    const [users, setUsers] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    // Fetch Data
    const fetchData = async () => {
        try {
            const [usersRes, logsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/logs')
            ]);
            setUsers(usersRes.data);
            setLogs(logsRes.data);
        } catch (err: any) {
            if (err.response?.status === 403) {
                toast.error("You are not an admin!");
            }
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Update Role Handler
    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await api.put(`/admin/users/${userId}/role?role=${newRole}`);
            toast.success("Role updated");
            fetchData();
        } catch (err) {
            toast.error("Failed to update role");
        }
    };

    // Trigger Backup Handler
    // Trigger Backup Handler
    /*
    const handleBackup = async () => {
        toast.promise(api.post('/admin/backup'), {
            loading: 'Starting backup...',
            success: 'Backup process started!',
            error: 'Failed to start backup'
        });
    };
    */

    const tabs = [
        { name: 'User Management', icon: Users },
        { name: 'Activity Logs', icon: Activity },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-100">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Settings & Admin
                        </h1>
                        <p className="text-gray-600 text-sm">Manage access, view logs, and configure system.</p>
                    </div>
                </div>
            </div>

            <Tab.Group>
                <Tab.List className="flex space-x-2 rounded-2xl bg-gradient-to-r from-purple-100 to-indigo-100 p-1.5 max-w-2xl border-2 border-purple-200">
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.name}
                            className={({ selected }) =>
                                classNames(
                                    'w-full rounded-xl py-3 text-sm font-semibold leading-5 transition-all duration-200',
                                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2',
                                    selected
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg transform scale-105'
                                        : 'text-purple-700 hover:bg-white/60 hover:text-purple-800'
                                )
                            }
                        >
                            <div className="flex items-center justify-center gap-2">
                                <tab.icon className="w-4 h-4" /> {tab.name}
                            </div>
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels className="mt-6">

                    {/* USERS TAB */}
                    <Tab.Panel className="rounded-2xl bg-white/90 backdrop-blur-sm p-8 shadow-lg border-2 border-purple-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">User Roles</h3>
                        </div>
                        <div className="overflow-hidden rounded-xl border-2 border-purple-100 shadow-md">
                            <table className="min-w-full divide-y divide-purple-100">
                                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Joined</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-purple-700 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-purple-50">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-purple-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <Badge variant={user.role === 'admin' ? 'success' : 'neutral'}>{user.role}</Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <select
                                                    className="bg-white border-2 border-purple-200 text-purple-700 text-xs font-semibold rounded-lg px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Tab.Panel>

                    {/* LOGS TAB */}
                    <Tab.Panel className="rounded-2xl bg-white/90 backdrop-blur-sm p-8 shadow-lg border-2 border-purple-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">System Activity</h3>
                        </div>
                        <div className="flow-root">
                            <ul role="list" className="-mb-8">
                                {logs.map((log, eventIdx) => (
                                    <li key={log.id}>
                                        <div className="relative pb-8">
                                            {eventIdx !== logs.length - 1 ? (
                                                <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-purple-200" aria-hidden="true" />
                                            ) : null}
                                            <div className="relative flex space-x-4">
                                                <div>
                                                    <span className={clsx(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center ring-4 ring-white shadow-md",
                                                        log.action.includes("Role")
                                                            ? "bg-gradient-to-br from-amber-400 to-amber-600"
                                                            : "bg-gradient-to-br from-purple-500 to-indigo-600"
                                                    )}>
                                                        <ShieldAlert className="h-5 w-5 text-white" aria-hidden="true" />
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div className="bg-purple-50/50 rounded-xl p-4 flex-1">
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-bold text-purple-700">{log.user_email}</span> {' '}
                                                            performed <span className="font-bold text-gray-900">{log.action}</span>
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-2">{log.details}</p>
                                                    </div>
                                                    <div className="whitespace-nowrap text-right text-sm text-gray-500 pt-2">
                                                        <time dateTime={log.timestamp} className="text-xs">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </time>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Tab.Panel>

                    {/* CONFIG TAB */}

                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}