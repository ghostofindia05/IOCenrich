"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    if (pathname === '/login' || pathname === '/signup' || pathname === '/verify' || pathname === '/forgot-password' || pathname === '/reset-password') {
        return null;
    }

    const navItems = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Reports', href: '/reports', icon: FileText },
        { label: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-950 border-r border-slate-800 text-slate-200 transition-transform duration-300 md:relative md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col items-center gap-2 p-6 border-b border-slate-800">
                    <div className="relative w-16 h-16 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-inner flex items-center justify-center p-2">
                        <img src="/logo.png" alt="IOCenrich" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between w-full md:justify-center">
                        <span className="text-2xl font-bold tracking-tight text-white">IOCenrich</span>
                        <button onClick={onClose} className="p-2 text-slate-400 md:hidden">
                            <LogOut className="w-5 h-5 rotate-180" /> {/* Just a placeholder icon or X */}
                        </button>
                    </div>
                </div>

                <nav className="flex-1 flex flex-col p-4 overflow-y-auto">
                    <div className="space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => onClose?.()}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]",
                                        isActive
                                            ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20"
                                            : "hover:bg-slate-900 border border-transparent"
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-slate-400")} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-6">
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400 overflow-hidden">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate text-slate-100">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <span className="text-xs truncate text-slate-500">
                                {user?.email || 'Authenticated'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm font-medium min-h-[44px]"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
