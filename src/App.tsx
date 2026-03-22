import React, { useState, useEffect } from 'react';
import { MotifSequenceViewer } from './components/MotifSequenceViewer';
import { Motif2DViewer } from './components/Motif2DViewer';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Dna, 
  Search, 
  Database, 
  Activity, 
  Layers, 
  ChevronRight, 
  Info, 
  AlertCircle,
  Microscope,
  FileText,
  Plus,
  X,
  RefreshCw,
  ShieldAlert,
  Target,
  FlaskConical,
  Box,
  Download,
  Eye,
  ArrowLeftRight,
  GitCompare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeMicrobialSystems } from './services/motifService';
import { Motif, AnalysisResult } from './types';
import { ConservationHeatmap } from './components/ConservationHeatmap';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [taxonomicInputs, setTaxonomicInputs] = useState<string[]>(['Escherichia coli', 'SARS-CoV-2']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'explorer' | 'heatmap' | 'predictions' | 'comparison'>('explorer');
  const [selectedMotif, setSelectedMotif] = useState<Motif | null>(null);
  const [comparisonSelection, setComparisonSelection] = useState<Motif[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [researchLogs, setResearchLogs] = useState<{timestamp: string, message: string}[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const addLog = (message: string) => {
    setResearchLogs(prev => [{ timestamp: new Date().toLocaleTimeString(), message }, ...prev].slice(0, 50));
  };

  const handleAddInput = () => {
    setTaxonomicInputs([...taxonomicInputs, '']);
  };

  const handleRemoveInput = (index: number) => {
    const newInputs = [...taxonomicInputs];
    newInputs.splice(index, 1);
    setTaxonomicInputs(newInputs);
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...taxonomicInputs];
    newInputs[index] = value;
    setTaxonomicInputs(newInputs);
  };

  const handleAnalyze = async () => {
    const validInputs = taxonomicInputs.filter(input => input.trim() !== '');
    if (validInputs.length === 0) return;

    setIsAnalyzing(true);
    addLog(`Initializing comparative analysis for: ${validInputs.join(', ')}`);
    try {
      addLog('Fetching genomic data from NCBI/RefSeq...');
      const data = await analyzeMicrobialSystems(validInputs);
      addLog(`Analysis complete. Identified ${data.motifs.length} conserved motifs.`);
      setResult(data);
      if (data.motifs.length > 0) setSelectedMotif(data.motifs[0]);
    } catch (error) {
      addLog(`ERROR: Analysis failed. ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('serif', 'italic');
    doc.text('Universal Functional Motif Mapper', 10, 20);
    doc.setFontSize(10);
    doc.setFont('sans', 'normal');
    doc.text(`Analysis Date: ${new Date().toLocaleString()}`, 10, 28);
    doc.text(`Taxonomic Targets: ${taxonomicInputs.join(', ')}`, 10, 34);
    doc.line(10, 38, pageWidth - 10, 38);

    // Summary
    doc.setFontSize(14);
    doc.setFont('serif', 'italic');
    doc.text('Evolutionary Analysis Summary', 10, 48);
    doc.setFontSize(10);
    doc.setFont('sans', 'normal');
    const summaryLines = doc.splitTextToSize(result.summary || 'No summary available.', pageWidth - 20);
    doc.text(summaryLines, 10, 56);

    // Motifs Table
    const tableData = (result.motifs || []).map(m => [
      m.id,
      m.name,
      m.type,
      m.function,
      `${(m.conservationScore * 100).toFixed(1)}%`,
      m.evolutionaryPersistence,
      m.antiviralStrategy?.inhibitorType || 'N/A'
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 80,
      head: [['ID', 'Name', 'Type', 'Function', 'Conservation', 'Persistence', 'Antiviral/Antibiotic Strategy']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 20, 20] }
    });

    // Detailed Motif Data
    let currentY = ((doc as any).lastAutoTable?.finalY || 80) + 20;
    (result.motifs || []).forEach((m, i) => {
      const functionLines = doc.splitTextToSize(`Function: ${m.function}`, pageWidth - 20);
      const sequenceLines = doc.splitTextToSize(`Sequence: ${m.sequence}`, pageWidth - 20);
      const strategyLines = doc.splitTextToSize(`Strategy: ${m.antiviralStrategy?.mechanismOfAction || 'N/A'}`, pageWidth - 20);
      
      const blockHeight = 10 + (functionLines.length * 5) + (sequenceLines.length * 5) + (strategyLines.length * 5);
      
      if (currentY + blockHeight > 280) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('serif', 'italic');
      doc.text(`${m.id}: ${m.name}`, 10, currentY);
      doc.setFontSize(8);
      doc.setFont('sans', 'normal');
      
      doc.text(functionLines, 10, currentY + 6);
      let nextY = currentY + 6 + (functionLines.length * 5);
      
      doc.text(sequenceLines, 10, nextY);
      nextY += (sequenceLines.length * 5);
      
      doc.text(strategyLines, 10, nextY);
      currentY = nextY + (strategyLines.length * 5) + 10;
    });

    // Predictions
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('serif', 'italic');
    doc.text('Testable Predictions', 10, currentY + 10);
    doc.setFontSize(10);
    doc.setFont('sans', 'normal');
    
    let predictionY = currentY + 20;
    (result.predictions || []).forEach((p, i) => {
      const pLines = doc.splitTextToSize(`${i + 1}. ${p}`, pageWidth - 20);
      const pHeight = pLines.length * 7;
      
      if (predictionY + pHeight > 280) {
        doc.addPage();
        predictionY = 20;
      }
      
      doc.text(pLines, 10, predictionY);
      predictionY += pHeight + 5;
    });

    // Add footers to all pages
    const pageCount = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('sans', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(`© 2026 Universal Functional Motif Mapper | Composed by Mr. Aman | Page ${i} of ${pageCount}`, 10, pageHeight - 10);
      doc.text('Data Sources: NCBI, PDB, UniProt, RefSeq', pageWidth - 10, pageHeight - 10, { align: 'right' });
    }

    doc.save('motif-mapper-report.pdf');
  };

  const heatmapData = result?.motifs?.flatMap(m => 
    (m.microbialSystems || []).map(s => ({
      system: s,
      motif: m.name,
      score: m.conservationScore
    }))
  ) || [];

  const toggleComparison = (motif: Motif, e: React.MouseEvent) => {
    e.stopPropagation();
    setComparisonSelection(prev => {
      const isSelected = prev.find(m => m.id === motif.id);
      if (isSelected) {
        return prev.filter(m => m.id !== motif.id);
      }
      if (prev.length >= 2) {
        return [prev[1], motif];
      }
      return [...prev, motif];
    });
  };

  const filteredMotifs = (result?.motifs || []).filter(motif => 
    (motif.id || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    (motif.name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    (motif.function || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="brutal-border-b p-6 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-none">
            <Dna className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif italic text-2xl leading-none">Universal Functional Motif Mapper</h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-50 mt-1">Comparative Microbial Genomics / Research Terminal v2.5 | Composed by Mr. Aman</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end justify-center px-4 border-r border-[#141414]/20">
            <span className="font-mono text-[8px] opacity-40 uppercase">System Status</span>
            <span className="font-mono text-[10px] text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
              OPERATIONAL
            </span>
          </div>
          <button 
            onClick={handleExportPDF}
            disabled={!result}
            className="font-mono text-[10px] uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </header>

      <main className="grid grid-cols-12 min-h-[calc(100vh-89px)]">
        {/* Sidebar Controls */}
        <aside className="col-span-3 brutal-border-r p-6 space-y-8 bg-white/50">
          <section>
            <div className="flex justify-between items-center mb-4">
              <label className="col-header">Taxonomic Targets</label>
              <button 
                onClick={handleAddInput}
                className="p-1 hover:bg-[#141414] hover:text-white transition-colors brutal-border"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {taxonomicInputs.map((input, index) => (
                <div key={index} className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] opacity-30">0{index + 1}</div>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    placeholder="Species, Genus, Phylum..."
                    className="w-full bg-transparent border border-[#141414] p-3 pl-10 text-xs font-mono focus:outline-none focus:bg-white transition-colors"
                  />
                  {taxonomicInputs.length > 1 && (
                    <button
                      onClick={() => handleRemoveInput(index)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || taxonomicInputs.every(i => !i.trim())}
            className="w-full bg-[#141414] text-[#E4E3E0] py-5 font-serif italic text-xl hover:bg-emerald-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 brutal-border"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Activity className="w-5 h-5" />
                <span>Execute Mapping</span>
              </>
            )}
          </button>

          {/* Research Log */}
          <section className="space-y-3">
            <label className="col-header">Research Terminal Logs</label>
            <div className="h-48 brutal-border bg-[#141414] p-3 font-mono text-[9px] text-emerald-500 overflow-y-auto space-y-1 scrollbar-hide">
              {researchLogs.length === 0 ? (
                <div className="opacity-40 italic">Waiting for system input...</div>
              ) : (
                researchLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="opacity-40 shrink-0">[{log.timestamp}]</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="p-4 bg-[#141414]/5 brutal-border border-dashed space-y-3">
            <div className="flex items-start gap-2">
              <Database className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed font-mono">
                [DATA_SOURCE] NCBI, UniProt, PDB, RefSeq
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed font-mono">
                [ALGO] Functional Conservation Mapping v2.5
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="col-span-9 flex flex-col">
          {/* Tabs */}
          <div className="flex brutal-border-b bg-white">
            {[
              { id: 'explorer', label: 'Motif Explorer', icon: Microscope },
              { id: 'comparison', label: 'Side-by-Side', icon: GitCompare },
              { id: 'heatmap', label: 'Conservation Map', icon: Layers },
              { id: 'predictions', label: 'Functional Predictions', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-8 py-4 font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 brutal-border-r transition-all",
                  activeTab === tab.id ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                <Search className="w-24 h-24" />
                <div>
                  <h2 className="text-2xl font-serif italic">Comparative Analysis Pending</h2>
                  <p className="text-sm">Enter taxonomic names and run discovery to fetch real-time conserved motifs.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'explorer' && (
                  <motion.div
                    key="explorer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-2 gap-8"
                  >
                    {/* Motif List */}
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-[#141414] pb-2">
                          <h3 className="col-header">Conserved Functional Motifs</h3>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-[8px] opacity-40 uppercase">Click <GitCompare className="w-2 h-2 inline" /> to compare</span>
                            <span className="font-mono text-[10px] opacity-40">{filteredMotifs.length} Results</span>
                          </div>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                          <input
                            type="text"
                            placeholder="Filter by ID, name, or function..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white brutal-border font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                        </div>
                      </div>
                      <div className="space-y-0 brutal-border bg-white divide-y divide-[#141414]">
                        {filteredMotifs.length > 0 ? (
                          filteredMotifs.map(motif => (
                            <div
                              key={motif.id}
                              onClick={() => setSelectedMotif(motif)}
                              className={cn(
                                "p-4 transition-all cursor-pointer group flex justify-between items-center",
                                selectedMotif?.id === motif.id ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                              )}
                            >
                              <div className="flex-1">
                                <div className="font-mono text-[8px] uppercase opacity-50 mb-1">{motif.type} Motif | {motif.id}</div>
                                <div className="text-lg font-serif italic group-hover:translate-x-1 transition-transform">{motif.name}</div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                <button
                                  onClick={(e) => toggleComparison(motif, e)}
                                  className={cn(
                                    "p-1.5 brutal-border transition-all",
                                    comparisonSelection.find(m => m.id === motif.id)
                                      ? "bg-emerald-500 text-white border-emerald-600"
                                      : "bg-white text-[#141414] hover:bg-[#141414] hover:text-white"
                                  )}
                                  title="Add to comparison"
                                >
                                  <GitCompare className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[8px] opacity-40 uppercase">Conservation</span>
                                  <span className="data-value text-sm">{(motif.conservationScore * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className={cn(
                                    "text-[8px] px-1.5 py-0.5 border uppercase font-mono",
                                    selectedMotif?.id === motif.id ? "border-[#E4E3E0]/30" : "border-[#141414]/20",
                                    motif.evolutionaryPersistence === 'High' ? "text-emerald-500" : ""
                                  )}>
                                    {motif.evolutionaryPersistence}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center opacity-40 italic text-xs">
                            No motifs match your search criteria
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed View */}
                    <div className="brutal-border p-8 bg-white space-y-8 overflow-y-auto max-h-[calc(100vh-250px)] shadow-[8px_8px_0px_0px_rgba(20,20,20,0.05)]">
                      {selectedMotif ? (
                        <>
                          <div className="flex justify-between items-start border-b border-[#141414] pb-6">
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-2">{selectedMotif.type} Sequence Motif</div>
                              <h2 className="text-4xl font-serif italic leading-tight">{selectedMotif.name}</h2>
                            </div>
                            <div className="flex gap-2">
                              {selectedMotif.structuralData?.pdbId && (
                                <a 
                                  href={`https://www.rcsb.org/structure/${selectedMotif.structuralData.pdbId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-12 h-12 brutal-border flex items-center justify-center hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                                  title="View in PDB"
                                >
                                  <Database className="w-6 h-6" />
                                </a>
                              )}
                              <div className={cn(
                                "w-12 h-12 brutal-border flex items-center justify-center",
                                selectedMotif.structuralData?.druggabilityScore && selectedMotif.structuralData.druggabilityScore > 0.7 ? "bg-emerald-500 text-white" : "bg-white"
                              )} title="Druggability Score">
                                <Target className="w-6 h-6" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-8">
                            <div className="space-y-3">
                              <label className="col-header flex items-center gap-2">
                                <Eye className="w-4 h-4" /> 2D Functional Schematic
                              </label>
                              <div className="brutal-border shadow-[4px_4px_0px_0px_rgba(20,20,20,0.1)]">
                                <Motif2DViewer motif={selectedMotif} />
                              </div>
                            </div>

                            <div className="grid grid-cols-12 gap-8">
                              <div className="col-span-7 space-y-6">
                                <div>
                                  <label className="col-header">Functional Annotation</label>
                                  <p className="text-sm leading-relaxed font-sans mt-2">{selectedMotif.function}</p>
                                </div>

                                <div>
                                  <label className="col-header">Simple Sequence View</label>
                                  <div className="mt-2 p-4 bg-[#141414] text-[#E4E3E0] font-mono text-xl tracking-[0.3em] brutal-border overflow-x-auto whitespace-nowrap">
                                    {selectedMotif.sequence}
                                  </div>
                                </div>

                                <div>
                                  <label className="col-header">Conserved Sequence Visualization</label>
                                  <div className="mt-3 p-6 bg-[#141414]/5 brutal-border border-dashed">
                                    <MotifSequenceViewer 
                                      sequence={selectedMotif.sequence} 
                                      type={selectedMotif.type} 
                                      domains={selectedMotif.functionalDomains}
                                    />
                                  </div>
                                </div>

                                {selectedMotif.functionalDomains && selectedMotif.functionalDomains.length > 0 && (
                                  <div className="space-y-3">
                                    <label className="col-header">Functional Domains</label>
                                    <div className="grid grid-cols-1 gap-2">
                                      {selectedMotif.functionalDomains.map((domain, i) => (
                                        <div key={i} className="p-3 brutal-border bg-white text-[10px] flex justify-between items-start">
                                          <div className="space-y-1">
                                            <div className="font-bold uppercase tracking-wider">{domain.name}</div>
                                            <div className="opacity-60 italic">{domain.description}</div>
                                          </div>
                                          <div className="font-mono bg-[#141414] text-white px-2 py-0.5 ml-4">
                                            POS {domain.start + 1}-{domain.end + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="col-span-5 space-y-6">
                                <div className="p-5 brutal-border bg-[#141414]/5 space-y-4">
                                  <label className="col-header flex items-center gap-2"><Box className="w-4 h-4" /> Structural Insight</label>
                                  <div className="space-y-3">
                                    <div className="font-mono text-[10px] flex justify-between">
                                      <span className="opacity-40">PDB ID</span>
                                      <span className="font-bold">{selectedMotif.structuralData?.pdbId || 'N/A'}</span>
                                    </div>
                                    <div className="font-mono text-[10px] flex justify-between">
                                      <span className="opacity-40">DRUGGABILITY</span>
                                      <span className="font-bold">{(selectedMotif.structuralData?.druggabilityScore || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="text-[10px] leading-relaxed opacity-70 italic border-t border-[#141414]/10 pt-2">
                                      {selectedMotif.structuralData?.secondaryStructure || 'No structural data available'}
                                    </div>
                                    {selectedMotif.structuralData?.bindingSites && (
                                      <div className="pt-2">
                                        <div className="text-[8px] uppercase opacity-40 font-mono mb-2">Binding Sites</div>
                                        <div className="flex flex-wrap gap-1">
                                          {(selectedMotif.structuralData?.bindingSites || []).map(site => (
                                            <span key={site} className="text-[8px] bg-[#141414] text-white px-2 py-1 font-mono">{site}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="p-5 brutal-border bg-rose-50 space-y-4">
                                  <label className="col-header flex items-center gap-2 text-rose-900"><ShieldAlert className="w-4 h-4" /> Therapeutic Strategy</label>
                                  <div className="space-y-3">
                                    <div className="text-xs font-bold text-rose-900 font-mono uppercase tracking-wider">{selectedMotif.antiviralStrategy?.inhibitorType || 'TBD'}</div>
                                    <p className="text-[10px] leading-relaxed text-rose-800/80 italic">{selectedMotif.antiviralStrategy?.mechanismOfAction || 'Strategy under evaluation'}</p>
                                    {selectedMotif.antiviralStrategy?.potentialTargets && (
                                      <div className="pt-2">
                                        <div className="text-[8px] uppercase opacity-40 text-rose-900/50 font-mono mb-2">Potential Targets</div>
                                        <div className="flex flex-wrap gap-1">
                                          {(selectedMotif.antiviralStrategy?.potentialTargets || []).map(target => (
                                            <span key={target} className="text-[8px] brutal-border border-rose-200 text-rose-800 px-2 py-1 font-mono bg-white">{target}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-6 border-t border-[#141414]/10">
                              <label className="col-header">Cross-Species Distribution</label>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {(selectedMotif.microbialSystems || []).map(s => (
                                  <span key={s} className="text-[9px] font-mono bg-[#141414] text-white px-3 py-1.5">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-4">
                          <FlaskConical className="w-16 h-16" />
                          <p>Select a motif from the explorer to initialize detailed characterization</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'comparison' && (
                  <motion.div
                    key="comparison"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-center brutal-border-b pb-4">
                      <div>
                        <h2 className="text-3xl font-serif italic">Side-by-Side Comparison</h2>
                        <p className="font-mono text-[10px] opacity-60">Analyze differences between selected functional motifs.</p>
                      </div>
                      {comparisonSelection.length > 0 && (
                        <button 
                          onClick={() => setComparisonSelection([])}
                          className="font-mono text-[10px] uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-4 py-2 hover:opacity-90 transition-opacity"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {comparisonSelection.length < 2 ? (
                      <div className="h-64 brutal-border bg-white flex flex-col items-center justify-center space-y-4 opacity-40">
                        <GitCompare className="w-12 h-12" />
                        <p className="text-sm font-sans">Select two motifs from the Explorer tab to compare them here.</p>
                        <button 
                          onClick={() => setActiveTab('explorer')}
                          className="text-xs font-mono underline hover:opacity-70"
                        >
                          Go to Explorer
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-8">
                        {comparisonSelection.map((motif, idx) => (
                          <div key={motif.id} className="brutal-border bg-white p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(20,20,20,0.05)]">
                            <div className="border-b border-[#141414] pb-4">
                              <div className="font-mono text-[8px] uppercase opacity-50 mb-1">Motif {idx + 1} | {motif.id}</div>
                              <h3 className="text-2xl font-serif italic">{motif.name}</h3>
                            </div>

                            <div className="brutal-border bg-[#141414]/5">
                              <Motif2DViewer motif={motif} />
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="col-header">Type & Persistence</label>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">{motif.type}</span>
                                  <span className={cn(
                                    "text-[10px] font-mono border border-[#141414] px-2 py-0.5",
                                    motif.evolutionaryPersistence === 'High' ? "text-emerald-600 border-emerald-600" : ""
                                  )}>{motif.evolutionaryPersistence} Persistence</span>
                                </div>
                              </div>

                              <div>
                                <label className="col-header">Functional Role</label>
                                <p className="text-xs leading-relaxed mt-1">{motif.function}</p>
                              </div>

                              <div>
                                <label className="col-header">Sequence</label>
                                <div className="mt-1 p-3 bg-[#141414]/5 brutal-border border-dashed font-mono text-[10px] break-all">
                                  {motif.sequence}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="col-header">Conservation</label>
                                  <div className="text-xl font-mono">{(motif.conservationScore * 100).toFixed(1)}%</div>
                                </div>
                                <div>
                                  <label className="col-header">Occurrences</label>
                                  <div className="text-xl font-mono">{motif.occurrenceCount}</div>
                                </div>
                              </div>

                              <div className="p-4 brutal-border bg-rose-50">
                                <label className="col-header text-rose-900">Therapeutic Strategy</label>
                                <div className="text-[10px] font-bold text-rose-900 mt-1 uppercase">{motif.antiviralStrategy?.inhibitorType}</div>
                                <p className="text-[9px] text-rose-800/80 italic mt-1">{motif.antiviralStrategy?.mechanismOfAction}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'heatmap' && (
                  <motion.div
                    key="heatmap"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-end brutal-border-b pb-4">
                      <div>
                        <h2 className="text-3xl font-serif italic">Comparative Conservation Map</h2>
                        <p className="font-mono text-[10px] opacity-60">Visualizing functional conservation across the specified taxonomic levels.</p>
                      </div>
                      <div className="flex items-center gap-6 font-mono text-[9px] uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#440154] brutal-border" /> 0.0
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-[#fde725] brutal-border" /> 1.0
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-12 brutal-border shadow-[12px_12px_0px_0px_rgba(20,20,20,0.05)]">
                      <ConservationHeatmap data={heatmapData} />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'predictions' && (
                  <motion.div
                    key="predictions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    <section className="space-y-6">
                      <h2 className="text-3xl font-serif italic brutal-border-b pb-4">Evolutionary Analysis Summary</h2>
                      <div className="p-8 bg-white brutal-border shadow-[8px_8px_0px_0px_rgba(20,20,20,0.05)]">
                        <p className="text-base leading-relaxed max-w-4xl font-sans">{result.summary}</p>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h2 className="text-3xl font-serif italic brutal-border-b pb-4">Testable Predictions</h2>
                      <div className="grid grid-cols-1 gap-6">
                        {(result.predictions || []).map((prediction, idx) => (
                          <div key={idx} className="p-6 brutal-border bg-white flex gap-6 items-start shadow-[4px_4px_0px_0px_rgba(20,20,20,0.05)] hover:translate-x-1 transition-transform">
                            <div className="w-10 h-10 bg-[#141414] text-[#E4E3E0] flex items-center justify-center shrink-0 font-serif italic text-xl brutal-border">
                              {idx + 1}
                            </div>
                            <p className="text-sm leading-relaxed font-sans">{prediction}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="p-8 brutal-border border-dashed bg-[#141414]/5">
                      <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" /> Biological Grounding & Validation
                      </h3>
                      <p className="text-xs leading-relaxed opacity-70 font-sans max-w-4xl">
                        These predictions are generated by integrating curated genomic (NCBI), proteomic (UniProt), and structural (PDB) data. 
                        The identified motifs represent minimal, evolutionarily persistent biological building blocks involved in replication, 
                        regulation, and host interaction. Experimental validation via site-directed mutagenesis or structural biology 
                        is recommended to confirm predicted functional roles.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-[#141414] p-4 bg-[#141414] text-[#E4E3E0] flex justify-between items-center text-[10px] uppercase tracking-[0.2em]">
        <div>System Status: Operational</div>
        <div>Data Sources: NCBI, PDB, UniProt, RefSeq</div>
        <div className="flex gap-4">
          <span className="opacity-50">© 2026 Universal Functional Motif Mapper | Composed by Mr. Aman</span>
        </div>
      </footer>

      <style>{`
        .data-row {
          display: block;
          padding: 1rem;
          border: 1px solid #141414;
          transition: background 0.2s ease, color 0.2s ease;
          cursor: pointer;
        }
        .data-row:hover {
          background: #141414;
          color: #E4E3E0;
        }
        .col-header {
          font-family: 'Georgia', serif;
          font-style: italic;
          font-size: 11px;
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .data-value {
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: -0.02em;
        }
      `}</style>
    </div>
  );
}
