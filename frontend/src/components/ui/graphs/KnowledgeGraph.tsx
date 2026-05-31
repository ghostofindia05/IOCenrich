"use client"

import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-expect-error missing types for cytoscape-fcose
import fcose from 'cytoscape-fcose';

cytoscape.use(fcose);

interface NodeData {
    id: string;
    label: string;
    type: 'hash' | 'ip' | 'domain' | 'url';
}

interface EdgeData {
    source: string;
    target: string;
    label?: string;
}

interface KnowledgeGraphProps {
    nodes: NodeData[];
    edges: EdgeData[];
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ nodes, edges }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Map props to Cytoscape elements array format
        const elements = [
            ...nodes.map(n => ({ data: n })),
            ...edges.map(e => ({ data: e }))
        ];

        const cy = cytoscape({
            container: containerRef.current,
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#475569',
                        'label': 'data(label)',
                        'color': '#f8fafc',
                        'font-size': '12px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'border-width': 2,
                        'border-color': '#1e293b',
                        'width': '60px',
                        'height': '60px'
                    }
                },
                {
                    selector: 'node[type = "hash"]',
                    style: { 'background-color': '#ef4444' } // Red
                },
                {
                    selector: 'node[type = "ip"]',
                    style: { 'background-color': '#eab308' } // Yellow
                },
                {
                    selector: 'node[type = "domain"]',
                    style: { 'background-color': '#3b82f6' } // Blue
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#94a3b8',
                        'target-arrow-color': '#94a3b8',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': '10px',
                        'text-rotation': 'autorotate',
                        'color': '#cbd5e1'
                    }
                }
            ],
            layout: {
                name: 'fcose',
                randomize: true,
                animate: true,
                fit: true,
                padding: 30
            } as cytoscape.LayoutOptions
        });

        return () => {
            cy.destroy();
        };
    }, [nodes, edges]);

    return <div ref={containerRef} className="w-full h-[500px] border border-slate-700 rounded-lg bg-slate-900" />;
};
