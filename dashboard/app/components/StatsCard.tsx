import React from 'react';

export function StatsCard({ title, value, subtext, icon }: { title: string; value: string; subtext?: string; icon?: string }) {
    return (
        <div className="bg-[#1b2427] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-2">
                {icon && (
                    <div className="w-10 h-10 rounded-lg bg-[#3abff8]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#3abff8]">{icon}</span>
                    </div>
                )}
                <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-xl font-bold">{value}</p>
                </div>
            </div>
            {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
        </div>
    );
}
