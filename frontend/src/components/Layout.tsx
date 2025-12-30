import { Fragment } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import {
    LayoutDashboard, Users, Settings, LogOut,
    Bell, ChevronDown, Sparkles
} from 'lucide-react';
import { Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const Layout = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Events', path: '/events', icon: Calendar },
        { name: 'Sponsors', path: '/sponsors', icon: Users },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            {/* Decorative background elements */}
            <div className="fixed top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse pointer-events-none"></div>
            <div className="fixed bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse pointer-events-none"></div>

            {/* Sidebar */}
            <aside className="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-purple-100 shadow-xl relative z-10">
                {/* Logo Section */}
                <div className="p-6 flex items-center gap-3 border-b border-purple-50">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                        <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-xl leading-tight">
                            IntelliMark
                        </h1>
                        <p className="text-xs text-gray-500">Management Suite</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 mt-6">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link key={item.path} to={item.path} className="relative block">
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <div className={clsx(
                                    "relative flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
                                    isActive
                                        ? "text-purple-700 shadow-sm"
                                        : "text-gray-600 hover:bg-purple-50/50 hover:text-purple-600"
                                )}>
                                    <item.icon className={clsx(
                                        "w-5 h-5 mr-3 transition-colors",
                                        isActive ? "text-purple-600" : "text-gray-400"
                                    )} />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile Section */}
                <div className="p-4 border-t border-purple-50">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                            JD
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-gray-900 truncate">John Doe</p>
                            <p className="text-xs text-purple-600 font-medium truncate">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Top Navbar */}
                <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-purple-100 flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center text-gray-500 text-sm">
                        <span className="md:hidden mr-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </span>
                        <span>Organization</span>
                        <span className="mx-2 text-purple-300">/</span>
                        <span className="text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text font-semibold capitalize">
                            {location.pathname === '/' ? 'Dashboard' : location.pathname.replace('/', '')}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <button className="p-2 text-gray-400 hover:text-purple-600 transition-colors relative rounded-lg hover:bg-purple-50">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                        </button>

                        <div className="h-6 w-px bg-purple-100 mx-1"></div>

                        {/* Dropdown Menu */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors outline-none rounded-lg hover:bg-purple-50">
                                <span>Account</span>
                                <ChevronDown className="w-4 h-4" />
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl ring-1 ring-purple-100 focus:outline-none py-1 border border-purple-50">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => { logout(); navigate('/login'); }}
                                                className={clsx(
                                                    active ? 'bg-purple-50 text-purple-700' : 'text-gray-700',
                                                    'flex w-full items-center px-4 py-2.5 text-sm font-medium rounded-lg mx-1 transition-colors'
                                                )}
                                            >
                                                <LogOut className="w-4 h-4 mr-2" /> Sign Out
                                            </button>
                                        )}
                                    </Menu.Item>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;