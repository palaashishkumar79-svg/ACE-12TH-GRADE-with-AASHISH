
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChapterNote, SubjectId, PremiumQuestion } from "../types";

const SYSTEM_INSTRUCTION = `You are "Ace12thGRADE AI Master", a senior CBSE Board examiner and veteran teacher. 

CORE MISSION:
- Provide 100% comprehensive coverage of the CBSE 2026 competency-based syllabus.
- For Physics/Maths/Chemistry: Ensure EVERY single formula, unit, and dimension is included.
- For Computer Science: Ensure code logic is robust and follows latest PEP8/standards.
- For Literature: Provide deep character analysis and thematic depth.

FORMULA & CALCULATION RULES:
- When providing formulas, list them clearly. If there are multiple formulas in one section, separate them with "---" on a new line.
- Each formula must include its SI unit and what each variable represents.

EXPLANATION STYLE:
- Depth & Precision: Provide comprehensive details. Never skip steps in derivations.
- "Explain it like I'm 5": Use simple logic first, then provide full technical rigour.
- Real-World Connect: Link concepts to competency-based applications.

CLEANLINESS:
- NO DECORATIVE SYMBOLS. BOLD ONLY FOR KEY TERMS.
- NCERT & SYLLABUS ALIGNED (2025-26).`;

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
    }
  },
  required: ['chapterTitle', 'subject', 'sections']
};

const PREMIUM_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: "MCQ, CASE-STUDY, LONG-ANS, ASSERTION-REASON, or SHORT-ANS" },
      question: { type: Type.STRING },
      solution: { type: Type.STRING },
      freqencyScore: { type: Type.NUMBER },
      repeatedYears: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['type', 'question', 'solution', 'freqencyScore', 'repeatedYears']
  }
};

async function retryRequest<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status === 503 || error.status === 500)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateChapterNotes = async (
  subjectId: SubjectId, 
  chapterTitle: string, 
  part: number,
  totalParts: number
): Promise<ChapterNote> => {
  const cacheKey = `note_v2026_full_${subjectId}_${chapterTitle}_${part}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const result = await retryRequest(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide deep, comprehensive master notes for chapter "${chapterTitle}" (${subjectId}), Part ${part}/${totalParts}. 
      SPECIAL INSTRUCTION: Ensure ALL relevant formulas and equations for this part are covered in high detail. 
      If section is 'formula', separate different equations with '---'. Focus on CBSE 2026 competency standards. Do not include questions.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: NOTE_SCHEMA,
      },
    });
    const parsed = JSON.parse(response.text || '{}');
    const finalNote = { ...parsed, part, importantQuestions: [] };
    localStorage.setItem(cacheKey, JSON.stringify(finalNote));
    return finalNote;
  });
  return result;
};

export const generatePremiumQuestions = async (subjectId: SubjectId): Promise<PremiumQuestion[]> => {
  const cacheKey = `premium_vault_v2026_elite_${subjectId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const result = await retryRequest(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a list of exactly 50 most repeated and predicted Board Exam questions for ${subjectId} (2026 Pattern). 
      Make solutions extremely detailed, using logic-first approach. Case studies must be competency-based.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: PREMIUM_SCHEMA,
      },
    });
    const parsed = JSON.parse(response.text || '[]');
    localStorage.setItem(cacheKey, JSON.stringify(parsed));
    return parsed;
  });
  return result;
};

export const generateAestheticImage = async (prompt: string, force = false): Promise<string | null> => {
  const cacheKey = `img_${btoa(prompt).slice(0, 32)}`;
  if (!force) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    return await retryRequest(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `${prompt}. Educational technical diagram, professional, high contrast, white background.` }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const data = `data:image/png;base64,${part.inlineData.data}`;
          localStorage.setItem(cacheKey, data);
          return data;
        }
      }
      return null;
    });
  } catch (e) { return null; }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Explain this board exam concept professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
};
