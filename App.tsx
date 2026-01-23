
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { SUBJECTS } from './constants';
import { ChapterNote, SubjectId, PremiumQuestion, VaultData } from './types';
import { generateChapterNotes, generatePremiumQuestions, savePurchaseToSheet, fetchPurchasesFromSheet, prefetchChapterPart } from './services/geminiService';
import NoteRenderer, { FormattedText, FormulaImage } from './components/NoteRenderer';

const PURCHASE_KEY = 'ace12_purchases_v2026_final';
const REFERRAL_KEY = 'ace12_referrals_v2026';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.944 0C5.347 0 0 5.347 0 11.944c0 6.597 5.347 11.944 11.944 11.944 6.597 0 11.944-5.347 11.944-11.944C23.888 5.347 18.541 0 11.944 0Zm5.201 8.248-1.764 8.312c-.133.588-.482.733-.974.456l-2.684-1.979-1.295 1.246c-.143.143-.263.263-.539.263l.192-2.723 4.956-4.477c.215-.191-.047-.297-.333-.108l-6.124 3.856-2.639-.825c-.573-.179-.585-.573.12-.848l10.309-3.974c.477-.179.894.108.756.607Z"/></svg>
);

const Footer = () => (
  <footer className="bg-slate-900 text-white py-16 px-6 mt-20 no-print">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">A</div>
          <span className="font-black text-xl uppercase tracking-widest">Ace12th</span>
        </div>
        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">Score 95%+ with AI-Predicted Question Banks and Master Notes.</p>
        <div className="flex gap-4">
          <a href="https://chat.whatsapp.com/GP811hUdcCgCRVXZEEVjg0" className="p-3 bg-slate-800 hover:bg-emerald-600 rounded-full transition-all hover:scale-110"><WhatsAppIcon /></a>
          <a href="https://t.me/ace12thGradeCBSE" className="p-3 bg-slate-800 hover:bg-sky-600 rounded-full transition-all hover:scale-110"><TelegramIcon /></a>
        </div>
      </div>
      <div>
        <h4 className="font-black uppercase tracking-widest text-indigo-400 mb-6">Archive Guide</h4>
        <ul className="space-y-4 text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">
          <li><Link to="/" className="hover:text-white">Claim Offer</Link></li>
          <li><Link to="/premium" className="hover:text-white">Premium Vault</Link></li>
          <li><Link to="/login" className="hover:text-white">Cloud Sync</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-black uppercase tracking-widest text-indigo-400 mb-6">Support</h4>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">palaashishkumar79@gmail.com</p>
      </div>
    </div>
  </footer>
);

