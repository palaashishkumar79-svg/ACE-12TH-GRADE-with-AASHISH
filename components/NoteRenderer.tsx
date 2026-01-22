
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChapterNote, NoteSection } from '../types';
import { generateAestheticImage, generateSpeech } from '../services/geminiService';

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

export const FormattedText: React.FC<{text: string, className?: string}> = ({ text, className = "" }) => {
  const elements = useMemo(() => {
    if (!text) return "";
    const clean = text
      .replace(/\\/g, '')
      .replace(/visualPrompt:.*$/gmi, '') 
      .replace(/---/g, '')              
      .replace(/Trick:/g, '**Pro Trick:**')
      .replace(/`|#|>/g, '') 
      .replace(/\n{3,}/g, '\n\n')
      .trim();
      
    const parts = clean.split(/(\*\*.*?\*\*)/gs);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-indigo-700 dark:text-indigo-400 font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }, [text]);
  return <div className={`${className} whitespace-pre-wrap`}>{elements}</div>;
};

export const FormulaImage = ({ prompt }: { prompt: string }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImg = async () => {
      if (!prompt) return;
      const url = await generateAestheticImage(prompt);
      setImgUrl(url);
      setLoading(false);
    };
    fetchImg();
  }, [prompt]);

  if (loading) return <div className="w-full h-80 bg-slate-50 dark:bg-slate-900 animate-pulse rounded-[3rem] border-2 border-dashed border-slate-200" />;
  if (!imgUrl) return null;

  return (
    <div className="my-16 p-8 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl transition-all hover:border-indigo-600 group">
      <img src={imgUrl} alt="Educational Diagram" className="w-full h-auto rounded-3xl mx-auto max-w-2xl group-hover:scale-[1.02] transition-transform" />
      <p className="mt-6 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">Master Archive Scientific Illustration</p>
    </div>
  );
};

const NoteRenderer: React.FC<{note: ChapterNote, onRefresh?: () => void}> = ({ note, onRefresh }) => {
  const [isReading, setIsReading] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

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

  return (
    <div className="note-container max-w-5xl mx-auto py-24 px-8 md:px-32 bg-white dark:bg-slate-950 rounded-[4rem] shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 rounded-t-[4rem]" />
      
      <div className="flex justify-between items-center mb-24 no-print">
         <Link to="/" className="font-black text-[11px] tracking-[0.3em] dark:text-white uppercase border-b-2 border-indigo-600">ACE12TH MASTER</Link>
         <button onClick={() => window.print()} className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">GENERATE PDF</button>
      </div>

      <header className="mb-40 text-center space-y-10">
        <h1 className="text-6xl md:text-[7rem] font-black dark:text-white uppercase tracking-tighter leading-none">{note.chapterTitle}</h1>
        <div className="flex justify-center gap-6">
          <span className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-[11px] font-black px-8 py-3 rounded-full uppercase border-2 dark:border-slate-800">PART {note.part}</span>
          <span className="bg-indigo-50 text-indigo-600 text-[11px] font-black px-8 py-3 rounded-full uppercase border-2 border-indigo-100">CLASS 12 ARCHIVE</span>
        </div>
      </header>

      <div className="space-y-32">
        {note.sections.map((section, idx) => (
          <div key={idx} className="section-card">
            <div className="flex items-end justify-between mb-10 border-b-4 border-slate-50 dark:border-slate-900 pb-6">
              <h2 className="text-4xl font-black dark:text-white uppercase tracking-tight">{section.title}</h2>
              <button onClick={() => handleRead(section.content, `s-${idx}`)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
                <span className="text-xl">🔊</span>
                <span>AI VOICE</span>
              </button>
            </div>
            <FormattedText text={section.content} className="text-2xl font-bold dark:text-slate-100 leading-relaxed note-content" />
            {section.visualPrompt && <FormulaImage prompt={section.visualPrompt} />}
          </div>
        ))}
      </div>

      {note.importantQuestions && (
        <div className="mt-56 pt-32 border-t-8 border-amber-50 dark:border-slate-900">
           <div className="text-center mb-24 space-y-4">
              <h2 className="text-5xl font-black uppercase dark:text-white tracking-tighter">High-Yield Predictor</h2>
              <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.3em]">Based on 2026 Board Examination Trends</p>
           </div>
           <div className="grid gap-16">
             {note.importantQuestions.map((q, idx) => (
               <div key={idx} className="bg-amber-50 dark:bg-slate-900 p-16 rounded-[5rem] border-4 border-amber-100 dark:border-slate-800 shadow-xl relative section-card">
                  <div className="absolute top-10 right-10 text-amber-200 dark:text-slate-800 font-black text-6xl">Q{idx+1}</div>
                  <span className="text-amber-700 dark:text-amber-500 font-black text-[11px] uppercase mb-6 block tracking-widest">{q.yearAnalysis}</span>
                  <FormattedText text={q.question} className="text-3xl font-black mb-12 dark:text-white leading-tight" />
                  <div className="bg-white dark:bg-black p-12 rounded-[3rem] border-2 border-amber-50 dark:border-slate-800">
                    <div className="text-amber-600 font-black text-[10px] uppercase mb-4 tracking-widest">Master Solution</div>
                    <FormattedText text={q.solution} className="text-xl font-bold dark:text-slate-200 leading-relaxed" />
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <footer className="mt-48 pt-24 border-t-4 border-slate-50 dark:border-slate-900 text-center space-y-12 no-print">
         <div className="space-y-4">
            <p className="text-slate-400 font-black text-[11px] uppercase tracking-widest">End of Archive Part {note.part}</p>
            <Link to="/premium" className="inline-block bg-rose-600 text-white px-16 py-7 rounded-[2.5rem] font-black uppercase text-sm shadow-2xl hover:scale-105 transition-all animate-pulse">Unlock 40+ Elite Board Questions</Link>
         </div>
         {onRefresh && <button onClick={onRefresh} className="text-slate-300 hover:text-indigo-600 font-black uppercase text-[10px] block mx-auto transition-colors">Regenerate Notes (AI Refresh)</button>}
      </footer>
    </div>
  );
};

export default NoteRenderer;
