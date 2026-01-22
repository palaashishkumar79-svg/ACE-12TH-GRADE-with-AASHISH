
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChapterNote, SubjectId, PremiumQuestion } from "../types";

const APP_VERSION = "v2026_final_v4";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxZk4t427ZIKW1QksEDrk-K0lEJErNkc-G3KN7JUtIcXp0oDkqTqFnQNpdFKUya1trC/exec";

const SYSTEM_INSTRUCTION = `You are "Ace12thGRADE AI Master", a senior CBSE Board examiner. 

CORE MISSION:
- Provide 100% comprehensive coverage of the CBSE 2026 syllabus.
- Use natural, clean language. NO technical instructions, NO internal labels, and NO markdown symbols like "---" should ever be visible to the user.
- Use professional bullet points (•) and bold text (**) for key terms.

CONTENT RULES:
- IMPORTANT: When generating Premium Questions, you MUST provide exactly 40 highly repeated Board Exam questions.
- For each question, provide a 'visualPrompt' for a professional scientific diagram (no labels inside the prompt text).
- If a concept is hard, explain it in simple "Hinglish" logic inside a 'Trick' section.
- NEVER include strings like "visualPrompt:" or "Here is the content" in the actual output text.

Output MUST be valid JSON strictly matching the schema.`;

const NOTE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chapterTitle: { type: Type.STRING },
    subject: { type: Type.STRING },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['theory', 'formula', 'trick', 'reaction', 'code', 'summary', 'application', 'derivation', 'character_sketch', 'stanza_analysis'] },
          visualPrompt: { type: Type.STRING }
        },
        required: ['title', 'content', 'type']
      }
    },
    importantQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          solution: { type: Type.STRING },
          yearAnalysis: { type: Type.STRING }
        },
        required: ['question', 'solution', 'yearAnalysis']
      }
    }
  },
  required: ['chapterTitle', 'subject', 'sections', 'importantQuestions']
};

const PREMIUM_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING },
      question: { type: Type.STRING },
      solution: { type: Type.STRING },
      freqencyScore: { type: Type.NUMBER },
      repeatedYears: { type: Type.ARRAY, items: { type: Type.STRING } },
      visualPrompt: { type: Type.STRING }
    },
    required: ['type', 'question', 'solution', 'freqencyScore', 'repeatedYears', 'visualPrompt']
  }
};

export const savePurchaseToSheet = async (data: any) => {
  try {
    // Ensure email is lowercased for consistent lookup
    const payload = { ...data, email: data.email?.toLowerCase().trim() };
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("Purchase data sent to sync server.");
    return true;
  } catch (error) {
    console.error("Sheet save error:", error);
    return false;
  }
};

export const fetchPurchasesFromSheet = async (email: string): Promise<string[]> => {
  if (!email) return [];
  const cleanEmail = email.toLowerCase().trim();
  try {
    const response = await fetch(`${GOOGLE_SHEET_URL}?email=${encodeURIComponent(cleanEmail)}`);
    if (!response.ok) throw new Error("Sync server responded with an error.");
    
    const result = await response.json();
    console.log("Sync Response:", result);

    if (result && result.status === "success" && Array.isArray(result.data)) {
        // Fix: Explicitly type reduce to string[] to avoid unknown[] inference
        const allSubjects = result.data.reduce<string[]>((acc, curr: any) => {
            // Check for both 'productName' and case variations depending on how sheet headers are parsed
            const productStr = curr.productName || curr.Product || curr.Subject || "";
            if (!productStr) return acc;
            
            // Split by comma if multiple subjects were purchased together
            const subjects = productStr.split(',').map((s: string) => s.trim().toLowerCase());
            return [...acc, ...subjects];
        }, []);
        
        const uniqueSubjects = Array.from(new Set(allSubjects));
        console.log("Restored subjects:", uniqueSubjects);
        return uniqueSubjects;
    }
    return [];
  } catch (error) {
    console.error("Sync fetch error:", error);
    return [];
  }
};

export const generateChapterNotes = async (
  subjectId: SubjectId, 
  chapterTitle: string, 
  part: number,
  totalParts: number
): Promise<ChapterNote> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate MASTER notes for "${chapterTitle}" in ${subjectId}, Part ${part}/${totalParts}.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: NOTE_SCHEMA,
    },
  });
  return { ...JSON.parse(response.text || '{}'), part, subject: subjectId };
};

export const generatePremiumQuestions = async (subjectId: SubjectId): Promise<PremiumQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate EXACTLY 40 most repeated and predicted Board Exam questions for ${subjectId}. Use valid JSON only.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: PREMIUM_SCHEMA,
    },
  });
  return JSON.parse(response.text || '[]');
};

export const generateAestheticImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `${prompt}. Professional textbook diagram, scientific illustration.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Explain: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) { return null; }
};
