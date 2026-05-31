import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts if needed - for now using standard ones
// Font.register({ family: 'Inter', src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' });

const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingLeft: 30,
        paddingRight: 30,
        paddingBottom: 80,
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#4F46E5', // Indigo-600
        paddingBottom: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827', // Gray-900
    },
    subtitle: {
        fontSize: 10,
        color: '#6B7280', // Gray-500
        marginTop: 4,
    },
    metadataContainer: {
        marginTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    metadataItem: {
        marginBottom: 5,
    },
    metadataLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#9CA3AF', // Gray-400
        textTransform: 'uppercase',
    },
    metadataValue: {
        fontSize: 10,
        color: '#374151', // Gray-700
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    summaryCard: {
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderRadius: 4,
        borderLeftWidth: 4,
    },
    threatHigh: {
        borderLeftColor: '#EF4444', // Red-500
    },
    threatLow: {
        borderLeftColor: '#10B981', // Emerald-500
    },
    summaryText: {
        fontSize: 11,
        lineHeight: 1.5,
        color: '#374151',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 15,
    },
    statBox: {
        flex: 1,
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 4,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    statLabel: {
        fontSize: 7,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: 'row',
        minHeight: 25,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold',
    },
    tableCol: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCell: {
        fontSize: 7,
        color: '#374151',
        fontFamily: 'Courier', // For monospaced look on indicators
        paddingRight: 2,
    },
    badge: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 8,
        fontSize: 6,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    badgeHigh: {
        backgroundColor: '#FEE2E2',
        color: '#B91C1C',
    },
    badgeMedium: {
        backgroundColor: '#FEF3C7',
        color: '#92400E',
    },
    badgeLow: {
        backgroundColor: '#D1FAE5', // Emerald-100
        color: '#065F46', // Emerald-800
    },
    evidenceContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    evidenceImage: {
        maxWidth: '100%',
        maxHeight: 400,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 8,
        color: '#9CA3AF',
    },
});

interface ForensicReportProps {
    submissionId: string;
    analystId: string;
    generatedAt: string;
    report: {
        summary: {
            threat_level: string;
            total_indicators: number;
            malicious_found: number;
            campaign_tags: string[];
        };
        indicators: Array<{
            id: string;
            value: string;
            type: string;
            score: number;
            is_internal: boolean;
            ttp: string | null;
            campaign: string | null;
            asn: string | null;
            geoip: string | null;
            first_seen: string | null;
            last_seen: string | null;
            analysis_status: string;
            resolution_ip?: string | null;
            dns_records?: Array<{ type: string; value: string }>;
        }>;
    };
    evidenceImages?: Record<string, string>; // indicatorId -> ObjectURL or base64
    mapImage?: string;
    defangEnabled?: boolean;
}

const defangValue = (val: string) => {
    return val.replace(/http/g, 'hxxp').replace(/\./g, '[.]').replace(/@/g, '[@]');
};

