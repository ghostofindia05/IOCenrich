"use client"

import * as React from "react"
import { X } from "lucide-react"

interface DialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                {children}
            </div>
        </div>
    )
}

export function DialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`p-6 ${className}`}>{children}</div>
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
    return <div className="mb-4">{children}</div>
}

export function DialogTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>
}

export function DialogDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <p className={`text-sm text-slate-400 ${className}`}>{children}</p>
}

export function DialogFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`mt-6 flex justify-end gap-3 ${className}`}>{children}</div>
}
