
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChapterNote, SubjectId, PremiumQuestion } from "../types";

const SYSTEM_INSTRUCTION = `You are "Ace12thGRADE AI Master", a senior CBSE Board examiner. 

CORE MISSION:
- Provide 100% comprehensive coverage of the CBSE 2026 syllabus.
- For Physics/Maths/Chemistry: Formulas are the soul. Every formula MUST be on its own line.
- For every 'formula' or 'reaction' section, you MUST provide a detailed 'visualPrompt' describing a textbook diagram or a clean mathematical setup.

FORMULA RULES (FOLLOW STRICTLY):
- One formula per line.
- Use standard notations (e.g., E = mc²).
- If multiple formulas, separate with "---".
// Fixed: Escaped backtick in the string to prevent premature termination of the template literal, which was causing errors.
- Do not use markdown backticks (\`) for formulas, just plain text in a centered serif style.

IMAGE PROMPTING:
- 'visualPrompt' should be: "A professional, high-quality textbook diagram showing [concept], clean lines, white background, high contrast, labeled parts."

CLEANLINESS:
- No excessive emojis. 
- Professional, academic, and authoritative.`;

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

  const result = await retryRequest(async () => {
    // Fixed: Initializing GoogleGenAI instance right before use.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate deep master notes for "${chapterTitle}" (${subjectId}), Part ${part}/${totalParts}. 
      MANDATORY: For every section of type 'formula' or 'reaction', you MUST include a 'visualPrompt' describing a textbook diagram. 
      Ensure formulas are presented simply and clearly as per textbook standards.`,
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

  const result = await retryRequest(async () => {
    // Fixed: Initializing GoogleGenAI instance right before use.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate exactly 50 most repeated and predicted Board Exam questions for ${subjectId} (2026 Pattern). 
      Format: JSON array of objects.`,
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
  try {
    return await retryRequest(async () => {
      // Fixed: Initializing GoogleGenAI instance right before use.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `${prompt}. Clean textbook illustration, mathematical precision, high-quality diagram, 2D vector style, white background.` }] },
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
  try {
    // Fixed: Initializing GoogleGenAI instance right before use.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Professional explanation: ${text}` }] }],
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
