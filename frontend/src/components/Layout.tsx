import { Fragment } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import {
    LayoutDashboard, Users, Settings, LogOut,
    Bell, ChevronDown, Menu as MenuIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const Layout = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Sponsors', path: '/sponsors', icon: Users },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">

            {/* Sidebar */}
            <aside className="hidden md:flex w-72 flex-col bg-white border-r border-slate-200">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <span className="text-white font-bold text-xl">C</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 text-lg leading-tight">ClubManager</h1>
                        <p className="text-xs text-slate-500 font-medium">Pro Edition</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-6">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link key={item.path} to={item.path} className="relative block">
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-indigo-50 rounded-xl"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <div className={clsx(
                                    "relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                                    isActive ? "text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}>
                                    <item.icon className={clsx("w-5 h-5 mr-3 transition-colors", isActive ? "text-indigo-600" : "text-slate-400")} />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile Snippet in Sidebar Bottom */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">JD</div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-slate-900 truncate">John Doe</p>
                            <p className="text-xs text-slate-500 truncate">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* Top Navbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
                    <div className="flex items-center text-slate-400 text-sm">
                        <span className="md:hidden mr-4"><MenuIcon /></span>
                        <span>Organization</span>
                        <span className="mx-2">/</span>
                        <span className="text-slate-800 font-medium capitalize">
                            {location.pathname === '/' ? 'Dashboard' : location.pathname.replace('/', '')}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Dropdown Menu */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors outline-none">
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
                                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button onClick={() => { logout(); navigate('/login'); }} className={clsx(active ? 'bg-slate-50 text-indigo-600' : 'text-slate-700', 'flex w-full items-center px-4 py-2 text-sm')}>
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
                <main className="flex-1 overflow-auto bg-slate-50 p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;