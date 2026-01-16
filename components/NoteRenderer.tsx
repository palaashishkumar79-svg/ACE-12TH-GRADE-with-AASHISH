
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChapterNote, NoteSection } from '../types';
import { generateAestheticImage, generateSpeech } from '../services/geminiService';

// Audio Utility Functions
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export interface FormattedTextProps {
  text: string;
  className?: string;
  isEditable?: boolean;
  onUpdate?: (newVal: string) => void;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "", isEditable, onUpdate }) => {
  const [localText, setLocalText] = useState(text);
  useEffect(() => { setLocalText(text); }, [text]);

  if (isEditable) {
    return (
      <textarea 
        className={`${className} w-full bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-indigo-400 p-2 rounded outline-none font-bold`}
        value={localText}
        onChange={(e) => {
          setLocalText(e.target.value);
          onUpdate?.(e.target.value);
        }}
        rows={Math.max(3, localText.split('\n').length)}
      />
    );
  }

  const elements = useMemo(() => {
    if (!text) return "";
    const clean = text.replace(/\\/g, ''); 
    const parts = clean.split(/(\*\*.*?\*\*)/gs);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-indigo-700 dark:text-indigo-400">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [text]);

  return <div className={`${className} leading-relaxed whitespace-pre-wrap`}>{elements}</div>;
};

const FormulaImage = ({ prompt, onPromptUpdate, isEditable }: { prompt: string, onPromptUpdate?: (p: string) => void, isEditable?: boolean }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(prompt);

  useEffect(() => {
    let active = true;
    const fetchImg = async () => {
      const url = await generateAestheticImage(prompt);
      if (active) { setImgUrl(url); setLoading(false); }
    };
    fetchImg();
    return () => { active = false; };
  }, [prompt]);

  const handleRegenerate = async () => {
    setLoading(true);
    const url = await generateAestheticImage(p, true);
    setImgUrl(url);
    setLoading(false);
    onPromptUpdate?.(p);
  };

  if (loading) return (
    <div className={`w-full max-w-[280px] aspect-square rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center p-4 mx-auto`}>
      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 mx-auto md:mx-0">
      <div className={`w-full max-w-[450px] shadow-2xl rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 transition-all hover:scale-105 bg-white p-2`}>
        {imgUrl && <img src={imgUrl} alt="Educational Diagram" className="w-full h-auto block rounded-2xl" />}
      </div>
      {isEditable && (
        <div className="no-print space-y-2">
          <input className="w-full text-[10px] p-2 bg-white border border-slate-300 rounded outline-none" value={p} onChange={e => setP(e.target.value)} />
          <button onClick={handleRegenerate} className="w-full bg-slate-900 text-white text-[10px] py-1 rounded font-black uppercase tracking-widest">Update Photo</button>
        </div>
      )}
    </div>
  );
};

interface NoteRendererProps {
  note: ChapterNote;
  isAdmin?: boolean;
}

const NoteRenderer: React.FC<NoteRendererProps> = ({ note, isAdmin }) => {
  const [currentNote, setCurrentNote] = useState(note);
  const [isReading, setIsReading] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => { setCurrentNote(note); }, [note]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsReading(null);
  };

  const handleRead = async (text: string, id: string) => {
    if (isReading === id) {
      stopAudio();
      return;
    }
    stopAudio();
    setIsReading(id);

    const base64Audio = await generateSpeech(text);
    if (!base64Audio) {
      setIsReading(null);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const bytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(bytes, ctx);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsReading(null);
    source.start(0);
    sourceNodeRef.current = source;
  };

  const updateSection = (idx: number, field: keyof NoteSection, value: string) => {
    const updated = { ...currentNote };
    (updated.sections[idx] as any)[field] = value;
    setCurrentNote(updated);
  };

  const renderSection = (section: NoteSection, index: number) => {
    const isFormula = section.type === 'formula' || section.type === 'reaction';
    const hasVisual = !!section.visualPrompt;
    const sectionId = `sec-${index}`;

    // Multi-formula box logic: split by '---'
    const formulaItems = isFormula ? section.content.split('---').filter(f => f.trim()) : [section.content];

    return (
      <div key={index} className={`my-20 section-card relative ${isFormula ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-4 border-indigo-200 dark:border-indigo-900 rounded-[3.5rem] p-10 md:p-14 shadow-xl' : ''} ${hasVisual ? 'flex flex-col md:flex-row gap-16 items-start' : ''}`}>
        <div className="flex-1 w-full">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
               <FormattedText 
                text={section.title} 
                isEditable={isAdmin} 
                onUpdate={v => updateSection(index, 'title', v)}
                className={isFormula ? "text-3xl md:text-4xl font-black text-indigo-900 dark:text-indigo-100 tracking-tighter" : "text-3xl md:text-5xl font-black text-black dark:text-white tracking-tighter flex items-center gap-5"}
              />
              <span className="inline-block bg-indigo-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-md">{section.type.toUpperCase()}</span>
            </div>
            {!isAdmin && (
              <button 
                onClick={() => handleRead(section.content, sectionId)}
                className={`no-print flex items-center gap-3 px-6 py-3 rounded-2xl transition-all shadow-xl ${isReading === sectionId ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-indigo-600 hover:scale-105 border-2 border-indigo-100 dark:border-slate-700'}`}
              >
                <span className="text-xl">{isReading === sectionId ? '⏹️' : '🔊'}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{isReading === sectionId ? 'LISTENING' : 'AI READER'}</span>
              </button>
            )}
          </div>

          <div className={isFormula ? "space-y-10" : "w-full"}>
            {formulaItems.map((item, fIdx) => (
              <div key={fIdx} className={isFormula ? "bg-white dark:bg-black p-10 md:p-14 rounded-[3rem] border-4 border-indigo-600 shadow-[0_20px_50px_rgba(79,70,229,0.1)] relative overflow-hidden group/formula" : ""}>
                {isFormula && (
                   <div className="absolute -top-4 -right-4 bg-indigo-600 text-white px-6 py-2 rounded-bl-[2rem] font-black text-[10px] uppercase tracking-widest z-20">Equation #{fIdx + 1}</div>
                )}
                {isFormula && <div className="absolute top-0 right-0 p-10 opacity-5 text-9xl pointer-events-none group-hover/formula:opacity-10 transition-opacity">∫</div>}
                <FormattedText 
                  text={item.trim()} 
                  isEditable={isAdmin} 
                  onUpdate={v => updateSection(index, 'content', v)}
                  className={isFormula ? "text-2xl md:text-3xl font-black text-black dark:text-white leading-tight" : "note-content text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-[1.8] whitespace-pre-wrap"}
                />
              </div>
            ))}
          </div>
        </div>
        {hasVisual && <FormulaImage prompt={section.visualPrompt!} isEditable={isAdmin} onPromptUpdate={p => updateSection(index, 'visualPrompt', p)} />}
      </div>
    );
  };

  return (
    <div className="note-container max-w-6xl mx-auto py-16 px-8 md:px-20 bg-white dark:bg-slate-950 md:rounded-[4rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-4 bg-indigo-600"></div>
      
      <div className="flex justify-between items-center mb-20 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl">A12</div>
          <div className="flex flex-col">
            <span className="text-black dark:text-white text-[10px] font-black uppercase tracking-[0.4em]">BOARD READY 2026</span>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Syllabus Master</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Export PDF</button>
        </div>
      </div>

      <header className="mb-24 text-center space-y-6">
        <FormattedText 
          text={currentNote.chapterTitle} 
          className="text-5xl md:text-7xl font-black text-black dark:text-white tracking-tighter leading-none uppercase"
        />
        <div className="flex justify-center flex-wrap gap-4">
          <div className="inline-block bg-indigo-600 text-white px-8 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.5em] shadow-lg">
            MASTER NOTES • PART {currentNote.part || 1}
          </div>
          <div className="inline-block bg-emerald-500 text-white px-8 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.5em] shadow-lg">
            FORMULA MASTER
          </div>
        </div>
      </header>

      <div className="space-y-12">
        {currentNote.sections.map((section, idx) => renderSection(section, idx))}
      </div>

      <div className="mt-40 pt-24 border-t-8 border-slate-100 dark:border-slate-900 no-print">
        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-10 md:p-20 rounded-[4rem] border-8 border-indigo-600 border-dashed text-center space-y-10">
           <div className="text-7xl md:text-[9rem] animate-bounce-slow">💎</div>
           <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-black text-indigo-950 dark:text-indigo-100 uppercase tracking-tighter leading-tight">Want Premium Important Questions?</h2>
              <p className="text-lg md:text-xl font-bold text-slate-600 dark:text-slate-400 max-w-2xl mx-auto uppercase">Unlock the <span className="text-indigo-600 dark:text-indigo-400">Premium Vault</span> to get 50 most repeated questions with Board-Ready solutions for this subject.</p>
           </div>
           <Link to={`/vault/${currentNote.subject}`} className="inline-block bg-indigo-600 text-white px-16 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] hover:scale-110 active:scale-95 shadow-2xl transition-all">Buy Now: {currentNote.subject.replace('_', ' ')} Vault</Link>
        </div>
      </div>
    </div>
  );
};

export default NoteRenderer;
