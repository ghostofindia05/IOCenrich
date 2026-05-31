"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const SignUpPage = () => {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to sign up');

            setIsSuccess(true);
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
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
                    <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                    <p className="text-slate-400 mb-6">
                        We've sent a verification code to <span className="text-white font-medium">{email}</span>. Please verify your account to continue.
                    </p>

                    <div className="space-y-4">
                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 shadow-lg transition-all"
                            onClick={() => router.push(`/verify?email=${encodeURIComponent(email)}`)}
                        >
                            Go to Verification Page
                        </Button>

                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-slate-500">Redirecting in a few seconds...</p>
                            <Button
                                variant="link"
                                className="text-slate-400 hover:text-white text-xs"
                                onClick={() => router.push('/login')}
                            >
                                Back to Login
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] bg-[radial-gradient(circle_at_50%_50%,rgba(63,94,251,0.05),rgba(252,70,107,0.05))] p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <Card className="w-full max-w-md bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500" />

                <CardHeader className="space-y-1 pb-8 text-center">
                    <div className="mx-auto p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center w-24 h-24">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">Create Account</CardTitle>
                    <CardDescription className="text-slate-400">
                        Join the IOC Analysis Platform today
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSignUp} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-slate-200 ml-1">Full Name</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Doe"
                                    required
                                    className="bg-slate-950/50 border-slate-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/20 pl-10 h-11 text-white placeholder:text-slate-600 transition-all"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-200 ml-1">Email Address</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    required
                                    className="bg-slate-950/50 border-slate-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/20 pl-10 h-11 text-white placeholder:text-slate-600 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-200 ml-1">Password</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Minimum 8 characters"
                                    required
                                    minLength={8}
                                    className="bg-slate-950/50 border-slate-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/20 pl-10 h-11 text-white placeholder:text-slate-600 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-11 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-2 pb-8">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0f172a] px-2 text-slate-500">Already have an account?</span>
                        </div>
                    </div>

                    <p className="text-slate-400 text-sm text-center">
                        <Link href="/login" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
                            Sign in to your account
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default SignUpPage;
