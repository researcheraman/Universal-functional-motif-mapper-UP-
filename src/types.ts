export interface Motif {
  id: string;
  name: string;
  sequence: string;
  type: 'DNA' | 'RNA' | 'Protein';
  function: string;
  conservationScore: number;
  occurrenceCount: number;
  microbialSystems: string[];
  structuralData?: {
    pdbId?: string;
    secondaryStructure?: string;
    bindingSites?: string[];
    druggabilityScore?: number; // 0-1
  };
  antiviralStrategy?: {
    inhibitorType?: string;
    mechanismOfAction?: string;
    potentialTargets?: string[];
  };
  evolutionaryPersistence: 'High' | 'Medium' | 'Low';
  functionalDomains?: {
    name: string;
    start: number;
    end: number;
    description: string;
  }[];
}

export interface AnalysisResult {
  motifs: Motif[];
  summary: string;
  predictions: string[];
}
