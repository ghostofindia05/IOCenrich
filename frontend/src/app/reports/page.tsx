"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/components/AuthProvider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ExternalLink, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

const ReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);
    const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
    const router = useRouter();
    const { session } = useAuth();

    const fetchReports = useCallback(async () => {
        if (!session) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/proxy/reports/`);

            if (response.ok) {
                const data = await response.json();
                setReports(data);
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setReportToDelete(reportId);
    };

    const handleReanalyze = async (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setReanalyzingId(reportId);
        try {
            const response = await fetch(`/api/proxy/reports/${reportId}/reanalyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                fetchReports();
            } else {
                alert("Failed to reanalyze report.");
            }
        } catch (error) {
            console.error("Error reanalyzing report:", error);
            alert("An error occurred while reanalyzing the report.");
        } finally {
            setReanalyzingId(null);
        }
    };

    const confirmDelete = async () => {
        if (!reportToDelete) return;

        try {
            const response = await fetch(`/api/proxy/reports/${reportToDelete}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Refresh the list
                setReportToDelete(null);
                fetchReports();
            } else {
                alert("Failed to delete report.");
            }
        } catch (error) {
            console.error("Error deleting report:", error);
            alert("An error occurred while deleting the report.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'processing': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'failed': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Analysis Reports</h1>
                    <p className="text-sm sm:text-base text-slate-400 mt-1">Review and manage your historical IOC intelligence findings.</p>
                </div>
            </div>

            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-950/50">
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-300 hidden sm:table-cell">Report ID</TableHead>
                                    <TableHead className="text-slate-300">Created At</TableHead>
                                    <TableHead className="text-slate-300">Indicators</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300 text-right pr-4">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                            No reports found. Start by submitting some IOCs on the Home tab.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((report: { id: string, created_at: string, indicator_count: number, status: string }) => (
                                        <TableRow key={report.id} className="border-slate-800 hover:bg-slate-800/50">
                                            <TableCell className="font-mono text-[10px] text-slate-500 hidden sm:table-cell px-4">{report.id}</TableCell>
                                            <TableCell className="text-slate-300 text-xs sm:text-sm whitespace-nowrap">
                                                {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell className="text-slate-300 text-center sm:text-left">{report.indicator_count}</TableCell>
                                            <TableCell>
                                                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(report.status)}`}>
                                                    {report.status}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-1 sm:gap-2 pr-4 py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-indigo-400 hover:text-indigo-300 h-8 px-2"
                                                    onClick={() => router.push(`/report?submission_id=${report.id}`)}
                                                    title="Details"
                                                >
                                                    <span className="hidden sm:inline mr-1">Details</span> <ExternalLink className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Reanalyze Report"
                                                    className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 h-8 px-2"
                                                    onClick={(e) => handleReanalyze(report.id, e)}
                                                    disabled={reanalyzingId === report.id || report.status === 'processing'}
                                                >
                                                    {reanalyzingId === report.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Delete"
                                                    className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 h-8 px-2"
                                                    onClick={(e) => handleDeleteReport(report.id, e)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </div>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-500">
                            <AlertTriangle className="w-5 h-5" />
                            Confirm Report Deletion
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 pt-2">
                            Are you sure you want to delete report <span className="font-mono text-rose-400">{reportToDelete}</span>?
                            This action is permanent and will remove all associated investigative findings.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex gap-3">
                        <Button
                            variant="outline"
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                            onClick={() => setReportToDelete(null)}
                        >
                            Cancel Analysis
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                            onClick={confirmDelete}
                        >
                            Delete Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReportsPage;
