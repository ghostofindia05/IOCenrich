"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reset link');

            setIsSuccess(true);
            setTimeout(() => {
                router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.token || '')}`);
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] bg-[radial-gradient(circle_at_50%_50%,rgba(63,94,251,0.05),rgba(252,70,107,0.05))] p-4">
                <Card className="w-full max-w-md bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden text-center p-8">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                            <Mail className="w-12 h-12 text-indigo-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                    <p className="text-slate-400 mb-6">
                        We've sent a password reset code to <span className="text-white font-medium">{email}</span>.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] bg-[radial-gradient(circle_at_50%_50%,rgba(63,94,251,0.05),rgba(252,70,107,0.05))] p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
            </div>

            <Card className="w-full max-w-md bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <CardHeader className="space-y-1 pb-8 text-center relative">
                    <Link href="/login" className="absolute left-6 top-6 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex justify-center mb-4 mt-2">
                        <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">Forgot Password?</CardTitle>
                    <CardDescription className="text-slate-400 px-4">
                        Enter your email address and we'll send you a code to reset your password.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-200 ml-1">Email Address</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    required
                                    className="bg-slate-950/50 border-slate-700/50 focus:border-indigo-500/50 focus:ring-indigo-500/20 pl-10 h-11 text-white placeholder:text-slate-600 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-11 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Send Reset Code"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
