import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MotifSequenceViewerProps {
  sequence: string;
  type: 'DNA' | 'RNA' | 'Protein';
  domains?: {
    name: string;
    start: number;
    end: number;
    description: string;
  }[];
}

const getResidueColor = (residue: string, type: 'DNA' | 'RNA' | 'Protein', isHighlighted: boolean) => {
  if (isHighlighted) return 'bg-[#141414] text-white ring-2 ring-offset-2 ring-[#141414]';

  if (type === 'Protein') {
    const hydrophobic = ['A', 'V', 'L', 'I', 'M', 'F', 'W', 'P'];
    const polar = ['S', 'T', 'C', 'Y', 'N', 'Q'];
    const positive = ['K', 'R', 'H'];
    const negative = ['D', 'E'];
    
    if (hydrophobic.includes(residue)) return 'bg-slate-200 text-slate-800';
    if (polar.includes(residue)) return 'bg-emerald-100 text-emerald-800';
    if (positive.includes(residue)) return 'bg-blue-100 text-blue-800';
    if (negative.includes(residue)) return 'bg-rose-100 text-rose-800';
    return 'bg-gray-100 text-gray-600';
  } else {
    const purines = ['A', 'G'];
    const pyrimidines = ['C', 'T', 'U'];
    
    if (purines.includes(residue)) return 'bg-amber-100 text-amber-800';
    if (pyrimidines.includes(residue)) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-600';
  }
};

export const MotifSequenceViewer: React.FC<MotifSequenceViewerProps> = ({ sequence, type, domains = [] }) => {
  return (
    <div className="flex flex-wrap gap-2 font-mono text-[10px]">
      {sequence.split('').map((residue, idx) => {
        const domain = domains.find(d => idx >= d.start && idx <= d.end);
        return (
          <div
            key={idx}
            className={cn(
              "w-7 h-10 flex flex-col items-center justify-center brutal-border font-bold shadow-[2px_2px_0px_0px_rgba(20,20,20,0.1)] transition-all relative group",
              getResidueColor(residue.toUpperCase(), type, !!domain)
            )}
            title={domain ? `${domain.name}: ${domain.description}` : `${residue} at position ${idx + 1}`}
          >
            <span className="text-[8px] opacity-40 absolute top-0.5">{idx + 1}</span>
            <span className="mt-1">{residue}</span>
            {domain && (
              <div className="absolute -bottom-1 w-full h-0.5 bg-white/50" />
            )}
          </div>
        );
      })}
    </div>
  );
};
