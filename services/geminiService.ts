
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChapterNote, SubjectId, PremiumQuestion, VaultData } from "../types";

const DB_NAME = "Ace12thCache_v5"; 
const NOTES_STORE = "notes";
const IMAGE_STORE = "images";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxZk4t427ZIKW1QksEDrk-K0lEJErNkc-G3KN7JUtIcXp0oDkqTqFnQNpdFKUya1trC/exec";

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5);
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) db.createObjectStore(NOTES_STORE);
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedData = async (storeName: string, key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const setCachedData = async (storeName: string, key: string, data: any): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.put(data, key);
    transaction.oncomplete = () => resolve();
  });
};

const SYSTEM_INSTRUCTION = `You are "Ace12thGRADE AI Master", a senior CBSE Board examiner (2026 Batch). 

CORE MISSION:
- Provide 100% comprehensive coverage of the CBSE 2026 syllabus.
- Use bullet points (•) and bold text (**) for keywords.
- Language: Professional Hinglish (Hindi explanations in English script).

CONTENT RULES:
- FREE PREVIEW: Always include exactly 2-3 sample questions only.
- PREMIUM VAULT: EXACTLY 40 diverse questions + a Master Quick Revision suite.
- REVISION MASTER: Includes a 300-word Chapter/Subject Summary, all critical Formulas, and 10 small "Topper Points" (short facts).

Output MUST be valid JSON strictly matching the requested schema.`;

const VAULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    revision: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Detailed 300-word subject/chapter overview." },
        formulas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "All crucial formulas and equations." },
        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 Small, high-yield points for quick memory." }
      },
      required: ['summary', 'formulas', 'keyPoints']
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          solution: { type: Type.STRING },
          repeatedYears: { type: Type.ARRAY, items: { type: Type.STRING } },
          frequencyScore: { type: Type.NUMBER }
        },
        required: ['question', 'solution', 'repeatedYears']
      }
    }
  },
  required: ['revision', 'questions']
};

export const generateChapterNotes = async (
  subjectId: SubjectId, 
  chapterTitle: string, 
  part: number,
  totalParts: number,
  forceRefresh: boolean = false
): Promise<ChapterNote> => {
  const cacheKey = `${subjectId}_${chapterTitle}_p${part}`;
  if (!forceRefresh) {
    const cached = await getCachedData(NOTES_STORE, cacheKey);
    if (cached) return cached;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate MASTER notes for "${chapterTitle}" in ${subjectId}, Part ${part}/${totalParts}. Focus on 2026 Boards.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });
  
  const noteData = { ...JSON.parse(response.text || '{}'), part, subject: subjectId };
  await setCachedData(NOTES_STORE, cacheKey, noteData);
  return noteData;
};

export const generatePremiumQuestions = async (subjectId: SubjectId, forceRefresh: boolean = false): Promise<VaultData> => {
  const cacheKey = `vault_v5_${subjectId}`;
  if (!forceRefresh) {
    const cached = await getCachedData(NOTES_STORE, cacheKey);
    if (cached) return cached;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate the "Full Master Vault" for ${subjectId}. Include: 
    1. Quick Revision Master (Summary, Formulas, 10 Small Points).
    2. 40 Predicted Questions for 2026 Board Exams.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: VAULT_SCHEMA,
    },
  });
  
  const vaultData = JSON.parse(response.text || '{}');
  await setCachedData(NOTES_STORE, cacheKey, vaultData);
  return vaultData;
};

export const savePurchaseToSheet = async (data: any) => {
  try {
    const payload = { ...data, email: data.email?.toLowerCase().trim(), timestamp: new Date().toISOString() };
    // Using a more reliable fetch approach for background sync
    await fetch(GOOGLE_SHEET_URL, { 
      method: "POST", 
      mode: "no-cors", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(payload) 
    });
    return true;
  } catch (error) { return false; }
};

export const fetchPurchasesFromSheet = async (email: string): Promise<string[]> => {
  if (!email) return [];
  const cleanEmail = email.toLowerCase().trim();
  try {
    const response = await fetch(`${GOOGLE_SHEET_URL}?email=${encodeURIComponent(cleanEmail)}`);
    if (!response.ok) return [];
    const result = await response.json();
    if (result && result.status === "success" && Array.isArray(result.data)) {
        const allSubjects: string[] = result.data.reduce((acc: string[], curr: any) => {
            const productStr = curr.productName || curr.Product || curr.Subject || "";
            if (!productStr) return acc;
            const subjects = productStr.split(',').map((s: string) => s.trim().toLowerCase());
            return [...acc, ...subjects];
        }, [] as string[]);
        return Array.from(new Set(allSubjects));
    }
    return [];
  } catch (error) { return []; }
};

export const prefetchChapterPart = async (subjectId: SubjectId, title: string, part: number, total: number) => {
  const cacheKey = `${subjectId}_${title}_p${part}`;
  const cached = await getCachedData(NOTES_STORE, cacheKey);
  if (!cached) generateChapterNotes(subjectId, title, part, total).catch(() => {});
};

export const generateAestheticImage = async (prompt: string): Promise<string | null> => {
  const cacheKey = `img_${prompt.substring(0, 50)}`;
  const cachedImg = await getCachedData(IMAGE_STORE, cacheKey);
  if (cachedImg) return cachedImg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `${prompt}. Professional academic diagram, clean white background, high contrast.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        await setCachedData(IMAGE_STORE, cacheKey, base64);
        return base64;
      }
    }
    return null;
  } catch (e) { return null; }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Explain this board topic clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) { return null; }
};
