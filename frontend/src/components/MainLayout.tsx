"use client"

import React, { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import { Menu } from "lucide-react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950">
            {/* Mobile Header */}
            <header className="flex md:hidden items-center justify-between px-4 h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-white tracking-tight">IOCenrich</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 text-slate-400 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <main className="flex-1 overflow-auto bg-slate-950 relative">
                {children}
            </main>
        </div>
    );
}
