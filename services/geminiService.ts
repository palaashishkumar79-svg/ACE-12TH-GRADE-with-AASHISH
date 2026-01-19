
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChapterNote, SubjectId, PremiumQuestion } from "../types";

const APP_VERSION = "v2026_final_v1";

const SYSTEM_INSTRUCTION = `You are "Ace12thGRADE AI Master", a senior CBSE Board examiner. 

CORE MISSION:
- Provide 100% comprehensive coverage of the CBSE 2026 syllabus.
- Use natural, clean language. NO technical instructions (like "visualPrompt:", "---", or "\n") should ever be visible in the final text.
- Use professional bullet points (•) and bold text (**) for key terms.
- For Physics/Maths/Chemistry: Ensure formulas are clear and easy to read.

FORMATTING RULES:
- DO NOT use "---" for separation. Use standard new lines.
- DO NOT mention "visualPrompt" inside the content/solution field. Keep it ONLY in the specific 'visualPrompt' JSON field.
- If a concept is hard, explain it in simple "Hinglish" logic inside a 'Trick' section.

IMAGE PROMPTING:
- 'visualPrompt' must be a vivid description for an AI Image Generator: "Textbook style scientific diagram of [concept], 4k, clean white background, professional labels, high contrast, black and white sketch style."

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
          visualPrompt: { type: Type.STRING, description: "Only describe the image here. Do not repeat this in 'content'." }
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
      visualPrompt: { type: Type.STRING, description: "A description of a diagram for this specific problem." }
    },
    required: ['type', 'question', 'solution', 'freqencyScore', 'repeatedYears', 'visualPrompt']
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
  totalParts: number,
  forceRefresh = false
): Promise<ChapterNote> => {
  const cacheKey = `note_${APP_VERSION}_${subjectId}_${chapterTitle.replace(/\s+/g, '_')}_${part}`;
  
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const result = await retryRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate MASTER notes for "${chapterTitle}" in ${subjectId}, Part ${part}/${totalParts}. Focus on accuracy and point-wise layout.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: NOTE_SCHEMA,
      },
    });
    
    const parsed = JSON.parse(response.text || '{}');
    const finalNote = { ...parsed, part, subject: subjectId };
    localStorage.setItem(cacheKey, JSON.stringify(finalNote));
    return finalNote;
  });
  return result;
};

export const generatePremiumQuestions = async (subjectId: SubjectId, forceRefresh = false): Promise<PremiumQuestion[]> => {
  const cacheKey = `premium_${APP_VERSION}_${subjectId}`;
  
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const result = await retryRequest(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate exactly 50 most repeated Board Exam questions for ${subjectId} (2026 Pattern). Include diagrams and high-yield solutions.`,
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
  if (!prompt || prompt.length < 5) return null;
  const cacheKey = `img_${btoa(prompt.substring(0, 50)).replace(/[/+=]/g, '')}`;
  
  if (!force) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  }

  try {
    return await retryRequest(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `${prompt}. Scientific textbook diagram, high contrast, white background.` }] },
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Explain this board concept clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) { return null; }
};