const ForensicReport: React.FC<ForensicReportProps> = ({ submissionId, analystId, generatedAt, report, evidenceImages, mapImage, defangEnabled = true }) => {
    const getScoreBadgeStyle = (score: number) => {
        if (score > 5) return [styles.badge, styles.badgeHigh];
        if (score > 0) return [styles.badge, styles.badgeMedium];
        return [styles.badge, styles.badgeLow];
    };

    const getScoreLabel = (score: number) => {
        if (score > 5) return 'Malicious';
        if (score > 0) return 'Suspicious';
        return 'Clean';
    };

    return (
        <Document>
            {/* Live Malware Warning Disclaimer if defanging is disabled */}
            {!defangEnabled && (
                <Page size="A4" style={[styles.page, { backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={{ border: '4px solid #DC2626', padding: 40, alignItems: 'center', width: '100%' }}>
                        <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#DC2626', marginBottom: 20 }}>WARNING</Text>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#B91C1C', marginBottom: 30, textAlign: 'center' }}>
                            LIVE MALWARE INDICATORS EXPOSED
                        </Text>
                        <Text style={{ fontSize: 14, color: '#7F1D1D', textAlign: 'center', lineHeight: 1.5, marginBottom: 40 }}>
                            This forensic report was exported with sanitization (defanging) explicitly DISABLED.
                            The indicators contained within this document are raw, active, and fully clickable.
                            Interacting with these indicators carries a severe risk of compromise.
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#991B1B', textAlign: 'center' }}>
                            PROCEED WITH EXTREME CAUTION. DISTRIBUTE ONLY TO AUTHORIZED PERSONNEL.
                        </Text>
                    </View>
                </Page>
            )}

            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <Image src="/logo.png" style={{ width: 40, height: 40, borderRadius: 4 }} x-comment="ignore" />
                        <View>
                            <Text style={styles.title}>IOCenrich Forensics Report</Text>
                            <Text style={styles.subtitle}>Automated Threat Intelligence & Infrastructure Analysis</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.metadataLabel, { color: report.summary.threat_level === 'High' ? '#EF4444' : '#10B981' }]}>
                            {report.summary.threat_level === 'High' ? 'ENRICHED INTELLIGENCE - CRITICAL' : 'ENRICHED INTELLIGENCE - CLEAR'}
                        </Text>
                    </View>
                </View>

                {/* Metadata */}
                <View style={styles.metadataContainer}>
                    <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Submission ID</Text>
                        <Text style={styles.metadataValue}>{submissionId}</Text>
                    </View>
                    <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Analyst ID</Text>
                        <Text style={styles.metadataValue}>{analystId}</Text>
                    </View>
                    <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Generated At</Text>
                        <Text style={styles.metadataValue}>{generatedAt}</Text>
                    </View>
                </View>

                {/* Executive Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Executive Summary</Text>
                    <View style={[styles.summaryCard, report.summary.threat_level === 'High' ? styles.threatHigh : styles.threatLow]}>
                        <Text style={styles.summaryText}>
                            This forensic analysis identifies {report.summary.malicious_found} malicious indicators out of {report.summary.total_indicators} analyzed.
                            The overall system threat level is {report.summary.threat_level.toUpperCase()}.
                            {report.summary.threat_level === 'High' ?
                                " Immediate defensive action is recommended for all infrastructure associated with these indicators." :
                                ""}
                            {report.summary.campaign_tags.length > 0 && ` Associated TTPs: ${report.summary.campaign_tags.join(', ')}.`}
                        </Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{report.summary.total_indicators}</Text>
                            <Text style={styles.statLabel}>Total Indicators</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: report.summary.malicious_found > 0 ? '#EF4444' : '#10B981' }]}>
                                {report.summary.malicious_found}
                            </Text>
                            <Text style={styles.statLabel}>Malicious Detected</Text>
                        </View>

                        {/* Indicator Breakdown appended directly into the stats flex view */}
                        <View style={[styles.statBox, { flexDirection: 'row', justifyContent: 'space-around', gap: 10, flex: 2 }]}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.statValue}>{report.indicators.filter(i => i.type === 'ipv4' || i.type === 'ipv6').length}</Text>
                                <Text style={styles.statLabel}>IPs</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.statValue}>{report.indicators.filter(i => i.type === 'domain').length}</Text>
                                <Text style={styles.statLabel}>Domains</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.statValue}>{report.indicators.filter(i => i.type === 'url').length}</Text>
                                <Text style={styles.statLabel}>URLs</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.statValue}>{report.indicators.filter(i => i.type === 'hash').length}</Text>
                                <Text style={styles.statLabel}>Hashes</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Geographic Distribution */}
                {mapImage && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Geographic Distribution</Text>
                        <View style={styles.evidenceContainer}>
                            <Image src={mapImage} style={styles.evidenceImage} />
                        </View>
                    </View>
                )}

                {/* IP Addresses */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>IP Addresses</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={[styles.tableCol, { flex: 2.2 }]}><Text style={styles.tableCell}>Indicator</Text></View>
                            <View style={[styles.tableCol, { flex: 0.8 }]}><Text style={styles.tableCell}>Score</Text></View>
                            <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>ASN / Hosting</Text></View>
                            <View style={[styles.tableCol, { flex: 0.7 }]}><Text style={styles.tableCell}>Geo</Text></View>
                            <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>Temporal</Text></View>
                            <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>Status</Text></View>
                            <View style={[styles.tableCol, { flex: 0.9 }]}><Text style={styles.tableCell}>Context</Text></View>
                        </View>
                        {report.indicators.filter(i => i.type === 'ipv4' || i.type === 'ipv6').map((ind, idx) => (
                            <View key={idx} style={styles.tableRow} wrap={false}>
                                <View style={[styles.tableCol, { flex: 2.2 }]}><Text style={styles.tableCell}>{defangEnabled ? defangValue(ind.value) : ind.value}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.8, alignItems: 'center', justifyContent: 'center' }]}>
                                    <View style={getScoreBadgeStyle(ind.score)}>
                                        <Text style={{ fontSize: 6 }}>{getScoreLabel(ind.score)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>{ind.asn || 'N/A'}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.7 }]}><Text style={styles.tableCell}>{ind.geoip || 'N/A'}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>{ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'Unknown'}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>{ind.analysis_status}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.9 }]}><Text style={styles.tableCell}>{ind.is_internal ? 'Internal' : 'Public'}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>IOCenrich FORENSICS PLATFORM | CONFIDENTIAL</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `Page ${pageNumber} of ${totalPages}`
                    )} />
                </View>
            </Page>

            {/* Domains Page */}
            <Page size="A4" style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Domains</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={[styles.tableCol, { flex: 2.2 }]}><Text style={styles.tableCell}>Indicator</Text></View>
                            <View style={[styles.tableCol, { flex: 0.8 }]}><Text style={styles.tableCell}>Score</Text></View>
                            <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>ASN / Hosting</Text></View>
                            <View style={[styles.tableCol, { flex: 0.7 }]}><Text style={styles.tableCell}>Geo</Text></View>
                            <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>Temporal</Text></View>
                            <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>Status</Text></View>
                            <View style={[styles.tableCol, { flex: 1.1 }]}><Text style={styles.tableCell}>Res. IP</Text></View>
                        </View>
                        {report.indicators.filter(i => i.type === 'domain').map((ind, idx) => (
                            <View key={idx} style={styles.tableRow} wrap={false}>
                                <View style={[styles.tableCol, { flex: 2.2 }]}><Text style={styles.tableCell}>{defangEnabled ? defangValue(ind.value) : ind.value}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.8, alignItems: 'center', justifyContent: 'center' }]}>
                                    <View style={getScoreBadgeStyle(ind.score)}>
                                        <Text style={{ fontSize: 6 }}>{getScoreLabel(ind.score)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>{ind.asn || 'N/A'}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.7 }]}><Text style={styles.tableCell}>{ind.geoip || 'N/A'}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>{ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'Unknown'}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>{ind.analysis_status}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.1 }]}><Text style={styles.tableCell}>{ind.resolution_ip || 'N/A'}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>URLs</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={[styles.tableCol, { flex: 3 }]}><Text style={styles.tableCell}>Indicator</Text></View>
                            <View style={[styles.tableCol, { flex: 0.8 }]}><Text style={styles.tableCell}>Score</Text></View>
                            <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>ASN / Hosting</Text></View>
                            <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>Temporal</Text></View>
                            <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>Status</Text></View>
                            <View style={[styles.tableCol, { flex: 0.8 }]}><Text style={styles.tableCell}>Evid.</Text></View>
                        </View>
                        {report.indicators.filter(i => i.type === 'url').map((ind, idx) => (
                            <View key={idx} style={styles.tableRow} wrap={false}>
                                <View style={[styles.tableCol, { flex: 3 }]}><Text style={styles.tableCell}>{defangEnabled ? defangValue(ind.value) : ind.value}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.8, alignItems: 'center', justifyContent: 'center' }]}>
                                    <View style={getScoreBadgeStyle(ind.score)}>
                                        <Text style={{ fontSize: 6 }}>{getScoreLabel(ind.score)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>{ind.asn || 'N/A'}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>{ind.last_seen ? new Date(ind.last_seen).toLocaleDateString() : 'Unknown'}</Text></View>
                                <View style={[styles.tableCol, { flex: 1.2 }]}><Text style={styles.tableCell}>{ind.analysis_status}</Text></View>
                                <View style={[styles.tableCol, { flex: 0.8 }]}>
                                    <Text style={[styles.tableCell, { fontSize: 7, color: evidenceImages?.[ind.id] ? '#4F46E5' : '#9CA3AF' }]}>
                                        {evidenceImages?.[ind.id] ? 'Yes' : 'No'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hashes</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={[styles.tableCol, { flex: 4 }]}><Text style={styles.tableCell}>Indicator</Text></View>
                            <View style={[styles.tableCol, { flex: 1 }]}><Text style={styles.tableCell}>Score</Text></View>
                            <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>Status</Text></View>
                        </View>
                        {report.indicators.filter(i => i.type === 'hash').map((ind, idx) => (
                            <View key={idx} style={styles.tableRow} wrap={false}>
                                <View style={[styles.tableCol, { flex: 4 }]}><Text style={styles.tableCell}>{ind.value}</Text></View>
                                <View style={[styles.tableCol, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                                    <View style={getScoreBadgeStyle(ind.score)}>
                                        <Text style={{ fontSize: 6 }}>{getScoreLabel(ind.score)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.tableCol, { flex: 1.5 }]}><Text style={styles.tableCell}>{ind.analysis_status}</Text></View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>IOCenrich FORENSICS PLATFORM | CONFIDENTIAL</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `Page ${pageNumber} of ${totalPages}`
                    )} />
                </View>
            </Page>

            {/* Evidence Page(s) */}
            {evidenceImages && Object.keys(evidenceImages).length > 0 && (
                <Page size="A4" style={styles.page}>
                    <Text style={styles.sectionTitle}>Visual Evidence Artifacts</Text>
                    {Object.entries(evidenceImages).map(([id, url], idx) => (
                        <View key={id} style={styles.section} wrap={false}>
                            <Text style={{ fontSize: 10, marginBottom: 5, color: '#4B5563' }}>
                                Artifact #{idx + 1}: Screenshot for Indicator {report.indicators.find(i => i.id === id)?.value || id}
                            </Text>
                            <View style={styles.evidenceContainer}>
                                <Image src={url} style={styles.evidenceImage} />
                            </View>
                        </View>
                    ))}
                    <View style={styles.footer} fixed>
                        <Text style={styles.footerText}>IOCenrich FORENSICS PLATFORM | CONFIDENTIAL</Text>
                        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                            `Page ${pageNumber} of ${totalPages}`
                        )} />
                    </View>
                </Page>
            )}
        </Document>
    );
};

export default ForensicReport;
