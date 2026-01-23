
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChapterNote } from '../types';
import { generateAestheticImage, generateSpeech } from '../services/geminiService';

// Helper to decode base64 string to Uint8Array
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to decode raw PCM audio data for Gemini TTS (24kHz, 1 channel)
const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

// FormattedText component to handle bold keywords and bullet points
export const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const parts = text.split(/(\*\*.*?\*\*|• .*?\n|• .*?$)/g);
  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-black text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('• ')) {
          return <div key={i} className="pl-6 mb-4 relative"><span className="absolute left-0 text-indigo-500">•</span>{part.slice(2)}</div>;
        }
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
      })}
    </div>
  );
};

// FormulaImage component to fetch and display AI-generated diagrams
export const FormulaImage: React.FC<{ prompt: string }> = ({ prompt }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    generateAestheticImage(prompt).then(url => {
      if (mounted) {
        setImgUrl(url);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [prompt]);

  if (loading) return <div className="h-64 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-[3rem] my-12" />;
  if (!imgUrl) return null;

  return (
    <div className="my-12 rounded-[3rem] overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-xl">
      <img src={imgUrl} alt="Visual aid" className="w-full object-cover" />
    </div>
  );
};

const NoteRenderer: React.FC<{note: ChapterNote, onRefresh?: () => void}> = ({ note, onRefresh }) => {
  const [isReading, setIsReading] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (sourceNodeRef.current) { 
      try { sourceNodeRef.current.stop(); } catch(e) {} 
      sourceNodeRef.current = null; 
    }
    setIsReading(null);
  };

  const handleRead = async (text: string, id: string) => {
    if (isReading === id) { stopAudio(); return; }
    stopAudio(); 
    setIsReading(id);
    const base64Audio = await generateSpeech(text);
    if (!base64Audio) { setIsReading(null); return; }
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const bytes = decodeBase64(base64Audio);
    // Gemini 2.5 Flash TTS uses raw PCM at 24000Hz
    const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsReading(null);
    source.start(0);
    sourceNodeRef.current = source;
  };

  return (
    <div className="note-container max-w-5xl mx-auto py-24 px-8 md:px-32 bg-white dark:bg-slate-950 rounded-[4rem] shadow-2xl relative border-x-4 border-slate-50 dark:border-slate-900">
      <div className="absolute top-0 left-0 w-full h-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 rounded-t-[4rem]" />
      
      <div className="flex justify-between items-center mb-24 no-print">
         <Link to="/" className="font-black text-[11px] tracking-[0.3em] dark:text-white uppercase border-b-2 border-indigo-600">ACE12TH MASTER</Link>
         <button onClick={() => window.print()} className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">GENERATE PDF</button>
      </div>

      <header className="mb-40 text-center space-y-10">
        <h1 className="text-6xl md:text-[7rem] font-black dark:text-white uppercase tracking-tighter leading-none">{note.chapterTitle}</h1>
        <div className="flex justify-center gap-6">
          <span className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-[11px] font-black px-8 py-3 rounded-full uppercase border-2 dark:border-slate-800 tracking-widest">CHAPTER PART {note.part}</span>
        </div>
      </header>

      <div className="space-y-32">
        {note.sections.map((section, idx) => (
          <div key={idx} className="section-card">
            <div className="flex items-end justify-between mb-10 border-b-4 border-slate-50 dark:border-slate-900 pb-6">
              <h2 className="text-4xl font-black dark:text-white uppercase tracking-tight">{section.title}</h2>
              <button onClick={() => handleRead(section.content, `s-${idx}`)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
                <span className="text-xl">{isReading === `s-${idx}` ? '⏹️' : '🔊'}</span>
                <span>{isReading === `s-${idx}` ? 'STOPPING' : 'AI VOICE'}</span>
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
              <h2 className="text-5xl font-black uppercase dark:text-white tracking-tighter">High-Yield Samples</h2>
              <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.3em]">Top 2-3 Chapter-Specific Board Questions</p>
           </div>
           <div className="grid gap-16">
             {note.importantQuestions.slice(0, 3).map((q, idx) => (
               <div key={idx} className="bg-amber-50 dark:bg-slate-900 p-16 rounded-[5rem] border-4 border-amber-100 dark:border-slate-800 shadow-xl relative section-card">
                  <div className="absolute top-10 right-10 text-amber-200 dark:text-slate-800 font-black text-6xl opacity-30">Q{idx+1}</div>
                  <span className="text-amber-700 dark:text-amber-500 font-black text-[11px] uppercase mb-6 block tracking-widest">{q.yearAnalysis}</span>
                  <FormattedText text={q.question} className="text-3xl font-black mb-12 dark:text-white leading-tight" />
                  <div className="bg-white dark:bg-black p-12 rounded-[3rem] border-2 border-amber-50 dark:border-slate-800">
                    <FormattedText text={q.solution} className="text-xl font-bold dark:text-slate-200 leading-relaxed" />
                  </div>
               </div>
             ))}
           </div>
           
           <div className="mt-24 p-12 bg-slate-900 rounded-[4rem] text-center space-y-8 border-b-8 border-rose-600 shadow-2xl">
              <div className="inline-block bg-rose-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Archive Capacity Warning</div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Unlock the full 40-Question Archive</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl mx-auto">Free chapter previews only include top 3 samples. The Premium Vault contains the full verified bank of 40 highly repeated Board questions, Case Studies, and MCQs for this subject.</p>
              <div className="flex flex-col items-center gap-6">
                <Link to="/premium" className="inline-block bg-white text-black px-16 py-6 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-all shadow-xl">Unlock Diamond Vault ₹29</Link>
                <p className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.4em]">Used by 18,500+ Board Toppers</p>
              </div>
           </div>
        </div>
      )}

      <footer className="mt-48 pt-24 border-t-4 border-slate-50 dark:border-slate-900 text-center space-y-12 no-print">
         {onRefresh && <button onClick={onRefresh} className="text-slate-300 hover:text-indigo-600 font-black uppercase text-[10px] block mx-auto transition-colors">AI Sync Refresh</button>}
      </footer>
    </div>
  );
};

export default NoteRenderer;
