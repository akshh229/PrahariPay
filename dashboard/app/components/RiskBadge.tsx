import React from 'react';

export function RiskBadge({ classification }: { classification: string }) {
    const styles: Record<string, string> = {
        'Valid': 'bg-emerald-500/10 text-emerald-400',
        'Likely Honest Conflict': 'bg-[#3abff8]/10 text-[#3abff8]',
        'Suspicious': 'bg-amber-500/10 text-amber-400',
        'Likely Fraud': 'bg-red-500/10 text-red-400',
    };

    const badge = styles[classification] || 'bg-slate-700/50 text-slate-400';

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badge}`}>
            {classification || 'Unknown'}
        </span>
    );
}
