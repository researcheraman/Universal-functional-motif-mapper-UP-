import React from 'react';
import { Motif } from '../types';

interface Motif2DViewerProps {
  motif: Motif;
}

export const Motif2DViewer: React.FC<Motif2DViewerProps> = ({ motif }) => {
  const sequence = motif.sequence;
  const type = motif.type;
  const domains = motif.functionalDomains || [];
  
  return (
    <div className="p-8 bg-white flex flex-col items-center justify-center min-h-[240px] relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#141414 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <div className="relative w-full max-w-lg h-32 flex items-center">
        {/* Main backbone */}
        <div className="absolute w-full h-0.5 bg-[#141414]/20 rounded-full" />
        
        {/* Domain highlights on backbone */}
        {domains.map((domain, i) => {
          const left = (domain.start / sequence.length) * 100;
          const width = ((domain.end - domain.start + 1) / sequence.length) * 100;
          return (
            <div 
              key={i}
              className="absolute h-1 bg-[#141414] rounded-full z-10"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${domain.name}: ${domain.description}`}
            />
          );
        })}
        
        {/* Sequence markers */}
        <div className="relative w-full flex justify-between px-4">
          {sequence.split('').map((char, i) => {
            const isDomain = domains.some(d => i >= d.start && i <= d.end);
            return (
              <div key={i} className="flex flex-col items-center group relative">
                {/* Connector */}
                <div className={`w-px h-4 mb-1 ${isDomain ? 'bg-[#141414]' : 'bg-[#141414]/20'}`} />
                
                {/* Node */}
                <div className={`w-3 h-3 brutal-border rotate-45 mb-2 transition-transform group-hover:scale-125 ${
                  isDomain ? 'bg-[#141414] text-white' : (
                    type === 'Protein' ? 'bg-emerald-400' : 
                    type === 'DNA' ? 'bg-amber-400' : 'bg-indigo-400'
                  )
                }`} />
                
                {/* Label */}
                <div className={`font-mono text-[9px] font-bold ${isDomain ? 'text-[#141414]' : 'text-[#141414]/60'}`}>
                  {char}
                </div>
                
                {/* Position */}
                <div className="absolute -top-6 font-mono text-[7px] opacity-30 group-hover:opacity-100 transition-opacity">
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-12 grid grid-cols-3 gap-12 w-full text-[10px] font-mono border-t border-[#141414]/10 pt-6">
        <div className="space-y-1">
          <div className="opacity-40 uppercase text-[8px]">Architecture</div>
          <div className="font-bold flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              type === 'Protein' ? 'bg-emerald-500' : 
              type === 'DNA' ? 'bg-amber-500' : 'bg-indigo-500'
            }`} />
            {type} Chain
          </div>
        </div>
        <div className="space-y-1">
          <div className="opacity-40 uppercase text-[8px]">Complexity</div>
          <div className="font-bold">{sequence.length} Units</div>
        </div>
        <div className="space-y-1">
          <div className="opacity-40 uppercase text-[8px]">Persistence</div>
          <div className="font-bold text-emerald-600">{motif.evolutionaryPersistence}</div>
        </div>
      </div>
    </div>
  );
};
