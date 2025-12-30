import { Fragment, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Bell,
    ChevronDown,
    Sparkles,
    Calendar,
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import api from '../services/api';
import Profile from '../pages/Profile';

interface AdminUser {
    id: number;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

const Layout = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Events', path: '/events', icon: Calendar },
        { name: 'Sponsors', path: '/sponsors', icon: Users },
        { name: 'Settings', path: '/settings', icon: Settings },
        { name: 'Profile', path: '/profile', icon: Users },
    ];

    // ✅ Fetch CURRENT admin
    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                const res = await api.get('/users/me');
                setAdmin(res.data);
            } catch (err) {
                console.error('Failed to fetch admin user', err);
                logout();
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchAdmin();
    }, [logout, navigate]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center text-purple-600 font-semibold">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            {/* Sidebar */}
            <aside className="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r shadow-xl">
                {/* Logo */}
                <div className="p-6 flex items-center gap-3 border-b">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            IntelliMark
                        </h1>
                        <p className="text-xs text-gray-500">Management Suite</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 space-y-2 mt-6">
                    {navItems.map((item) => {
                        const isActive =
                            location.pathname === item.path ||
                            (item.path !== '/' &&
                                location.pathname.startsWith(item.path));

                        return (
                            <Link key={item.path} to={item.path} className="relative block">
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl"
                                    />
                                )}
                                <div
                                    className={clsx(
                                        'relative flex items-center px-4 py-3 text-sm font-semibold rounded-xl',
                                        isActive
                                            ? 'text-purple-700'
                                            : 'text-gray-600 hover:bg-purple-50'
                                    )}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Card */}
                <div className="p-4 border-t">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {admin?.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate">
                                {admin?.email}
                            </p>
                            <p className="text-xs text-purple-600 capitalize">
                                {admin?.role}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-16 bg-white/80 border-b flex items-center justify-between px-8">
                    <div className="text-sm text-gray-500 capitalize">
                        {location.pathname === '/'
                            ? 'Dashboard'
                            : location.pathname.replace('/', '')}
                    </div>

                    <div className="flex items-center gap-4">
                        <Bell className="w-5 h-5 text-gray-400" />

                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 text-sm font-semibold">
                                Account <ChevronDown className="w-4 h-4" />
                            </Menu.Button>
                            <Transition as={Fragment}>
                                <Menu.Items className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl p-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    navigate('/login');
                                                }}
                                                className={clsx(
                                                    'w-full flex items-center px-4 py-2 text-sm rounded-lg',
                                                    active && 'bg-purple-50'
                                                )}
                                            >
                                                <LogOut className="w-4 h-4 mr-2" /> Logout
                                            </button>
                                        )}
                                    </Menu.Item>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
