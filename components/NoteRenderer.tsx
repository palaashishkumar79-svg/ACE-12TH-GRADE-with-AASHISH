
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
  const [localText, setLocalText] = useState(text || "");
  useEffect(() => { setLocalText(text || ""); }, [text]);

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
    
    // STRICT CLEANER: Removes common AI artifacts
    const clean = text
      .replace(/\\/g, '')
      .replace(/visualPrompt:.*$/gmi, '') // Remove visualPrompt leaks
      .replace(/---/g, '\n')              // Remove dash separators
      .replace(/Trick:/g, '**Pro Trick:**')
      .trim();
      
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

export const FormulaImage = ({ prompt, onPromptUpdate, isEditable }: { prompt: string, onPromptUpdate?: (p: string) => void, isEditable?: boolean }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState(prompt);

  useEffect(() => {
    let active = true;
    const fetchImg = async () => {
      if (!prompt || prompt.length < 10) { setLoading(false); return; }
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

  if (!prompt || prompt.length < 10) return null;

  if (loading) return (
    <div className="w-full h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse flex flex-col items-center justify-center p-8 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Generating Diagram...</div>
    </div>
  );

  if (!imgUrl && !loading) return null;

  return (
    <div className="my-12 space-y-4 section-card">
      <div className="bg-white p-6 rounded-[3rem] border-4 border-slate-50 shadow-2xl overflow-hidden group transition-all hover:border-indigo-600">
        <img src={imgUrl!} alt="Educational Diagram" className="w-full h-auto block rounded-2xl mx-auto max-w-xl transition-transform group-hover:scale-105" />
      </div>
      {isEditable && (
        <div className="no-print space-y-2 max-w-lg mx-auto">
          <input className="w-full text-[10px] p-2 bg-white border border-slate-300 rounded outline-none" value={p} onChange={e => setP(e.target.value)} />
          <button onClick={handleRegenerate} className="w-full bg-slate-900 text-white text-[10px] py-2 rounded font-black uppercase tracking-widest">Regenerate Diagram</button>
        </div>
      )}
    </div>
  );
};

interface NoteRendererProps {
  note: ChapterNote;
  isAdmin?: boolean;
  onRefresh?: () => void;
}

const NoteRenderer: React.FC<NoteRendererProps> = ({ note, isAdmin, onRefresh }) => {
  const [currentNote, setCurrentNote] = useState(note);
  const [isReading, setIsReading] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => { setCurrentNote(note); }, [note]);

  const stopAudio = () => {
    if (sourceNodeRef.current) { sourceNodeRef.current.stop(); sourceNodeRef.current = null; }
    setIsReading(null);
  };

  const handleRead = async (text: string, id: string) => {
    if (isReading === id) { stopAudio(); return; }
    stopAudio(); setIsReading(id);
    const base64Audio = await generateSpeech(text);
    if (!base64Audio) { setIsReading(null); return; }
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    if (!section) return null;
    const isFormula = section.type === 'formula' || section.type === 'reaction';
    const sectionId = `sec-${index}`;

    return (
      <div key={index} className="my-24 section-card">
        <div className="flex items-end justify-between mb-8 border-b-4 border-slate-50 dark:border-slate-900 pb-4">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Core Concept {index + 1}</span>
            <FormattedText 
              text={section.title} 
              isEditable={isAdmin} 
              onUpdate={v => updateSection(index, 'title', v)}
              className="text-3xl md:text-4xl font-black text-black dark:text-white uppercase tracking-tighter"
            />
          </div>
          {!isAdmin && (
            <button onClick={() => handleRead(section.content || "", sectionId)} className={`no-print px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${isReading === sectionId ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
              {isReading === sectionId ? '⏹ STOP AUDIO' : '🔊 READ ALOUD'}
            </button>
          )}
        </div>

        <div className="space-y-8">
          <div className={isFormula ? "bg-indigo-50 dark:bg-indigo-950/40 p-12 rounded-[3.5rem] border-2 border-indigo-100 dark:border-indigo-900 shadow-inner" : ""}>
             <FormattedText 
              text={section.content} 
              isEditable={isAdmin} 
              onUpdate={v => updateSection(index, 'content', v)}
              className={isFormula 
                ? "text-3xl md:text-6xl font-serif italic text-black dark:text-white leading-tight text-center" 
                : "note-content text-xl md:text-2xl font-bold dark:text-slate-100 leading-relaxed"}
            />
          </div>
          {section.visualPrompt && <FormulaImage prompt={section.visualPrompt} isEditable={isAdmin} onPromptUpdate={p => updateSection(index, 'visualPrompt', p)} />}
        </div>
      </div>
    );
  };

  return (
    <div className="note-container max-w-5xl mx-auto py-20 px-6 md:px-24 bg-white dark:bg-slate-950 shadow-[0_0_100px_rgba(0,0,0,0.05)] relative rounded-[3rem]">
      <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 rounded-t-[3rem]"></div>
      
      <div className="flex justify-between items-center mb-20 no-print">
         <Link to="/" className="flex items-center gap-2">
           <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg">A</div>
           <span className="font-black text-xs uppercase tracking-widest dark:text-white">ACE12TH</span>
         </Link>
         <button onClick={() => window.print()} className="bg-black text-white dark:bg-white dark:text-black px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">DOWNLOAD PDF</button>
      </div>

      <header className="mb-32 text-center space-y-8">
        <div className="inline-block bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-sm">Master File • 2026 Batch</div>
        <h1 className="text-5xl md:text-8xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{currentNote.chapterTitle}</h1>
        <div className="flex justify-center gap-4">
          <span className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest border border-slate-100 dark:border-slate-800">Archive ID: {note.subject?.toUpperCase()}</span>
          <span className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest border border-slate-100 dark:border-slate-800">Part {currentNote.part}</span>
        </div>
      </header>

      <div className="space-y-6">{currentNote.sections.map((section, idx) => renderSection(section, idx))}</div>

      {currentNote.importantQuestions && currentNote.importantQuestions.length > 0 && (
        <div className="mt-40 pt-24 border-t-8 border-amber-50 dark:border-amber-900/20 space-y-16">
           <div className="text-center space-y-4">
             <div className="text-amber-500 text-6xl mb-6">🏆</div>
             <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter">High-Yield PYQs</h2>
             <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">Must-Solve Questions for Board Exams</p>
           </div>
           
           <div className="grid gap-12">
             {currentNote.importantQuestions.map((q, idx) => (
               <div key={idx} className="bg-amber-50 dark:bg-slate-900/50 p-12 rounded-[4rem] border-4 border-amber-100 dark:border-amber-900/30 shadow-2xl section-card">
                  <div className="flex items-center gap-4 mb-8">
                    <span className="bg-amber-500 text-white text-xs px-6 py-2 rounded-full font-black uppercase">PYQ Analysis</span>
                    <span className="text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-widest">{q.yearAnalysis}</span>
                  </div>
                  <FormattedText text={q.question} className="text-3xl font-black dark:text-white mb-10 leading-tight" />
                  <div className="bg-white dark:bg-black/30 p-10 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-900/20 shadow-inner">
                    <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-6">Master Solution:</div>
                    <FormattedText text={q.solution} className="text-xl font-bold dark:text-slate-200 leading-relaxed" />
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <footer className="mt-48 pt-24 border-t-2 border-slate-100 dark:border-slate-800 text-center space-y-10">
         <p className="text-xs font-black text-slate-300 uppercase tracking-[1em]">END OF ARCHIVE</p>
         <div className="flex justify-center gap-6 no-print pt-10">
           <Link to="/premium" className="bg-rose-600 text-white px-12 py-6 rounded-3xl font-black uppercase text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">Unlock Premium Vault</Link>
           <button onClick={onRefresh} className="bg-slate-900 text-white dark:bg-white dark:text-black px-12 py-6 rounded-3xl font-black uppercase text-xs shadow-lg">Regenerate AI Data</button>
         </div>
      </footer>
    </div>
  );
};

export default NoteRenderer;
