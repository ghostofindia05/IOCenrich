/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, RefreshCw, Loader2, ShieldAlert, ArrowLeft, ExternalLink, List, ImageIcon, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import dynamic from 'next/dynamic';

const ChoroplethMap = dynamic(() => import('@/components/ChoroplethMap').then(mod => mod.ChoroplethMap), { ssr: false, loading: () => <div className="w-full h-[400px] flex items-center justify-center text-slate-500"><Loader2 className="animate-spin w-8 h-8" /></div> });

// Simple client-side defanger for visual display if the backend didn't do it
const defangValue = (val: string) => {
    return val.replace(/http/g, 'hxxp').replace(/\./g, '[.]').replace(/@/g, '[@]');
};

const getScoreLabel = (score: number) => {
    if (score > 5) return 'Malicious';
    if (score > 0) return 'Suspicious';
    return 'Clean';
};

import { useAuth } from '@/components/AuthProvider';

export default function AdvancedReport() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-100 p-8">Loading Report Interface...</div>}>
            <AdvancedReportContent />
        </Suspense>
    );
}

function AdvancedReportContent() {
    const [report, setReport] = useState<any>(null);
    const [showPngFor, setShowPngFor] = useState<Record<string, boolean>>({});
    const [selectedEvidence, setSelectedEvidence] = useState<{ id: string, url: string } | null>(null);
    const [evidenceImages, setEvidenceImages] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const searchParams = useSearchParams();
    const [defangEnabled, setDefangEnabled] = useState(searchParams.get('defang') !== 'false'); // Default to true unless explicitly false
    const submissionId = searchParams.get('submission_id');
    const { session, isLoading: authLoading } = useAuth();

    useEffect(() => {
        let isActive = true;
        let pollTimeout: NodeJS.Timeout;

        const fetchReport = async () => {
            if (!submissionId || !session) return;

            try {
                const response = await fetch(`/api/proxy/reports/${submissionId}`);

                if (response.ok) {
                    const data = await response.json();

                    if (data.status === 'processing' || data.status === 'pending') {
                        // Still processing, poll again in 2 seconds
                        if (isActive) {
                            pollTimeout = setTimeout(fetchReport, 2000);
                        }
                    }

                    if (data.indicators) {
                        // Transform backend response to match UI format
                        const normalizedReport = {
                            summary: {
                                threat_level: data.indicators.some((i: any) => i.threat_score > 5) ? "High" : "Low",
                                total_indicators: data.indicators.length,
                                malicious_found: data.indicators.filter((i: any) => i.threat_score > 5).length,
                                campaign_tags: Array.from(new Set(data.indicators.map((i: any) => i.mapped_ttp).filter(Boolean)))
                            },
                            indicators: data.indicators.map((i: any) => ({
                                id: i.id,
                                value: i.value,
                                type: i.type,
                                score: i.threat_score,
                                is_internal: i.is_internal,
                                ttp: i.mapped_ttp,
                                campaign: i.campaign,
                                asn: i.asn,
                                geoip: i.geoip,
                                first_seen: i.first_seen,
                                last_seen: i.last_seen,
                                resolution_ip: i.dns_records?.find((d: any) => d.type === 'A')?.value
                                    ?? i.dns_records?.find((d: any) => d.type === 'AAAA')?.value,
                                analysis_status: i.analysis_status || 'PENDING'
                            }))
                        };
                        if (isActive) setReport((prev: any) => ({ ...prev, ...normalizedReport, status: data.status }));
                    }
                } else {
                    if (isActive) setError("Failed to load report. It may still be processing or does not exist.");
                }
            } catch (err: any) {
                console.error("Failed to fetch report:", err);
                if (isActive) setError("Network error while retrieving report.");
            }
        };

        if (submissionId && session) {
            fetchReport();
        }

        return () => {
            isActive = false;
            clearTimeout(pollTimeout);
        };
    }, [submissionId, session]);

    const handleReanalyze = async () => {
        if (!submissionId || !session || isReanalyzing) return;
        setIsReanalyzing(true);
        try {
            const response = await fetch(`/api/proxy/reports/${submissionId}/reanalyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                // Instantly update the UI to show processing state
                // The polling useEffect will pick up the new state soon
                setReport((prev: any) => ({ ...prev, status: 'processing' }));
            } else {
                const data = await response.json();
                alert(`Reanalyze failed: ${data.detail || 'Unknown error'}`);
            }
        } catch (err: any) {
            console.error("Failed to trigger reanalyze:", err);
            alert("Network error while trying to reanalyze report.");
        } finally {
            setIsReanalyzing(false);
        }
    };

    const handleExportCSV = () => {
        if (!report) return;

        // Security: CSV Injection Protection
        const sanitize = (val: any) => {
            const s = String(val ?? '');
            if (s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
                return `'${s}`;
            }
            return s;
        };

        const headers = ["Indicator Value", "Type", "Threat Score", "TTP", "Campaign", "ASN", "GeoIP", "First Seen", "Last Seen", "Is Internal"];
        const rows = report.indicators.map((i: any) => [
            sanitize(i.value),
            sanitize(i.type),
            sanitize(i.score),
            sanitize(i.ttp),
            sanitize(i.campaign),
            sanitize(i.asn),
            sanitize(i.geoip),
            sanitize(i.first_seen),
            sanitize(i.last_seen),
            sanitize(i.is_internal ? "Yes" : "No")
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((r: any) => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `IOC_Report_${submissionId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = async () => {
        if (!report || !session || isExporting) return;
        setIsExporting(true);
        try {
            // First, ensure all evidence images are fetched
            const currentEvidence = await fetchEvidenceForPdf();

            // Capture the map as an image using html-to-image
            let mapImage = "";
            const mapNode = document.getElementById('map-capture-node');
            if (mapNode) {
                const { toPng } = await import('html-to-image');
                mapImage = await toPng(mapNode, { backgroundColor: '#0f172a', pixelRatio: 2 });
            }

            // Imperatively generate the PDF to work around React 19 reconciler issues with PDFDownloadLink
            const { pdf } = await import('@react-pdf/renderer');
            const ForensicReportComponent = (await import('@/components/ForensicReport')).default;

            const documentElement = (
                <ForensicReportComponent
                    submissionId={submissionId || ''}
                    analystId={session?.user?.id || 'System'}
                    generatedAt={new Date().toLocaleString()}
                    report={report}
                    evidenceImages={currentEvidence}
                    mapImage={mapImage}
                    defangEnabled={defangEnabled}
                />
            );

            const blob = await pdf(documentElement).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Forensic_Report_${submissionId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("PDF Export failed:", err);
            alert("Failed to generate PDF document.");
        } finally {
            setIsExporting(false);
        }
    };

    const fetchEvidenceForPdf = async () => {
        if (!report || !session) return {};

        const indicatorsWithUrls = report.indicators.filter((i: any) => i.type === 'url');
        const newImages = { ...evidenceImages };
        let updated = false;

        for (const ind of indicatorsWithUrls) {
            if (!newImages[ind.id]) {
                try {
                    const response = await fetch(`/api/proxy/reports/evidence/${ind.id}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        newImages[ind.id] = objectUrl;
                        updated = true;
                    }
                } catch (error) {
                    console.error(`Failed to fetch evidence for ${ind.id}:`, error);
                }
            }
        }

        if (updated) {
            setEvidenceImages(newImages);
        }
        return newImages;
    };

    useEffect(() => {
        if (report && session) {
            // Optionally auto-fetch evidence for PDF, or do it on demand
            // fetchEvidenceForPdf();
        }
    }, [report, session]);

    const handleViewPng = async (indicatorId: string) => {
        if (!session) return;
        setShowPngFor(prev => ({ ...prev, [indicatorId]: true }));
        try {
            const response = await fetch(`/api/proxy/reports/evidence/${indicatorId}`);
            if (response.ok) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setSelectedEvidence({ id: indicatorId, url: objectUrl });
                setEvidenceImages(prev => ({ ...prev, [indicatorId]: objectUrl }));
            } else {
                alert("Screenshot is either still processing or unavailable.");
            }
        } catch (error) {
            console.error("Failed to load image evidence:", error);
            alert("Network error fetching image evidence.");
        } finally {
            setShowPngFor(prev => ({ ...prev, [indicatorId]: false }));
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">🟢 Analyzed</Badge>;
            case 'FAILED':
                return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/50">🔴 Error</Badge>;
            case 'ENRICHING':
            case 'PENDING':
            default:
                return (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/50">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin inline" /> 🟡 Pending
                    </Badge>
                );
        }
    };

    const [selectedDetails, setSelectedDetails] = useState<any>(null);

    if (authLoading) return <div className="p-8 text-slate-300">Authenticating...</div>;

    if (!submissionId) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400 p-4">
            <h2 className="text-2xl font-bold text-white mb-2">No Report Selected</h2>
            <p>Please select a report from the &quot;Reports&quot; tab or submit new IOCs on &quot;Home&quot;.</p>
            <div className="mt-8 w-full max-w-2xl">
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400 p-4">
            <h2 className="text-2xl font-bold text-rose-500 mb-2">Error</h2>
            <p>{error}</p>
        </div>
    );

    if (!report) return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8 font-sans">
            <header className="border-b border-slate-800 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-400">Loading Report...</h1>
                    <Skeleton className="h-4 w-64 mt-2" />
                </div>
                <Skeleton className="h-8 w-32" />
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-slate-800/40 border-slate-700/50 p-6 space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </Card>
                ))}
            </div>
            <div className="space-y-6 mt-8">
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        </div>
    );

    const completedCount = report.indicators.filter((i: any) => i.analysis_status === 'COMPLETED' || i.analysis_status === 'FAILED').length;
    const isProcessing = report.status === 'processing' || report.status === 'pending';

    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 font-sans">
        <header className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">IOC Forensics Report</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2">Automated Threat Intelligence & Infrastructure Analysis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 print:hidden w-full lg:w-auto">
          <Button
            variant={defangEnabled ? "outline" : "destructive"}
            size="sm"
            onClick={() => setDefangEnabled(!defangEnabled)}
            className={cn(
              "text-[10px] sm:text-xs h-9 sm:h-10",
              defangEnabled ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "animate-pulse"
            )}
          >
            {defangEnabled ? 'Sanitize Display: ON' : 'UNSAFE VIEW: Raw Indicators'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 text-[10px] sm:text-xs h-9 sm:h-10"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={isExporting || !report}
            className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[100px] sm:min-w-[120px] text-[10px] sm:text-xs h-9 sm:h-10"
            onClick={handleExportPDF}
          >
            {isExporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Export PDF</>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isReanalyzing || !report}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-xs h-9 sm:h-10"
            onClick={handleReanalyze}
          >
            {isReanalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Reanalyze</>
            )}
          </Button>
        </div>
      </header>

            {/* Print-Only Forensic Metadata Header */}
            <div className="hidden print:block border-b-2 border-slate-200 pb-4 mb-8 text-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold uppercase tracking-tight">Forensic Case Metadata</h2>
                        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                            <div><span className="font-semibold text-slate-400">Submission ID:</span> {submissionId}</div>
                            <div><span className="font-semibold text-slate-400">Analyst ID:</span> {session?.user?.id || 'System'}</div>
                            <div><span className="font-semibold text-slate-400">Generated:</span> {new Date().toLocaleString()}</div>
                            <div><span className="font-semibold text-slate-400">Classification:</span> ENRICHED INTELLIGENCE</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unsafe View Banner */}
            {!defangEnabled && (
                <div className="bg-rose-500/20 border border-rose-500/50 p-4 rounded-lg mb-6 sm:mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-in fade-in">
                    <ShieldAlert className="w-8 h-8 text-rose-500 flex-shrink-0" />
                    <div className="text-center sm:text-left">
                        <h3 className="text-lg sm:text-xl font-bold text-rose-500 uppercase tracking-widest">Unsafe View: Raw Indicators Exposed</h3>
                        <p className="text-rose-400 text-xs sm:text-sm">Defanging is disabled. Indicators below are active and clickable. Exercise extreme caution.</p>
                    </div>
                </div>
            )}

            {/* Global Progress Bar */}
            {isProcessing && (
                <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-baseline mb-3 sm:mb-2 gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Live Analysis Progress
                        </h3>
                        <span className="text-[10px] sm:text-sm text-slate-400 font-mono">Analyzed {completedCount} of {report.summary.total_indicators} Indicators</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-indigo-500 h-full transition-all duration-500 ease-out"
                            style={{ width: `${(completedCount / report.summary.total_indicators) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Executive Summary */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <ShieldAlert className={cn("w-5 h-5 sm:w-6 sm:h-6", report.summary.threat_level === 'High' ? 'text-rose-500' : 'text-emerald-500')} />
                    Executive Summary
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    This forensic analysis identifies {report.summary.malicious_found} malicious indicators out of {report.summary.total_indicators} analyzed.
                    The overall system threat level is <span className={report.summary.threat_level === 'High' ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>{report.summary.threat_level.toUpperCase()}</span>.
                    {report.summary.threat_level === 'High' ?
                        " Immediate defensive action is recommended for all infrastructure associated with these indicators." :
                        ""}
                    {report.summary.campaign_tags.length > 0 && ` Associated TTPs: ${report.summary.campaign_tags.join(', ')}.`}
                </p>
            </div>

            {/* High-Level Findings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className={`absolute top-0 right-0 p-2 opacity-10`}>
                        {report.summary.threat_level === 'High' ? <ShieldAlert size={80} /> : <ShieldCheck size={80} />}
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" /> System Threat Level
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-4xl font-black tracking-tighter ${report.summary.threat_level === 'High' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {report.summary.threat_level}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase">Consolidated Risk Assessment</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-md shadow-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <List className="w-4 h-4 text-indigo-400" /> Indicator Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 rounded bg-slate-900/50 border border-slate-800/50">
                            <div className="text-xl font-bold text-white">{report.indicators.filter((i: any) => i.type === 'ipv4' || i.type === 'ipv6').length}</div>
                            <div className="text-[10px] text-slate-500 uppercase">IPs</div>
                        </div>
                        <div className="text-center p-2 rounded bg-slate-900/50 border border-slate-800/50">
                            <div className="text-xl font-bold text-white">{report.indicators.filter((i: any) => i.type === 'domain').length}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Domains</div>
                        </div>
                        <div className="text-center p-2 rounded bg-slate-900/50 border border-slate-800/50">
                            <div className="text-xl font-bold text-white">{report.indicators.filter((i: any) => i.type === 'url').length}</div>
                            <div className="text-[10px] text-slate-500 uppercase">URLs</div>
                        </div>
                        <div className="text-center p-2 rounded bg-slate-900/50 border border-slate-800/50">
                            <div className="text-xl font-bold text-white">{report.indicators.filter((i: any) => i.type === 'hash').length}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Hashes</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-md shadow-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-400" /> Malicious Detected
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white leading-none">
                            {report.summary.malicious_found}
                            <span className="text-sm font-medium text-slate-600 ml-2 tracking-normal">
                                of {report.summary.total_indicators} total
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${report.summary.malicious_found > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${(report.summary.malicious_found / report.summary.total_indicators) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Geographic Distribution */}
            <div className="mb-8">
                <Card id="map-capture-node" className="bg-slate-900 border-slate-800 shadow-2xl">
                    <CardHeader className="bg-slate-950/40 border-b border-slate-800 px-6 py-4">
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Geographic Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ChoroplethMap indicators={report.indicators} />
                    </CardContent>
                </Card>
            </div>

            {/* Indicators Segmentation */}
            <div className="space-y-6">

                {/* IPs Section */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="bg-slate-950/40 border-b border-slate-800">
                        <CardTitle className="text-lg text-slate-200">IP Addresses</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[1000px]">
                            <TableHeader className="bg-slate-950/50">
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-300">Indicator</TableHead>
                                    <TableHead className="text-slate-300">Threat Score</TableHead>
                                    <TableHead className="text-slate-300">ASN / Hosting</TableHead>
                                    <TableHead className="text-slate-300">GeoIP</TableHead>
                                    <TableHead className="text-slate-300">TTP / Campaign</TableHead>
                                    <TableHead className="text-slate-300">Temporal</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300">Context</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.indicators.filter((i: any) => i.type === 'ipv4' || i.type === 'ipv6').map((ind: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                                        <TableCell className={`font-mono text-xs text-slate-200 ${!defangEnabled ? 'border-l-2 border-l-rose-500 pl-2' : ''}`}>{defangEnabled ? defangValue(ind.value) : ind.value}</TableCell>
                                        <TableCell>
                                            {typeof ind.score === 'number' ? (
                                                <Badge className={`${ind.score > 5 ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : ind.score > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'} text-[10px]`}>
                                                    {getScoreLabel(ind.score)} ({ind.score}/100)
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-800 italic font-normal text-[10px]">No Flags Found</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-300 max-w-[150px] truncate" title={ind.asn || 'N/A'}>
                                            {ind.asn || <span className="text-slate-600 italic">Unknown</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-300">
                                            {ind.geoip ? <span title={ind.geoip} className="uppercase font-medium bg-slate-800 px-1.5 py-0.5 rounded">{ind.geoip}</span> : <span className="text-slate-600 italic">--</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {ind.ttp ? <Badge variant="outline" className="text-[10px] w-fit border-indigo-500/30 text-indigo-400 bg-indigo-500/10">{ind.ttp}</Badge> : null}
                                                {ind.campaign ? <Badge variant="outline" className="text-[10px] w-fit border-rose-500/30 text-rose-400 bg-rose-500/10">{ind.campaign}</Badge> : null}
                                                {!ind.ttp && !ind.campaign && <span className="text-xs text-slate-600 italic">None Observed</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[10px] text-slate-400 font-mono">
                                            <div>F: {ind.first_seen ? new Date(ind.first_seen).toLocaleDateString() : 'N/A'}</div>
                                            <div>L: {ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'N/A'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2 items-start">
                                                {renderStatusBadge(ind.analysis_status)}
                                                {ind.analysis_status === 'COMPLETED' && (
                                                    <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-400" onClick={() => setSelectedDetails(ind)}>
                                                        View Details
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {ind.is_internal ? <span className="text-[10px] font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded uppercase tracking-tighter">RFC 1918 / Local</span> : <span className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">Public Asset</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {report.indicators.filter((i: any) => i.type === 'ipv4' || i.type === 'ipv6').length === 0 && (
                                    <TableRow><TableCell colSpan={8} className="text-center text-slate-500 py-4">No IP indicators found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Domains Section */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="bg-slate-950/40 border-b border-slate-800">
                        <CardTitle className="text-lg text-slate-200">Domains</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader className="bg-slate-950/50">
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-300">Indicator</TableHead>
                                    <TableHead className="text-slate-300">Threat Score</TableHead>
                                    <TableHead className="text-slate-300">Resolution IP</TableHead>
                                    <TableHead className="text-slate-300">TTP / Campaign</TableHead>
                                    <TableHead className="text-slate-300">Temporal</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.indicators.filter((i: any) => i.type === 'domain').map((ind: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                                        <TableCell className={`font-mono text-xs text-slate-200 ${!defangEnabled ? 'border-l-2 border-l-rose-500 pl-2' : ''}`}>{defangEnabled ? defangValue(ind.value) : ind.value}</TableCell>
                                        <TableCell>
                                            {typeof ind.score === 'number' ? (
                                                <Badge className={`${ind.score > 5 ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : ind.score > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'} text-[10px]`}>
                                                    {getScoreLabel(ind.score)} ({ind.score}/100)
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-800 italic font-normal text-[10px]">Clean / Unverified</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-indigo-400 font-bold">
                                            {ind.resolution_ip || <span className="text-slate-600 italic">No Record</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {ind.ttp ? <Badge variant="outline" className="text-[10px] w-fit border-indigo-500/30 text-indigo-400 bg-indigo-500/10">{ind.ttp}</Badge> : null}
                                                {ind.campaign ? <Badge variant="outline" className="text-[10px] w-fit border-rose-500/30 text-rose-400 bg-rose-500/10">{ind.campaign}</Badge> : null}
                                                {!ind.ttp && !ind.campaign && <span className="text-xs text-slate-600 italic">None Observed</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[10px] text-slate-400 font-mono">
                                            <div>F: {ind.first_seen ? new Date(ind.first_seen).toLocaleDateString() : 'N/A'}</div>
                                            <div>L: {ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'N/A'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2 items-start">
                                                {renderStatusBadge(ind.analysis_status)}
                                                {ind.analysis_status === 'COMPLETED' && (
                                                    <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-400" onClick={() => setSelectedDetails(ind)}>
                                                        View Details
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {report.indicators.filter((i: any) => i.type === 'domain').length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-4">No Domain indicators found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* URLs Section */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="bg-slate-950/40 border-b border-slate-800">
                        <CardTitle className="text-lg text-slate-200">URLs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[900px]">
                            <TableHeader className="bg-slate-950/50">
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-300">Indicator</TableHead>
                                    <TableHead className="text-slate-300">Threat Score</TableHead>
                                    <TableHead className="text-slate-300">TTP / Campaign</TableHead>
                                    <TableHead className="text-slate-300">Temporal</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300">Evidence (PNG)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.indicators.filter((i: any) => i.type === 'url').map((ind: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                                        <TableCell className={`font-mono text-xs text-slate-200 max-w-xs truncate ${!defangEnabled ? 'border-l-2 border-l-rose-500 pl-2' : ''}`} title={ind.value}>
                                            {defangEnabled ? defangValue(ind.value) : ind.value}
                                        </TableCell>
                                        <TableCell>
                                            {typeof ind.score === 'number' ? (
                                                <Badge className={`${ind.score > 5 ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : ind.score > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'} text-[10px]`}>
                                                    {getScoreLabel(ind.score)} ({ind.score}/100)
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-800 italic font-normal text-[10px]">Not Tracked</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {ind.ttp ? <Badge variant="outline" className="text-[10px] w-fit border-indigo-500/30 text-indigo-400 bg-indigo-500/10">{ind.ttp}</Badge> : null}
                                                {ind.campaign ? <Badge variant="outline" className="text-[10px] w-fit border-rose-500/30 text-rose-400 bg-rose-500/10">{ind.campaign}</Badge> : null}
                                                {!ind.ttp && !ind.campaign && <span className="text-xs text-slate-600 italic">None Observed</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[10px] text-slate-400 font-mono">
                                            <div>F: {ind.first_seen ? new Date(ind.first_seen).toLocaleDateString() : 'N/A'}</div>
                                            <div>L: {ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'N/A'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2 items-start">
                                                {renderStatusBadge(ind.analysis_status)}
                                                {ind.analysis_status === 'COMPLETED' && (
                                                    <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-400" onClick={() => setSelectedDetails(ind)}>
                                                        View Details
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {!showPngFor[ind.id] ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                    onClick={() => handleViewPng(ind.id)}
                                                >
                                                    <ImageIcon className="w-4 h-4 mr-2" /> URL to PNG
                                                </Button>
                                            ) : (
                                                <div className="mt-2 text-slate-400 text-xs italic">
                                                    Fetching screenshot securely...
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {report.indicators.filter((i: any) => i.type === 'url').length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-4">No URL indicators found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Hashes Section */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="bg-slate-950/40 border-b border-slate-800">
                        <CardTitle className="text-lg text-slate-200">Hashes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader className="bg-slate-950/50">
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-300">Indicator</TableHead>
                                    <TableHead className="text-slate-300">Threat Score</TableHead>
                                    <TableHead className="text-slate-300">TTP / Campaign</TableHead>
                                    <TableHead className="text-slate-300">Temporal</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.indicators.filter((i: any) => i.type === 'hash').map((ind: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                                        <TableCell className="font-mono text-xs text-slate-200 break-all">{ind.value}</TableCell>
                                        <TableCell>
                                            {typeof ind.score === 'number' ? (
                                                <Badge className={`${ind.score > 5 ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : ind.score > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'} text-[10px]`}>
                                                    {getScoreLabel(ind.score)} ({ind.score}/100)
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-emerald-500 border-emerald-800 italic font-normal text-[10px]">Clean / Unverified</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {ind.ttp ? <Badge variant="outline" className="text-[10px] w-fit border-indigo-500/30 text-indigo-400 bg-indigo-500/10">{ind.ttp}</Badge> : null}
                                                {ind.campaign ? <Badge variant="outline" className="text-[10px] w-fit border-rose-500/30 text-rose-400 bg-rose-500/10">{ind.campaign}</Badge> : null}
                                                {!ind.ttp && !ind.campaign && <span className="text-xs text-slate-600 italic">None Observed</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[10px] text-slate-400 font-mono">
                                            <div>F: {ind.first_seen ? new Date(ind.first_seen).toLocaleDateString() : 'N/A'}</div>
                                            <div>L: {ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'N/A'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2 items-start">
                                                {renderStatusBadge(ind.analysis_status)}
                                                {ind.analysis_status === 'COMPLETED' && (
                                                    <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-400" onClick={() => setSelectedDetails(ind)}>
                                                        View Details
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {report.indicators.filter((i: any) => i.type === 'hash').length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-4">No Hash indicators found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>


            {/* Details Modal */}
            <Dialog open={!!selectedDetails} onOpenChange={(open: boolean) => !open && setSelectedDetails(null)}>
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Enrichment Details</DialogTitle>
                    </DialogHeader>
                    {selectedDetails && (
                        <div className="space-y-4 py-4">
                            <div className="bg-slate-950 p-3 rounded text-sm font-mono break-all text-slate-400 border border-slate-800">
                                {selectedDetails.value}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-3 rounded">
                                    <h4 className="text-xs uppercase text-slate-500 font-bold mb-1">Unified Threat Score</h4>
                                    <div className={`text-2xl font-black ${selectedDetails.score > 5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {selectedDetails.score || 0}<span className="text-sm text-slate-500 font-medium">/100</span>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded">
                                    <h4 className="text-xs uppercase text-slate-500 font-bold mb-1">Primary Routing</h4>
                                    <div className="text-sm font-semibold text-indigo-400">
                                        {selectedDetails.type === 'url' ? 'URLhaus' : 'AlienVault OTX'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">Multi-Vendor Verified</div>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <h4 className="text-sm font-bold border-b border-slate-800 pb-2">Analysis Results</h4>
                                {selectedDetails.is_internal ? (
                                    <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                                        <span className="text-slate-400">Internal Asset</span>
                                        <span className="text-right text-yellow-500 font-semibold tracking-wide">PRIVATE IP - External Analysis Bypassed</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                                            <span className="text-slate-400">Threat Score</span>
                                            <span className={`text-right font-medium ${selectedDetails.score > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedDetails.score || 0}/100</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                                            <span className="text-slate-400">ASN / Hosting</span>
                                            <span className="text-right">{selectedDetails.asn || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                                            <span className="text-slate-400">GeoIP</span>
                                            <span className="text-right">{selectedDetails.geoip || 'N/A'}</span>
                                        </div>
                                        {(selectedDetails.campaign || selectedDetails.ttp) && (
                                            <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                                                <span className="text-slate-400">Threat Intel</span>
                                                <span className="text-right text-rose-400">{selectedDetails.campaign} {selectedDetails.ttp}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>


            {/* Evidence Modal */}
            <Dialog open={!!selectedEvidence} onOpenChange={(open: boolean) => !open && setSelectedEvidence(null)}>
                <DialogContent className="max-w-4xl bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-slate-200">Forensic Evidence (URL Screenshot)</DialogTitle>
                    </DialogHeader>
                    {selectedEvidence && (
                        <div className="mt-4 flex justify-center bg-slate-950 p-4 rounded-lg overflow-auto max-h-[70vh]">
                            <img src={selectedEvidence.url} alt="Forensic Screenshot" className="max-w-full rounded shadow-xl border border-slate-800" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    /* General Layout Refinements */
                    body {
                        background-color: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin: 0 !important;
                        padding: 2 \!cm !important; /* Standard forensic margin */
                    }
                    
                    .main-content, .min-h-screen {
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    /* Strip UI Chrome */
                    header div.print\\:hidden, 
                    .sidebar, .nav-links, .export-buttons,
                    button, .Button, [role="button"] {
                        display: none !important;
                    }

                    /* Color Mapping for Print */
                    .bg-slate-950, .bg-slate-900, .bg-slate-900\\/50, .bg-slate-800\\/40 { 
                        background-color: transparent !important;
                        border: 1px solid #e2e8f0 !important;
                    }
                    
                    .text-white, .text-slate-100, .text-slate-200, .text-slate-300 { 
                        color: #0f172a !important; 
                    }
                    
                    .text-slate-400, .text-slate-500 {
                        color: #475569 !important;
                    }

                    .text-rose-500, .text-rose-400 { color: #be123c !important; }
                    .text-emerald-500, .text-emerald-400 { color: #15803d !important; }
                    .text-indigo-400, .text-indigo-500 { color: #4338ca !important; }

                    /* Structured Sections */
                    section, .Card, .card, table, .indicator-card, .evidence-image {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 2rem !important;
                        border-color: #e2e8f0 !important;
                    }

                    tr {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    .Badge {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border: 1px solid #cbd5e1 !important;
                    }
                }
            `}</style>
        </div >
    );
}
