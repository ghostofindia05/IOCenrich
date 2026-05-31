"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
    id: string;
    email: string;
    user_metadata?: {
        full_name?: string;
    };
}

export interface Session {
    access_token: string;
    user: User;
}

interface AuthContextType {
    user: User | null
    session: Session | null
    isLoading: boolean
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    logout: async () => { }
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname();

    useEffect(() => {
        // Dev Mode Bypass: Only if explicitly using local dev and NOT cloud mode
        const isCloudMode = false; // Always run locally for open-source

        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/session');
                const data = await res.json();
                const currentSession = data.session;

                setSession(currentSession);
                setUser(currentSession?.user ?? null);
            } catch (error) {
                console.error("Failed to fetch session:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();

        // Polling session every 5 minutes to keep it alive
        const interval = setInterval(fetchSession, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [pathname, router]);

    // Handle Auth logic redirects
    useEffect(() => {
        if (isLoading) return;
        const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/verify' || pathname === '/forgot-password' || pathname === '/reset-password';
        if (!session && !isAuthPage) {
            router.push('/login');
        } else if (session && (pathname === '/login' || pathname === '/signup' || pathname === '/verify')) {
            router.push('/');
        }
    }, [isLoading, session, pathname, router]);

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setSession(null);
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
