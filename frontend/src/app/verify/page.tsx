"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const VerifyCodeForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Mock OTP verification for local open-source mode
            // Any 6-digit code will pass, or the default 123456
            if (token.length !== 6) {
                throw new Error('Verification code must be exactly 6 digits');
            }

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to verify OTP');
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
                    <h2 className="text-2xl font-bold text-white mb-2">Verified Successfully!</h2>
                    <p className="text-slate-400 mb-6">
                        Your email has been verified. Redirecting you to the dashboard...
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
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500" />

                <CardHeader className="space-y-1 pb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="mx-auto p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center w-24 h-24">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-white">Verify Email</CardTitle>
                    <CardDescription className="text-slate-400">
                        Enter the 6-digit OTP code sent to your email (enter any 6 digits to bypass locally)
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-200 ml-1">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                readOnly
                                className="bg-slate-950/50 border-slate-700/50 text-slate-400 h-11"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="token" className="text-slate-200 ml-1">OTP Code</Label>
                            <Input
                                id="token"
                                type="text"
                                placeholder="123456"
                                required
                                maxLength={6}
                                className="bg-slate-950/50 border-slate-700/50 focus:border-indigo-500/50 focus:ring-indigo-500/20 h-11 text-white placeholder:text-slate-600 transition-all text-center tracking-widest text-lg"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || token.length < 6}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-11 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Verify Account"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        }>
            <VerifyCodeForm />
        </Suspense>
    );
}
