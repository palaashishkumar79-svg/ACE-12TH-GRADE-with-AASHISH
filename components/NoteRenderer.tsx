
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
      if (!prompt) { setLoading(false); return; }
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
    <div className="w-full h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center p-4">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generating Textbook Diagram...</div>
    </div>
  );

  if (!imgUrl && !loading) return null;

  return (
    <div className="my-10 space-y-4">
      <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden group transition-all hover:border-indigo-600">
        <img src={imgUrl!} alt="Educational Diagram" className="w-full h-auto block rounded-2xl mx-auto max-w-lg" />
      </div>
      {isEditable && (
        <div className="no-print space-y-2 max-w-lg mx-auto">
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
    const sectionId = `sec-${index}`;
    const formulaItems = isFormula ? section.content.split('---').filter(f => f.trim()) : [section.content];

    return (
      <div key={index} className="my-24">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-1 block">Concept {index + 1}</span>
            <FormattedText 
              text={section.title} 
              isEditable={isAdmin} 
              onUpdate={v => updateSection(index, 'title', v)}
              className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tighter uppercase"
            />
          </div>
          {!isAdmin && (
            <button 
              onClick={() => handleRead(section.content, sectionId)}
              className={`no-print px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isReading === sectionId ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'}`}
            >
              {isReading === sectionId ? '⏹ STOP' : '🔊 READ'}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="space-y-10">
          {formulaItems.map((item, fIdx) => (
            <div key={fIdx} className={isFormula ? "bg-slate-50 dark:bg-slate-900/50 p-10 md:p-16 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 relative group" : "w-full"}>
              {isFormula && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 font-serif italic text-lg select-none">
                  ({index + 1}.{fIdx + 1})
                </div>
              )}
              <FormattedText 
                text={item.trim()} 
                isEditable={isAdmin} 
                onUpdate={v => updateSection(index, 'content', v)}
                className={isFormula 
                  ? "text-3xl md:text-5xl font-serif italic text-black dark:text-white text-center leading-relaxed tracking-tight" 
                  : "note-content text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-200 leading-[1.8]"}
              />
              {isFormula && (
                <div className="mt-8 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Textbook Standard Equation</span>
                </div>
              )}
            </div>
          ))}

          {/* Diagram for Formula */}
          {section.visualPrompt && <FormulaImage prompt={section.visualPrompt} isEditable={isAdmin} onPromptUpdate={p => updateSection(index, 'visualPrompt', p)} />}
        </div>
      </div>
    );
  };

  return (
    <div className="note-container max-w-5xl mx-auto py-16 px-6 md:px-20 bg-white dark:bg-slate-950 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
      
      <div className="flex justify-between items-center mb-16 no-print">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded flex items-center justify-center font-black text-lg">A12</div>
          <span className="font-black text-[10px] uppercase tracking-[0.4em] dark:text-white">BOARD MASTER</span>
        </Link>
        <button onClick={() => window.print()} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Save Notes PDF</button>
      </div>

      <header className="mb-24 text-center space-y-4">
        <FormattedText 
          text={currentNote.chapterTitle} 
          className="text-4xl md:text-6xl font-black text-black dark:text-white tracking-tighter uppercase leading-[0.9]"
        />
        <div className="flex justify-center gap-3">
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest">Class 12 Boards</span>
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest">Part {currentNote.part} Archive</span>
        </div>
      </header>

      <div className="space-y-4">
        {currentNote.sections.map((section, idx) => renderSection(section, idx))}
      </div>

      <footer className="mt-40 pt-20 border-t-8 border-slate-50 dark:border-slate-900 text-center no-print">
          <div className="bg-indigo-600 text-white p-12 md:p-20 rounded-[4rem] shadow-2xl space-y-8">
            <div className="text-8xl">💎</div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight">Unlock the Full Vault</h2>
            <p className="text-lg font-bold text-indigo-100 uppercase max-w-2xl mx-auto">Get the elite 50 repeated board questions for {currentNote.subject.replace('_', ' ')} solved with AI logic.</p>
            <Link to={`/vault/${currentNote.subject}`} className="inline-block bg-white text-indigo-600 px-16 py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-110 active:scale-95 transition-all">Open Premium Portal</Link>
          </div>
      </footer>
    </div>
  );
};

export default NoteRenderer;
