import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractMetricsFromRFP(textContext: string) {
  const prompt = `
    You are an expert project estimator for a 3D Laser Scanning company.
    Read the following email body and/or attached RFP text.
    Extract the total area (in square meters). If it is in sq ft, convert to sqm (1 sqft = 0.0929 sqm). If not explicitly stated, estimate it based on the dimensions or scope described, but try to find the exact number.
    Extract the complexity of the site (Options: "Standard", "Civil Infrastructure", "Industrial Facility / Plant", "Mining (Surface)", "Mining (Underground)").
    Extract the requested deliverables (Options: "viewer", "cad", "topo", "bim"). If they want 2D models/drawings, select "cad". If they want 3D models/Revit/BIM, select "bim".
    Extract the client's name, company, and project name if available.
    
    Respond STRICTLY in the following JSON format, with no markdown formatting or extra text:
    {
      "name": "John Doe",
      "company": "ABC Architects",
      "project": "Sandton Mall Upgrade",
      "area": 15000,
      "complexity": "Standard",
      "deliverables": ["viewer", "cad", "bim"]
    }

    RFP TEXT:
    ${textContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || "{}";
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return null;
  }
}
