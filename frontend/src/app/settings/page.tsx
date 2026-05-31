"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/components/AuthProvider';
import { Loader2, Save, ShieldCheck, ShieldAlert, Key } from 'lucide-react';

const SettingsPage = () => {
    const { session, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [specificSaving, setSpecificSaving] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        vt_api_key_configured: false,
        abuseipdb_api_key_configured: false,
        greynoise_api_key_configured: false,
        urlscan_api_key_configured: false,
        whoisxml_api_key_configured: false,
        hybrid_analysis_api_key_configured: false,
        alienvault_api_key_configured: false,
        urlhaus_api_key_configured: false,
    });

    const [keys, setKeys] = useState({
        vt_api_key: '',
        abuseipdb_api_key: '',
        greynoise_api_key: '',
        urlscan_api_key: '',
        whoisxml_api_key: '',
        hybrid_analysis_api_key: '',
        alienvault_api_key: '',
        urlhaus_api_key: '',
    });

    const configs = [
        { service: 'vt_api_key', label: 'VirusTotal', description: 'Comprehensive file and URL intelligence.', configured: settings.vt_api_key_configured },
        { service: 'abuseipdb_api_key', label: 'AbuseIPDB', description: 'IP reputation and report lookup.', configured: settings.abuseipdb_api_key_configured },
        { service: 'greynoise_api_key', label: 'GreyNoise', description: 'Internet scanning noise filtration.', configured: settings.greynoise_api_key_configured },
        { service: 'urlscan_api_key', label: 'URLScan.io', description: 'Scanning and screenshotting URLs.', configured: settings.urlscan_api_key_configured },
        { service: 'whoisxml_api_key', label: 'WhoisXML API', description: 'WHOIS and domain registration data.', configured: settings.whoisxml_api_key_configured },
        { service: 'hybrid_analysis_api_key', label: 'Hybrid Analysis', description: 'Sandboxing and malware analysis.', configured: settings.hybrid_analysis_api_key_configured },
        { service: 'alienvault_api_key', label: 'AlienVault OTX', description: 'Open threat exchange for robust OSINT infrastructure.', configured: settings.alienvault_api_key_configured },
        { service: 'urlhaus_api_key', label: 'URLhaus', description: 'Malware distribution URL aggregation.', configured: settings.urlhaus_api_key_configured, optional_note: '(Optional for public endpoints)' },
    ];

    useEffect(() => {
        if (authLoading) return;

        const fetchSettings = async () => {
            if (!session) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/proxy/settings/`);

                if (response.ok) {
                    const data = await response.json();
                    setSettings(data);
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [session, authLoading]);

    const handleSave = async (specificKey?: keyof typeof keys) => {
        if (!session) return;
        
        if (specificKey) {
            setSpecificSaving(specificKey);
        } else {
            setIsSaving(true);
        }

        try {
            const payload = specificKey ? { [specificKey]: keys[specificKey] } : keys;

            const response = await fetch(`/api/proxy/settings/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Refresh status
                const statusResponse = await fetch(`/api/proxy/settings/`);
                const statusData = await statusResponse.json();
                setSettings(statusData);

                if (specificKey) {
                    setKeys(prev => ({ ...prev, [specificKey]: '' }));
                } else {
                    setKeys({
                        vt_api_key: '',
                        abuseipdb_api_key: '',
                        greynoise_api_key: '',
                        urlscan_api_key: '',
                        whoisxml_api_key: '',
                        hybrid_analysis_api_key: '',
                        alienvault_api_key: '',
                        urlhaus_api_key: '',
                    });
                }
                alert(specificKey ? 'API Key saved successfully!' : 'All Settings saved successfully!');
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert('Error saving settings.');
        } finally {
            setIsSaving(false);
            setSpecificSaving(null);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white italic">Configuration Engine</h1>
                    <p className="text-sm sm:text-base text-slate-400 mt-1">Manage API keys and integration settings for automated enrichment.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {configs.map((config) => (
                    <Card key={config.service} className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl text-white">{config.label}</CardTitle>
                                {config.configured ? (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                        <ShieldCheck className="w-3.5 h-3.5" /> Configured
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                        <ShieldAlert className="w-3.5 h-3.5" /> Not Configured
                                    </div>
                                )}
                            </div>
                            <CardDescription className="text-slate-400">{config.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor={config.service} className="text-slate-200">
                                    API Key {config.optional_note && <span className="text-xs text-slate-500 font-normal italic">{config.optional_note}</span>}
                                </Label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id={config.service}
                                            type="password"
                                            placeholder={`Enter ${config.label} API Key`}
                                            className="bg-slate-950 border-slate-800 text-slate-300 focus:ring-indigo-500 transition-all font-mono text-sm pr-10 h-10"
                                            value={keys[config.service as keyof typeof keys]}
                                            onChange={(e) => setKeys({ ...keys, [config.service]: e.target.value })}
                                        />
                                        <Key className="absolute right-3 top-3 w-4 h-4 text-slate-600" />
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleSave(config.service as keyof typeof keys)}
                                        disabled={specificSaving === config.service || !keys[config.service as keyof typeof keys]}
                                        className="bg-slate-800 text-slate-200 hover:bg-slate-700 min-w-[80px] h-10 px-4"
                                    >
                                        {specificSaving === config.service ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 px-8 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={() => handleSave()}
                    disabled={isSaving || Object.values(keys).every(v => !v)}
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All Configurations
                </Button>
            </div>
        </div>
    );
};

export default SettingsPage;
