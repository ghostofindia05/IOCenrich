"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, KeyRound, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const ResetPasswordForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        const tokenParam = searchParams.get('token');
        if (emailParam) {
            setEmail(emailParam);
        }
        if (tokenParam) {
            setToken(tokenParam);
        }
    }, [searchParams]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] bg-[radial-gradient(circle_at_50%_50%,rgba(63,94,251,0.05),rgba(252,70,107,0.05))] p-4">
                <Card className="w-full max-w-md bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden text-center p-8">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                    <p className="text-slate-400 mb-6">
                        Your password has been successfully updated.
                    </p>
                    <Button
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        onClick={() => router.push('/login')}
                    >
                        Return to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] bg-[radial-gradient(circle_at_50%_50%,rgba(63,94,251,0.05),rgba(252,70,107,0.05))] p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <Card className="w-full max-w-md bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

                <CardHeader className="space-y-1 pb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">Reset Password</CardTitle>
                    <CardDescription className="text-slate-400 px-2">
                        Enter the verification code and your new password
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="token" className="text-slate-200 ml-1">Reset Code / Token</Label>
                            <Input
                                id="token"
                                type="text"
                                placeholder="Paste reset token here"
                                required
                                className="bg-slate-950/50 border-slate-700/50 focus:border-purple-500/50 focus:ring-purple-500/20 h-11 text-white placeholder:text-slate-600 transition-all text-center tracking-normal text-sm"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-200 ml-1">New Password</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-purple-400 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    className="bg-slate-950/50 border-slate-700/50 focus:border-purple-500/50 focus:ring-purple-500/20 pl-10 h-11 text-white placeholder:text-slate-600 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !token}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium h-11 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center pt-2 pb-8">
                    <p className="text-slate-400 text-sm text-center">
                        Remember your password?{" "}
                        <Link href="/login" className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
                            Back to login
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
