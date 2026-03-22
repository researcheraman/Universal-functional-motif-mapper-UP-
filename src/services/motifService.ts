import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED")) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeMicrobialSystems(taxonomicNames: string[]): Promise<AnalysisResult> {
  return withRetry(async () => {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a comprehensive comparative functional motif analysis for the following microbial systems (species, genus, class, order, phylum, or kingdom):
      Systems: ${taxonomicNames.join(", ")}
      
      Task:
      1. Identify and characterize ALL possible conserved DNA, RNA, and protein motifs (aim for 15-20 distinct motifs).
      2. Ensure the "sequence" field contains a REAL biological sequence (e.g., "TATA", "KDEL", "RGD", "GTTAC", etc.).
      3. Prioritize functional conservation over sequence similarity.
      4. Integrate knowledge from curated genomic (NCBI), proteomic, and structural (PDB) databases.
      5. Focus on minimal, evolutionarily persistent biological building blocks involved in replication, regulation, and host interaction.
      6. Identify specific functional domains or sub-regions within the sequence.
      7. Provide statistical validation and biological grounding for each motif.
      8. Evaluate the "Druggability" of each motif for antiviral or antibiotic development.
      9. Propose specific therapeutic strategies (e.g., small molecule inhibitors, antisense oligos, peptide mimetics, or antibiotic classes).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            motifs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  sequence: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["DNA", "RNA", "Protein"] },
                  function: { type: Type.STRING },
                  conservationScore: { type: Type.NUMBER },
                  occurrenceCount: { type: Type.INTEGER },
                  microbialSystems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  evolutionaryPersistence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  functionalDomains: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        start: { type: Type.INTEGER, description: "0-based start index" },
                        end: { type: Type.INTEGER, description: "0-based end index" },
                        description: { type: Type.STRING }
                      },
                      required: ["name", "start", "end", "description"]
                    }
                  },
                  structuralData: {
                    type: Type.OBJECT,
                    properties: {
                      pdbId: { type: Type.STRING },
                      secondaryStructure: { type: Type.STRING },
                      bindingSites: { type: Type.ARRAY, items: { type: Type.STRING } },
                      druggabilityScore: { type: Type.NUMBER }
                    }
                  },
                  antiviralStrategy: {
                    type: Type.OBJECT,
                    properties: {
                      inhibitorType: { type: Type.STRING },
                      mechanismOfAction: { type: Type.STRING },
                      potentialTargets: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                },
                required: ["id", "name", "sequence", "type", "function", "conservationScore", "occurrenceCount", "microbialSystems", "evolutionaryPersistence"]
              }
            },
            summary: { type: Type.STRING },
            predictions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["motifs", "summary", "predictions"]
        }
      }
    });

    return JSON.parse(response.text);
  });
}
