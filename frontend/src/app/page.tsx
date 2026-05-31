"use client"

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Database, Search, ArrowRight, ArrowLeft, Download } from "lucide-react";

export default function Home() {
  const [iocData, setIocData] = useState("");
  const [defang, setDefang] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedIndicators, setExtractedIndicators] = useState<any[] | null>(null);

  const { session } = useAuth();
  const router = useRouter();

  const handleExtract = async () => {
    if (!session) {
      alert("Please ensure you are logged in.");
      return;
    }

    if (!iocData.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/proxy/ioc/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: iocData,
          defang: defang
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedIndicators(data.indicators);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to extract IOCs'}`);
      }
    } catch (error) {
      console.error("Extraction error:", error);
      alert("Network error while extracting indicators.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!session || !extractedIndicators || extractedIndicators.length === 0) {
      alert("No valid indicators to analyze.");
      return;
    }

    setIsProcessing(true);
    try {
      // Check if API keys are configured before proceeding
      const settingsResponse = await fetch(`/api/proxy/settings/`);

      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        if (!settings.vt_api_key_configured && !settings.abuseipdb_api_key_configured) {
          alert("No API keys detected! Please go to Settings and provide at least your VirusTotal or AbuseIPDB API keys to enable enrichment.");
          setIsProcessing(false);
          return;
        }
      }

      const response = await fetch(`/api/proxy/ioc/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: iocData,
          indicators: extractedIndicators,
          defang: defang
        })
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/report?submission_id=${data.submission_id}&defang=${defang}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to analyze IOCs'}`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Network error while starting analysis.");
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setExtractedIndicators(null);
  }

  const handleExportCsv = () => {
    if (!extractedIndicators || extractedIndicators.length === 0) return;

    const headers = ["Value", "Type", "Classification"];
    const rows = extractedIndicators.map(ind => [
      ind.value,
      ind.type,
      ind.is_internal ? "Private (RFC 1918)" : "Public"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "extracted_indicators.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans text-slate-100 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6 transform transition-all animate-in fade-in zoom-in-95 duration-300">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-blue-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Processing Payload</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {extractedIndicators ? "Analyzing the provided indicators using threat intelligence..." : "Extracting and deduplicating indicators from raw text..."}
              </p>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full w-full rounded-full animate-pulse transition-all duration-1000 ease-in-out origin-left" style={{ animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}></div>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-3xl w-full space-y-6 sm:space-y-8 transition-all duration-500 ${isProcessing ? 'opacity-40 blur-[2px] pointer-events-none scale-[0.98]' : 'opacity-100 scale-100'}`}>
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">Threat Intelligence Platform</h1>
          <p className="text-slate-400 text-sm sm:text-base px-4">Automated IOC extraction, enrichment, and deduplication for security researchers.</p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200">
              {extractedIndicators ? "Step 2: Review Indicators" : "Step 1: Bulk Indicator Ingestion"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!extractedIndicators ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="ioc-input" className="text-sm font-medium text-slate-400">
                    Paste Raw Source Data (CSVs, Logs, Malicious Emails)
                  </label>
                  <textarea
                    id="ioc-input"
                    className="w-full h-48 sm:h-64 bg-slate-950 border border-slate-800 rounded-md p-4 text-slate-300 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700 resize-none"
                    placeholder="Paste raw text here. The regex engine will automatically extract IPs, Domains, URLs, and Hashes..."
                    value={iocData}
                    onChange={(e) => setIocData(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-3 bg-slate-950/50 border border-slate-800 p-3 rounded-md transition-colors hover:border-slate-700">
                  <input
                    type="checkbox"
                    id="defang-toggle"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    checked={defang}
                    onChange={(e) => setDefang(e.target.checked)}
                  />
                  <label htmlFor="defang-toggle" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                    Automatically Defang Indicators (e.g., hxxp://, [.] )
                  </label>
                </div>

                <div className="bg-blue-950/30 border border-blue-900/50 rounded p-4 text-sm text-blue-400">
                  <strong>Note:</strong> Internal infrastructure spanning RFC 1918 (10.x, 172.16.x, 192.168.x) will be automatically flagged and excluded from public intelligence queries to prevent information disclosure.
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                  <div>
                    <p className="text-sm text-slate-300 font-medium">Found <span className="text-white font-bold">{extractedIndicators.length}</span> indicators</p>
                    <p className="text-xs text-slate-500 mt-1">Ready for threat intelligence enrichment</p>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[500px] sm:min-w-0">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-medium">Value</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {extractedIndicators.map((ind, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-slate-300 break-all">{ind.value}</td>
                          <td className="px-4 py-2.5">
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs border border-slate-700 uppercase tracking-wider">{ind.type}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            {ind.is_internal ? (
                              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">Private (RFC 1918)</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">Public</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 rounded-b-lg border-t border-slate-800 p-4 sm:p-6 gap-4">
            {!extractedIndicators ? (
              <div className="w-full flex justify-end">
                <Button
                  onClick={handleExtract}
                  disabled={isProcessing || !iocData.trim()}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Extract Indicators <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row w-full justify-between items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleExportCsv}
                    disabled={extractedIndicators.length === 0}
                    className="border-blue-700/50 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors flex items-center justify-center gap-2 px-4 py-2"
                  >
                    <Download className="h-4 w-4" /> Export CSV
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    disabled={isProcessing || extractedIndicators.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Start Analysis <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