const FomoToast = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = ["🔥 124 students studying right now", "⚠️ Price rising soon!", "🚀 18k+ users active", "💎 Discount ends tonight", "✅ Someone just unlocked Vault"];
  useEffect(() => {
    const timer = setInterval(() => setMsgIdx(p => (p + 1) % messages.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="fixed bottom-6 right-6 z-[200] no-print pointer-events-none sm:top-24 sm:bottom-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-indigo-600/20 p-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[280px] border-b-4 border-b-indigo-600">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{messages[msgIdx]}</p>
      </div>
    </div>
  );
};

const VaultView = ({ purchased }: { purchased: string[] }) => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isUnlocked = purchased.includes(subjectId as string);
  const subject = SUBJECTS.find(s => s.id === subjectId);

  const fetchVault = async (force: boolean = false) => {
    if (!isUnlocked || !subjectId) return;
    setLoading(true);
    setError(null);
    try { 
      const result = await generatePremiumQuestions(subjectId as SubjectId, force); 
      if (result && result.questions && result.revision) {
        setData(result); 
      } else {
        throw new Error("Invalid format.");
      }
    } catch (err: any) { 
      setError("Failed to decrypt Vault. Server overloaded.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchVault(); }, [subjectId, isUnlocked]);

  if (!isUnlocked) return (
    <div className="p-12 md:p-32 text-center space-y-10 animate-in fade-in zoom-in">
      <div className="text-[10rem]">🔒</div>
      <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter dark:text-white leading-none">Access Restricted</h2>
      <p className="text-slate-500 uppercase font-black text-[10px] tracking-[0.3em] max-w-sm mx-auto leading-relaxed">The 40 Predicted Question Archive and Revision Master for {subject?.name} is currently locked.</p>
      <Link to="/premium" className="inline-block bg-rose-600 text-white px-12 py-6 rounded-2xl font-black uppercase text-xs shadow-2xl hover:scale-105 transition-all">Unlock Full Subject Archive ₹29</Link>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center gap-6">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <h2 className="text-2xl font-black uppercase dark:text-white tracking-tighter">Unlocking Subject Vault...</h2>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Decrypting 40 Predicted Questions</p>
    </div>
  );

  if (error || !data) return (
    <div className="p-12 md:p-32 text-center space-y-8">
      <div className="text-7xl">⚠️</div>
      <h2 className="text-2xl font-black uppercase dark:text-white">Connection Error</h2>
      <button onClick={() => fetchVault(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-lg">Retry Decryption</button>
    </div>
  );

  return (
    <div className="p-6 md:p-24 max-w-6xl mx-auto space-y-20 animate-in fade-in duration-500">
      <header className="text-center space-y-6">
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter dark:text-white leading-none">
          {subject?.name} <span className="text-indigo-600">MASTER VAULT.</span>
        </h2>
        <div className="flex justify-center gap-4">
           <span className="bg-emerald-100 text-emerald-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm">Verified 2026 Board Archive</span>
        </div>
      </header>

      {/* QUICK REVISION MASTER SECTION */}
      <section className="bg-slate-900 text-white p-10 md:p-20 rounded-[4rem] shadow-2xl space-y-12 relative overflow-hidden border-t-8 border-indigo-600">
        <div className="absolute top-0 right-0 p-12 text-[12rem] opacity-[0.03] font-black pointer-events-none">REVISION</div>
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
             <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Master Suite</span>
             <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Quick Revision Master</h3>
          </div>
          <p className="text-slate-400 font-bold text-lg md:text-xl leading-relaxed max-w-4xl">{data.revision.summary}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 relative z-10">
          <div className="space-y-6">
            <h4 className="font-black uppercase tracking-[0.3em] text-indigo-400 text-xs flex items-center gap-2">
               <span className="w-2 h-2 bg-indigo-400 rounded-full"></span> Crucial Formulas & Laws
            </h4>
            <div className="grid gap-3">
              {data.revision.formulas.map((f, i) => (
                <div key={i} className="bg-white/5 p-6 rounded-3xl font-mono text-sm border border-white/10 hover:border-indigo-500 transition-colors group">
                  <span className="text-indigo-400 mr-2 opacity-50 font-black">#</span> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-black uppercase tracking-[0.3em] text-rose-400 text-xs flex items-center gap-2">
               <span className="w-2 h-2 bg-rose-400 rounded-full"></span> High-Yield Topper Points
            </h4>
            <ul className="space-y-4">
              {data.revision.keyPoints.map((p, i) => (
                <li key={i} className="flex gap-4 p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10 items-start">
                  <span className="w-8 h-8 bg-rose-500 text-white rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0">{i+1}</span>
                  <span className="text-sm md:text-base font-bold text-slate-200">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 40 PREDICTED QUESTIONS SECTION */}
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-2">
             <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight dark:text-white">40 Predicted Board PYQs</h3>
             <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Based on 10-Year Analysis & 2026 Sample Paper</p>
           </div>
           <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:scale-105 transition-all">Save as PDF</button>
        </div>

        <div className="grid gap-10">
          {data.questions.map((q, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[4rem] border-2 border-slate-50 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-6 mb-10">
                 <span className="w-16 h-16 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">{idx+1}</span>
                 <div className="flex flex-wrap gap-2">
                    {q.repeatedYears.map(y => <span key={y} className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full uppercase border border-indigo-100 dark:border-indigo-900">{y}</span>)}
                 </div>
              </div>
              <h3 className="text-2xl md:text-4xl font-black mb-12 tracking-tighter dark:text-white leading-tight">{q.question}</h3>
              <div className="bg-slate-50 dark:bg-slate-950 p-10 md:p-16 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                 <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">Expert Verified Solution</div>
                 <FormattedText text={q.solution} className="text-lg md:text-2xl font-bold dark:text-slate-200 leading-relaxed" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SubjectPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const subject = SUBJECTS.find(s => s.id === subjectId);
  if (!subject) return <div className="p-32 text-center font-black uppercase text-4xl">Archive Not Found</div>;

  return (
    <div className="p-6 md:p-24 max-w-7xl mx-auto space-y-20 animate-in fade-in">
      <header className="flex flex-col md:flex-row items-center justify-between gap-10 border-b-4 border-slate-100 dark:border-slate-900 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="text-9xl bg-white dark:bg-slate-900 p-10 rounded-[4rem] shadow-2xl">{subject.icon}</div>
          <div className="text-center md:text-left">
            <h1 className="text-5xl md:text-9xl font-black dark:text-white uppercase tracking-tighter leading-none">{subject.name}</h1>
            <p className="text-slate-500 font-black text-[12px] uppercase tracking-[0.5em] mt-4">Full Master Curriculum Archive</p>
          </div>
        </div>
        <Link to={`/subject/${subjectId}/vault`} className="bg-rose-600 text-white px-12 py-6 rounded-3xl font-black uppercase text-sm shadow-2xl hover:scale-110 transition-all border-b-8 border-rose-800">Open Premium Vault</Link>
      </header>
      
      <div className="grid gap-8">
        <h2 className="text-3xl font-black uppercase tracking-tight dark:text-white border-l-8 border-indigo-600 pl-6">Chapter Study Records</h2>
        {subject.chapters.map(chapter => (
          <div key={chapter.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-slate-50 dark:border-slate-800 hover:border-indigo-600 transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="space-y-3">
              <h3 className="text-3xl font-black uppercase dark:text-white tracking-tight">{chapter.title}</h3>
              <p className="text-slate-500 font-bold text-lg">{chapter.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
               {chapter.isImportant && <span className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Board V.V.I.</span>}
               <div className="flex gap-3">
                  {Array.from({ length: chapter.totalParts }).map((_, i) => (
                    <Link key={i} to={`/subject/${subjectId}/chapter/${chapter.id}/part/${i + 1}`} className="w-16 h-16 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl flex items-center justify-center font-black text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-md">P{i+1}</Link>
                  ))}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => (
  <div className="space-y-32">
    {/* CLEAN HERO SECTION */}
    <header className="text-center space-y-12 max-w-7xl mx-auto pt-24 px-6 animate-in fade-in duration-1000">
      <div className="inline-flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 px-6 py-2 rounded-full shadow-sm">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-xl shadow-emerald-500/50"></span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">CBSE Class 12 Boards (2026 Batch)</span>
      </div>
      
      <h1 className="text-6xl md:text-[12rem] font-black dark:text-white tracking-tighter leading-none uppercase">
        Ace 12th <br/><span className="text-indigo-600 italic">Master.</span>
      </h1>
      
      <p className="text-slate-500 font-bold text-xl md:text-3xl max-w-3xl mx-auto leading-relaxed px-4">
        AI-Powered Master Notes & the <span className="text-rose-600">Premium Vault</span> of 40 Predicted Questions. Your ultimate score multiplier.
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-6 pt-10 px-6">
        <Link to="/premium" className="bg-indigo-600 text-white px-16 py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-105 transition-all border-b-8 border-indigo-800">Access Full Archives</Link>
        <Link to="/premium" className="bg-white dark:bg-slate-900 dark:text-white border-4 border-slate-50 dark:border-slate-800 px-16 py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-xl hover:bg-slate-50 transition-all flex items-center gap-4 justify-center">
          <span>Premium Vault</span>
          <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-pulse"></span>
        </Link>
      </div>
    </header>

    {/* WHO IS IT FOR? SECTION */}
    <section className="max-w-7xl mx-auto px-6">
       <div className="bg-white dark:bg-slate-900 p-10 md:p-20 rounded-[4rem] border-2 border-slate-50 dark:border-slate-800 shadow-2xl grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
             <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Target Audience</div>
             <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter dark:text-white leading-tight">Specifically Designed For 2026 Toppers.</h2>
             <p className="text-slate-500 font-bold text-lg leading-relaxed">If you are a Class 12 student aiming for 95%+, this is your companion. We've removed the fluff and kept only what the Board Examiner wants to see.</p>
             <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center">
                   <div className="text-3xl mb-2">⚡</div>
                   <h4 className="font-black uppercase text-[10px] dark:text-white">Fast Revision</h4>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl text-center">
                   <div className="text-3xl mb-2">🎯</div>
                   <h4 className="font-black uppercase text-[10px] dark:text-white">High Probable</h4>
                </div>
             </div>
          </div>
          <div className="relative">
             <div className="absolute -inset-4 bg-indigo-600/10 rounded-[4rem] blur-2xl"></div>
             <div className="relative bg-slate-100 dark:bg-slate-950 p-12 rounded-[3.5rem] border-4 border-white dark:border-slate-800 shadow-xl">
                <ul className="space-y-6">
                   {['Physics & Chemistry', 'Mathematics (Applied/Core)', 'English & CS', 'Physical Education'].map(s => (
                     <li key={s} className="flex items-center gap-4 text-xl font-black uppercase dark:text-white">
                        <span className="text-emerald-500 text-2xl">✓</span> {s}
                     </li>
                   ))}
                </ul>
             </div>
          </div>
       </div>
    </section>

    {/* SECTION GUIDE: FREE VS PAID */}
    <section className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12">
       <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] border-2 border-slate-50 dark:border-slate-800 shadow-xl space-y-10 group hover:border-indigo-600 transition-all">
          <div className="flex items-center gap-4">
             <span className="bg-slate-100 dark:bg-slate-800 dark:text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md">1</span>
             <h3 className="text-3xl font-black uppercase tracking-tight dark:text-white">Free Chapter Notes</h3>
          </div>
          <div className="space-y-4">
             <p className="text-slate-500 text-lg font-bold leading-relaxed">Unlimited access to detailed AI explanations for every single chapter. Master the theory without paying a rupee.</p>
             <ul className="space-y-2 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <li>• Detailed Theory & Concepts</li>
                <li>• AI Voice Explanations</li>
                <li>• Top 3 Sample Questions per Chapter</li>
             </ul>
          </div>
          <Link to="/subject/physics" className="block text-center py-6 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white font-black uppercase text-[10px] tracking-[0.3em] group-hover:bg-indigo-600 group-hover:text-white transition-all">Start Reading Now</Link>
       </div>

       <div className="bg-slate-900 p-12 rounded-[4rem] shadow-2xl space-y-10 text-white relative overflow-hidden border-t-8 border-rose-600 group hover:scale-[1.02] transition-all">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl group-hover:scale-110 transition-transform">💎</div>
          <div className="flex items-center gap-4">
             <span className="bg-rose-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">2</span>
             <h3 className="text-3xl font-black uppercase tracking-tight">Master Vault (Premium)</h3>
          </div>
          <div className="space-y-4">
             <p className="text-slate-400 text-lg font-bold leading-relaxed">The actual game changer. Get the 40 most repeated questions and the Revision Master Suite for final pre-exam study.</p>
             <ul className="space-y-2 text-rose-400 font-black uppercase text-[9px] tracking-widest">
                <li>• 40 Verified Predicted Board PYQs</li>
                <li>• Quick Revision Master (Summary/Formula)</li>
                <li>• Topper Tips & Shortcuts</li>
             </ul>
          </div>
          <Link to="/premium" className="block text-center py-6 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-[0.3em] shadow-xl shadow-rose-600/20">Unlock Master Archive</Link>
       </div>
    </section>

    {/* CLAIM OFFER / DISCOUNT SECTION */}
    <section className="max-w-7xl mx-auto px-6">
       <div className="bg-rose-600 p-12 md:p-24 rounded-[5rem] text-white text-center space-y-12 shadow-[0_50px_100px_-20px_rgba(225,29,72,0.3)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="space-y-4 relative z-10">
             <span className="bg-white/20 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Viral Student Offer</span>
             <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">Unlock The Vault For FREE.</h2>
          </div>
          <p className="text-rose-100 font-bold text-xl md:text-3xl max-w-3xl mx-auto relative z-10 leading-relaxed">Every time you share our app with a friend, you earn a 5% instant discount. Share with 20 friends, and your entire Master Vault is 100% Free.</p>
          <div className="flex justify-center relative z-10">
             <Link to="/premium" className="bg-white text-rose-600 px-20 py-8 rounded-[3rem] font-black uppercase text-lg shadow-2xl hover:scale-110 transition-all border-b-8 border-rose-100">Claim 100% Off Now</Link>
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.5em] text-rose-200 relative z-10">Already claimed by 14,200+ Toppers across India</p>
       </div>
    </section>

    {/* SUBJECT EXPLORER */}
    <section className="max-w-7xl mx-auto px-6 pb-20">
      <div className="text-center mb-20 space-y-4">
        <h2 className="text-4xl md:text-6xl font-black dark:text-white uppercase tracking-tighter leading-none">Select Subject Record</h2>
        <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.4em]">Direct Access To Study Files</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {SUBJECTS.map(subject => (
          <Link key={subject.id} to={`/subject/${subject.id}`} className="group bg-white dark:bg-slate-900 p-10 rounded-[4rem] border-2 border-slate-50 dark:border-slate-800 shadow-xl hover:border-indigo-600 transition-all flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-[0.03] group-hover:scale-150 transition-transform">#1</div>
            <div className="text-8xl group-hover:scale-110 transition-transform duration-500">{subject.icon}</div>
            <h3 className="text-3xl font-black dark:text-white uppercase mt-10 tracking-tighter">{subject.name}</h3>
            <p className="text-slate-400 text-[10px] mt-4 font-black uppercase tracking-[0.2em]">Open Master Archive</p>
            <div className="mt-12 w-full py-5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-black text-[11px] uppercase tracking-[0.3em] group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">Initialize Loading</div>
          </Link>
        ))}
      </div>
    </section>
  </div>
);

const PremiumPortal = ({ purchased, setPurchased }: { purchased: string[], setPurchased: any }) => {
  const [cart, setCart] = useState<string[]>([]);
  const [referralCount, setReferralCount] = useState<number>(() => parseInt(localStorage.getItem(REFERRAL_KEY) || '0'));
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', streetAddress: '', city: '', zipCode: '' });
  const navigate = useNavigate();

  const handleShare = async () => {
    const shareData = { title: 'Ace12th Master Archive', text: 'Unlock AI-predicted questions for Class 12 Boards!', url: window.location.origin };
    if (navigator.share) await navigator.share(shareData);
    const newCount = Math.min(20, referralCount + 1);
    setReferralCount(newCount);
    localStorage.setItem(REFERRAL_KEY, newCount.toString());
  };

  const calculateTotal = () => {
    const total = cart.length * 29;
    const discountPercent = referralCount * 0.05; 
    const final = total * (1 - discountPercent);
    return { final: Math.max(0, final), discountAmount: total * discountPercent };
  };

  const { final, discountAmount } = calculateTotal();

  const handleFinalUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formData.email?.toLowerCase().trim();
    if (!cleanEmail) return;
    
    await savePurchaseToSheet({ ...formData, email: cleanEmail, productName: cart.join(', '), totalAmount: final });
    const newPurchased = Array.from(new Set([...purchased, ...cart]));
    setPurchased(newPurchased);
    setJustUnlocked(true);
    setCart([]);
    setIsCheckoutOpen(false);
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(newPurchased));
  };

  return (
    <div className="p-6 md:p-24 max-w-7xl mx-auto space-y-20 animate-in fade-in">
      <header className="text-center space-y-12">
        <h2 className="text-5xl md:text-[10rem] font-black dark:text-white tracking-tighter uppercase leading-none">THE <span className="text-rose-600">VAULT.</span></h2>
        <div className="flex flex-col items-center gap-10">
          <p className="text-slate-500 font-black text-xl md:text-3xl max-w-2xl leading-relaxed">Unlock the Master Archive (40 Predicted Questions + Quick Revision Master Suite).</p>
          <div className="bg-indigo-50 dark:bg-indigo-950/20 p-10 rounded-[3rem] border-2 border-indigo-100 dark:border-indigo-900 text-center space-y-6 shadow-xl">
            <button onClick={handleShare} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-2xl hover:scale-110 transition-all border-b-4 border-indigo-800">Share to earn 5% discount</button>
            <div className="space-y-2">
               <p className="text-[12px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Current Status: {referralCount * 5}% Discount Earned</p>
               <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(referralCount / 20) * 100}%` }}></div>
               </div>
               <p className="text-[9px] font-black uppercase text-slate-400">{referralCount}/20 Shares Completed</p>
            </div>
          </div>
        </div>
      </header>
      
      {justUnlocked && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-12 rounded-[4rem] border-4 border-emerald-100 dark:border-emerald-900 text-center space-y-8 animate-in zoom-in">
          <h3 className="text-4xl font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter leading-none">Subject Sync Active.</h3>
          <p className="text-emerald-600 dark:text-emerald-500 font-bold text-xl">The predicted bank and revision master are now unlocked in your dashboard.</p>
          <button onClick={() => setJustUnlocked(false)} className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl">Start Studying</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {SUBJECTS.map(subject => (
          <div key={subject.id} className={`p-12 rounded-[4rem] border-4 ${cart.includes(subject.id) ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-50 dark:border-slate-900'} transition-all cursor-pointer shadow-2xl group`} onClick={() => !purchased.includes(subject.id) && setCart(p => p.includes(subject.id) ? p.filter(i => i !== subject.id) : [...p, subject.id])}>
            <div className="text-8xl text-center mb-10 group-hover:scale-110 transition-transform">{subject.icon}</div>
            <h3 className="text-3xl font-black text-center mb-6 uppercase dark:text-white tracking-tight">{subject.name}</h3>
            {purchased.includes(subject.id) ? (
              <Link to={`/subject/${subject.id}/vault`} className="block w-full py-6 rounded-2xl font-black text-center text-[11px] bg-emerald-600 text-white uppercase shadow-xl tracking-[0.2em] hover:scale-105 transition-all">ENTER MASTER VAULT</Link>
            ) : (
              <div className={`w-full py-6 rounded-2xl font-black text-center text-[11px] uppercase tracking-[0.2em] transition-all shadow-md ${cart.includes(subject.id) ? 'bg-indigo-600 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
                {cart.includes(subject.id) ? 'IN CART' : 'ADD TO VAULT ₹29'}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {cart.length > 0 && (
        <button onClick={() => setIsCheckoutOpen(true)} className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-16 py-8 rounded-[3rem] font-black uppercase shadow-2xl z-[250] flex items-center gap-6 border-b-8 border-indigo-800 hover:scale-105 transition-all">
          <span className="text-lg">Checkout Master Vault ₹{final.toFixed(0)}</span>
          {discountAmount > 0 && <span className="text-[10px] bg-white text-indigo-600 px-4 py-1.5 rounded-full font-black">-₹{discountAmount.toFixed(0)}</span>}
        </button>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[600] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-950 p-12 rounded-[5rem] w-full max-w-lg space-y-12 shadow-[0_100px_200px_-50px_rgba(0,0,0,0.5)] border-4 border-slate-50 dark:border-slate-800 relative">
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-10 right-10 text-slate-400 font-black text-2xl">✕</button>
              <div className="space-y-4">
                <h2 className="text-5xl font-black dark:text-white uppercase tracking-tighter leading-none">Initialize Sync.</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Connect your email to access your archives anywhere.</p>
              </div>
              <form onSubmit={handleFinalUnlock} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Master Email Record</label>
                  <input type="email" placeholder="student@example.com" required className="w-full p-8 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-[2.5rem] outline-none text-xl font-bold border-4 border-transparent focus:border-indigo-600 transition-all shadow-inner" onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="p-8 bg-indigo-600 text-white rounded-[2.5rem] flex justify-between items-center font-black text-2xl uppercase tracking-tighter shadow-2xl shadow-indigo-600/20">
                   <span className="text-sm opacity-80">Final Sync Fee</span>
                   <span>₹{final.toFixed(0)}</span>
                </div>
                <button type="submit" className="w-full bg-rose-600 text-white py-10 rounded-[3rem] font-black uppercase shadow-2xl text-xl tracking-widest border-b-8 border-rose-800 hover:scale-[1.02] transition-all">Unlock Master Vault</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const ChapterView = () => {
  const { subjectId, chapterId, partNum } = useParams<{ subjectId: string, chapterId: string, partNum: string }>();
  const [note, setNote] = useState<ChapterNote | null>(null);
  const [loading, setLoading] = useState(true);
  const subject = SUBJECTS.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  const currentPart = parseInt(partNum || '1');

  useEffect(() => {
    if (!subject || !chapter) return;
    const fetchNotes = async (force: boolean = false) => {
      setLoading(true);
      try {
        const data = await generateChapterNotes(subject.id as SubjectId, chapter.title, currentPart, chapter.totalParts, force);
        setNote(data);
        if (currentPart < chapter.totalParts) {
          prefetchChapterPart(subject.id as SubjectId, chapter.title, currentPart + 1, chapter.totalParts);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchNotes();
  }, [subjectId, chapterId, partNum, subject, chapter]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center gap-8">
      <div className="text-[6rem] animate-bounce">📖</div>
      <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Decrypting Archive...</h2>
      <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 animate-loading-bar"></div>
      </div>
    </div>
  );
  
  if (!note) return <div className="p-32 text-center text-2xl font-black uppercase">Archive unreachable.</div>;

  return (
    <div className="pb-20">
      <NoteRenderer note={note} onRefresh={() => {}} />
      {chapter && chapter.totalParts > 1 && (
        <div className="max-w-5xl mx-auto mt-12 flex flex-col items-center gap-6 px-6">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Jump to Archive Part</p>
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: chapter.totalParts }).map((_, i) => (
              <Link key={i} to={`/subject/${subjectId}/chapter/${chapterId}/part/${i + 1}`} className={`w-12 h-12 rounded-xl font-black text-lg flex items-center justify-center shadow-lg transition-all ${currentPart === i + 1 ? 'bg-indigo-600 text-white scale-110' : 'bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800'}`}>{i + 1}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Login = ({ setPurchased }: { setPurchased: any }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const purchases = await fetchPurchasesFromSheet(email);
    setPurchased(purchases);
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchases));
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] w-full max-w-sm border-2 border-slate-50 dark:border-slate-800 shadow-2xl space-y-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white text-center">Sync Cloud.</h2>
        <form onSubmit={handleSync} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Educational Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" required className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 transition-all text-lg font-bold" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-black dark:bg-white text-white dark:text-black py-6 rounded-2xl font-black uppercase shadow-lg hover:scale-105 transition-all disabled:opacity-50">{loading ? 'Syncing...' : 'Sync Now'}</button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [purchased, setPurchased] = useState<string[]>(() => JSON.parse(localStorage.getItem(PURCHASE_KEY) || '[]'));
  useEffect(() => { localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchased)); }, [purchased]);

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white selection:bg-indigo-600 selection:text-white">
        <nav className="p-6 md:p-10 flex justify-between items-center max-w-7xl mx-auto no-print sticky top-0 z-[500] bg-slate-50/80 dark:bg-black/80 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg">A</div>
            <span className="font-black text-lg tracking-tighter block leading-none sm:block hidden">ACE12TH</span>
          </Link>
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/premium" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Vault</Link>
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Sync</Link>
            <Link to="/premium" className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase shadow-lg hover:scale-105 transition-all">Claim 100% Free</Link>
          </div>
        </nav>

        <FomoToast />

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/subject/:subjectId" element={<SubjectPage />} />
            <Route path="/subject/:subjectId/chapter/:chapterId/part/:partNum" element={<ChapterView />} />
            <Route path="/subject/:subjectId/vault" element={<VaultView purchased={purchased} />} />
            <Route path="/premium" element={<PremiumPortal purchased={purchased} setPurchased={setPurchased} />} />
            <Route path="/login" element={<Login setPurchased={setPurchased} />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </HashRouter>
  );
};

export default App;
