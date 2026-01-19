
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { SUBJECTS } from './constants';
import { ChapterNote, SubjectId, PremiumQuestion, AppSettings, UserProfile } from './types';
import { generateChapterNotes, generatePremiumQuestions } from './services/geminiService';
import NoteRenderer, { FormattedText, FormulaImage } from './components/NoteRenderer';

// Storage Keys
const PURCHASE_KEY = 'ace12_purchases_v2026';
const USER_KEY = 'ace12_user_profile_v2026';
const CLOUD_DB_KEY = 'ace12_GLOBAL_CLOUD_MOCK'; // This simulates our remote database

const DEFAULT_SETTINGS: AppSettings = {
  premiumPrice: 29, 
  isVaultOpen: true
};

// Helper to get/set Cloud Data
const getCloudData = () => JSON.parse(localStorage.getItem(CLOUD_DB_KEY) || '{}');
const saveToCloud = (email: string, subjects: string[]) => {
  const db = getCloudData();
  const existing = db[email] || [];
  db[email] = Array.from(new Set([...existing, ...subjects]));
  localStorage.setItem(CLOUD_DB_KEY, JSON.stringify(db));
};

const Breadcrumbs = () => {
  const { id, subjectId, title } = useParams();
  const getSubjectName = (sid: string) => SUBJECTS.find(s => s.id === sid)?.name || sid;
  return (
    <nav className="no-print mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
      {id && <><span className="opacity-30">/</span><Link to={`/subject/${id}`} className="hover:text-indigo-600 transition-colors">{getSubjectName(id)}</Link></>}
      {subjectId && <><span className="opacity-30">/</span><Link to={`/subject/${subjectId}`} className="hover:text-indigo-600 transition-colors">{getSubjectName(subjectId)}</Link></>}
      {title && <><span className="opacity-30">/</span><span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{title}</span></>}
    </nav>
  );
};

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/') return null;
  return (
    <div className="no-print mb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-slate-500 hover:text-indigo-600 group">
        <div className="w-12 h-12 rounded-2xl border-2 border-slate-100 group-hover:border-indigo-600 flex items-center justify-center transition-all bg-white dark:bg-slate-900 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
        </div>
        <span className="font-black text-[11px] uppercase tracking-[0.2em]">Go Back</span>
      </button>
    </div>
  );
};

const FomoToast = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = ["🔥 42 students unlocked Vault just now", "⚠️ Price rising to ₹99 by tonight!", "🚀 18.5k+ Class 12th users active", "💎 All-Subject Discount ends in 2h"];
  useEffect(() => {
    const timer = setInterval(() => setMsgIdx(p => (p + 1) % messages.length), 4500);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="fixed top-24 right-8 z-[200] no-print pointer-events-none hidden md:block">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-indigo-600 p-5 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.2)] animate-bounce-slow flex items-center gap-4 max-w-[280px] pointer-events-auto transition-all">
        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">{messages[msgIdx]}</p>
      </div>
    </div>
  );
};

const MobileHeader = () => (
  <header className="lg:hidden no-print h-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b-2 border-slate-100 dark:border-slate-900 px-8 flex items-center justify-between sticky top-0 z-[100]">
    <Link to="/" className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl">A</div>
      <span className="font-black text-xs uppercase tracking-widest dark:text-white">Ace12th</span>
    </Link>
    <div className="flex gap-3">
      <Link to="/login" className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-2 rounded-full">Sync</Link>
      <Link to="/premium" className="text-[10px] font-black text-white bg-rose-600 px-4 py-2 rounded-full shadow-lg">Vault</Link>
    </div>
  </header>
);

const VaultView = ({ purchased }: { purchased: string[] }) => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [questions, setQuestions] = useState<PremiumQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const isUnlocked = purchased.includes(subjectId as string);
  const subject = SUBJECTS.find(s => s.id === subjectId);

  useEffect(() => {
    if (!isUnlocked || !subjectId) { setLoading(false); return; }
    const fetchVault = async () => {
      setLoading(true);
      try { 
        const data = await generatePremiumQuestions(subjectId as SubjectId); 
        setQuestions(data || []); 
      } catch (err) { console.error("Vault failed:", err); } 
      finally { setLoading(false); }
    };
    fetchVault();
  }, [subjectId, isUnlocked]);

  if (!isUnlocked) return (
    <div className="p-12 md:p-24 text-center space-y-10 animate-in zoom-in duration-500">
      <div className="text-[10rem] drop-shadow-2xl">🔒</div>
      <h2 className="text-5xl font-black uppercase tracking-tighter dark:text-white">Diamond Archive Locked</h2>
      <p className="text-slate-500 uppercase font-black text-xs tracking-widest max-w-md mx-auto leading-relaxed">This subject's elite PYQ archive is restricted. Please purchase or Sync your account.</p>
      <div className="flex flex-col md:flex-row justify-center gap-4">
        <Link to="/premium" className="inline-block bg-rose-600 text-white px-16 py-6 rounded-[2rem] font-black uppercase text-sm shadow-xl animate-pulse">Unlock Archive ₹29</Link>
        <Link to="/login" className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-16 py-6 rounded-[2rem] font-black uppercase text-sm border-2">Already Paid? Sync</Link>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center animate-pulse gap-8">
      <div className="text-[10rem] animate-spin-slow">💎</div>
      <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Compiling Verified Archive...</h2>
    </div>
  );

  return (
    <div className="p-8 md:p-24 max-w-7xl mx-auto space-y-24 animate-in fade-in duration-1000">
      <header className="text-center space-y-8">
        <div className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-xl mb-6">Master Access Confirmed</div>
        <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter dark:text-white leading-none">{subject?.name} <span className="text-indigo-600">VAULT.</span></h2>
        <button onClick={() => window.print()} className="bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">DOWNLOAD AS PDF</button>
      </header>
      <div className="grid gap-20">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-12 md:p-24 rounded-[5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl relative overflow-hidden section-card">
            <div className="absolute right-[-40px] top-[-40px] text-[20rem] opacity-[0.02] font-black italic select-none">#{idx+1}</div>
            <div className="flex flex-wrap gap-4 mb-10 relative z-10">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest">{q.type || 'H.Y. Concept'}</span>
              {q.repeatedYears.map(y => <span key={y} className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black px-4 py-2 rounded-full uppercase">{y}</span>)}
            </div>
            <h3 className="text-4xl md:text-5xl font-black mb-12 leading-tight tracking-tighter dark:text-white relative z-10">{q.question}</h3>
            
            {q.visualPrompt && (
               <div className="mb-16 max-w-2xl mx-auto">
                 <FormulaImage prompt={q.visualPrompt} />
               </div>
            )}

            <div className="bg-indigo-50 dark:bg-indigo-950/50 p-12 rounded-[4rem] border-2 border-indigo-100 dark:border-indigo-900">
               <FormattedText text={q.solution} className="text-xl md:text-2xl font-bold dark:text-white leading-relaxed" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChapterView = () => {
  const { subjectId, title, part, total } = useParams<{ subjectId: string, title: string, part: string, total: string }>();
  const [note, setNote] = useState<ChapterNote | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchNote = async (force = false) => {
    setLoading(true);
    try { const data = await generateChapterNotes(subjectId as SubjectId, title!, parseInt(part!), parseInt(total!), force); setNote(data); } 
    catch (err) { console.error("Notes failed:", err); } 
    finally { setLoading(false); }
  };
  useEffect(() => { fetchNote(); }, [subjectId, title, part, total]);
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center animate-pulse gap-6">
      <div className="text-[8rem]">📖</div>
      <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Retrieving Master Notes...</h2>
    </div>
  );
  return (
    <div className="p-6 md:p-12">
      <Breadcrumbs />
      <BackButton />
      {note ? <NoteRenderer note={note} onRefresh={() => fetchNote(true)} /> : <div className="p-24 text-center font-black">Archive Access Error.</div>}
    </div>
  );
};

const PremiumPortal = ({ settings, setPurchased, purchased, user }: { settings: AppSettings, setPurchased: React.Dispatch<React.SetStateAction<string[]>>, purchased: string[], user: UserProfile | null }) => {
  const [cart, setCart] = useState<string[]>([]);
  const [email, setEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const navigate = useNavigate();

  const toggleCart = (id: string) => setCart(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const calculateTotal = () => {
    const baseTotal = cart.length * settings.premiumPrice;
    let discount = 0;
    if (cart.length === 6) discount = 0.30; 
    else if (cart.length >= 3) discount = 0.20;
    const discountAmount = baseTotal * discount;
    return { subtotal: baseTotal, discountAmount, total: baseTotal - discountAmount, label: discount > 0 ? `${discount * 100}% BUNDLE DISCOUNT` : null };
  };

  const { subtotal, discountAmount, total, label } = calculateTotal();

  const handleFinalUnlock = () => {
    if (!email.includes('@')) { alert('Valid email required for sync.'); return; }
    setIsProcessing(true);
    setTimeout(() => {
      const db = getCloudData();
      const userPurchases = db[email] || [];
      const updatedPurchases = Array.from(new Set([...userPurchases, ...purchased, ...cart]));
      
      // Update Cloud & Local
      saveToCloud(email, updatedPurchases);
      setPurchased(updatedPurchases);
      
      setIsProcessing(false);
      setIsCheckoutOpen(false);
      alert(`CONGRATS! Access key tied to ${email}. You can sync this on any device later.`);
      navigate('/');
    }, 2200);
  };

  return (
    <div className="p-8 md:p-24 max-w-7xl mx-auto space-y-24 pb-64 animate-in slide-in-from-bottom duration-1000">
      <Breadcrumbs />
      <BackButton />
      <header className="text-center space-y-10">
        <h2 className="text-7xl md:text-[10rem] font-black text-black dark:text-white tracking-tighter uppercase leading-none">THE <span className="text-rose-600">VAULT.</span></h2>
        <div className="space-y-6">
          <p className="text-xl font-bold text-slate-500 uppercase tracking-widest max-w-3xl mx-auto">Access the 50+ Most Repeated PYQs for 2026 Board Exams.</p>
          <div className="inline-flex flex-col md:flex-row items-center gap-4">
             <div className="bg-amber-100 text-amber-800 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest animate-pulse border-2 border-amber-200">Save 30% on All Subjects</div>
             <div className="bg-indigo-50 text-indigo-600 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest border-2 border-indigo-100">Save 20% on 3+ Subjects</div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {SUBJECTS.map(subject => {
          const isOwned = purchased.includes(subject.id);
          const inCart = cart.includes(subject.id);
          return (
            <div key={subject.id} className={`bg-white dark:bg-slate-900 p-10 rounded-[4rem] border-4 ${inCart ? 'border-indigo-600 scale-105 shadow-2xl' : 'border-slate-50 dark:border-slate-800'} transition-all flex flex-col items-center text-center space-y-8 group cursor-pointer relative shadow-xl`} onClick={() => !isOwned && toggleCart(subject.id)}>
              {inCart && <div className="absolute top-8 right-8 text-4xl">✅</div>}
              <div className="text-[7rem] group-hover:scale-110 transition-transform">{subject.icon}</div>
              <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{subject.name}</h3>
              <div className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isOwned ? 'bg-emerald-50 text-emerald-600 shadow-none' : inCart ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-indigo-600'}`}>
                {isOwned ? '✓ UNLOCKED' : inCart ? 'SELECTED' : 'ADD TO VAULT'}
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl bg-black/95 backdrop-blur-2xl p-10 rounded-[3.5rem] shadow-2xl z-[250] flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10">
           <div className="space-y-2">
              <div className="text-white font-black text-3xl uppercase tracking-tighter">{cart.length} Subject Archives</div>
              {label && <div className="text-rose-500 font-black text-xs uppercase tracking-[0.2em] animate-pulse">{label}</div>}
           </div>
           <div className="flex items-center gap-12">
              <div className="text-right">
                <div className="text-white text-5xl font-black leading-none">₹{total.toFixed(0)}</div>
                {discountAmount > 0 && <div className="text-slate-400 text-xs font-black uppercase line-through mt-2">WAS ₹{subtotal}</div>}
              </div>
              <button onClick={() => setIsCheckoutOpen(true)} className="bg-indigo-600 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">CHECKOUT NOW</button>
           </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-8">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-12 rounded-[4.5rem] border-8 border-indigo-600 space-y-10 text-center animate-in zoom-in">
              <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white leading-none">Instant Unlock</h2>
              <div className="space-y-6">
                 <p className="text-slate-500 font-bold uppercase text-[11px] tracking-widest leading-relaxed text-center">Enter your active email. We use this to restore your access if you switch phones.</p>
                 <input type="email" placeholder="ENTER YOUR EMAIL" className="w-full p-8 bg-slate-50 dark:bg-black border-4 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-center dark:text-white focus:border-indigo-600 outline-none text-xl" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button onClick={handleFinalUnlock} disabled={isProcessing} className="w-full bg-rose-600 text-white py-10 rounded-[2.5rem] font-black text-3xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                {isProcessing ? 'SYNCHRONIZING...' : `PAY ₹${total.toFixed(0)}`}
              </button>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-xs font-black uppercase text-slate-400 hover:text-rose-600 tracking-widest">Cancel</button>
           </div>
        </div>
      )}
    </div>
  );
};

const SubjectPage = ({ purchased }: { purchased: string[] }) => {
  const { id } = useParams<{ id: string }>();
  const subject = SUBJECTS.find(s => s.id === id);
  const isPurchased = purchased.includes(id as string);
  if (!subject) return <div className="p-24 text-center font-black">Subject not found</div>;
  return (
    <div className="p-8 md:p-24 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-700">
      <Breadcrumbs />
      <BackButton />
      <header className="flex flex-col lg:flex-row items-center gap-16 border-b-8 border-slate-50 dark:border-slate-900 pb-20 text-center lg:text-left">
        <div className="text-[12rem] drop-shadow-2xl">{subject.icon}</div>
        <div className="flex-1 space-y-8">
          <h2 className="text-5xl md:text-7xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{subject.name} MASTER FILES</h2>
          <div className="flex flex-wrap justify-center lg:justify-start gap-6">
            {isPurchased ? (
              <Link to={`/vault/${id}`} className="bg-emerald-500 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase shadow-2xl hover:scale-105 transition-all">💎 OPEN PREMIUM VAULT</Link>
            ) : (
              <Link to="/premium" className="bg-rose-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase shadow-2xl animate-pulse">💎 UNLOCK ELITE VAULT</Link>
            )}
          </div>
        </div>
      </header>
      <div className="grid gap-10">
        {subject.chapters.map((chapter, idx) => (
          <div key={chapter.id} className="p-10 md:p-14 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-10 shadow-xl hover:border-indigo-600 transition-all group">
            <div className="flex-1 text-center lg:text-left space-y-3">
              <span className="text-indigo-600 font-black text-4xl italic opacity-10">UNIT {idx+1}</span>
              <h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{chapter.title}</h3>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{chapter.description}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {[...Array(chapter.totalParts)].map((_, i) => (
                <Link key={i} to={`/chapter/${id}/${chapter.title}/${i + 1}/${chapter.totalParts}`} className="bg-slate-50 dark:bg-slate-800 text-black dark:text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-transparent hover:border-indigo-600 shadow-sm">Part {i+1}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const subjectsRef = useRef<HTMLDivElement>(null);
  return (
    <div className="pb-32 animate-in fade-in duration-1000">
      <header className="text-center space-y-12 max-w-6xl mx-auto pt-24 px-8">
        <div className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.4em] shadow-xl mb-4">Master Archives for Batch 2026</div>
        <h1 className="text-7xl md:text-[11rem] font-black text-black dark:text-white tracking-tighter leading-[0.75] uppercase">Ace 12th <br/><span className="text-indigo-600">GRADE.</span></h1>
        <p className="text-2xl md:text-3xl font-bold text-slate-500 max-w-4xl mx-auto uppercase tracking-tight leading-snug">AI-Enhanced Notes & Board Predictions. Offline-Ready Master Files.</p>
        <div className="flex flex-wrap justify-center gap-8 pt-10">
          <button onClick={() => subjectsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="bg-black dark:bg-white text-white dark:text-black px-16 py-7 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-105 transition-all">Free Notes</button>
          <Link to="/premium" className="bg-rose-600 text-white px-16 py-7 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-105 transition-all animate-pulse">Access The Vault</Link>
        </div>
      </header>
      <div ref={subjectsRef} className="mt-56 max-w-7xl mx-auto px-8 grid md:grid-cols-2 lg:grid-cols-3 gap-12">
        {SUBJECTS.map(subject => (
          <Link key={subject.id} to={`/subject/${subject.id}`} className="bg-white dark:bg-slate-900 p-12 rounded-[5rem] border-4 border-slate-50 dark:border-slate-800 shadow-xl hover:border-indigo-600 hover:scale-[1.05] transition-all flex flex-col items-center text-center space-y-10 group">
            <div className="text-[9rem] drop-shadow-xl">{subject.icon}</div>
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{subject.name}</h3>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all">Explore Archives →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const Login = ({ onLogin, setPurchased }: { onLogin: (email: string) => void, setPurchased: (s: string[]) => void }) => {
  const [email, setEmail] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  const handleSync = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { alert("Valid email required."); return; }
    
    setIsSyncing(true);
    setTimeout(() => {
      const db = getCloudData();
      const cloudPurchases = db[email] || [];
      
      onLogin(email);
      setPurchased(cloudPurchases); // Restore purchases from Cloud DB to local state
      
      setIsSyncing(false);
      alert(cloudPurchases.length > 0 
        ? `SUCCESS: Restored ${cloudPurchases.length} subjects from cloud!` 
        : `SYNCED: No previous purchases found for this email.`);
      navigate('/');
    }, 2000);
  };

  return (
    <div className="p-8 md:p-24 max-w-2xl mx-auto space-y-16 min-h-[70vh] flex flex-col justify-center animate-in zoom-in duration-500">
      <header className="text-center space-y-8">
        <h2 className="text-6xl font-black uppercase tracking-tighter dark:text-white leading-none">Cloud Sync</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs leading-relaxed">Enter your purchase email to restore your Vault access instantly on this device.</p>
      </header>
      <form onSubmit={handleSync} className="space-y-8 bg-white dark:bg-slate-900 p-14 rounded-[5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl">
        <div className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4">Account Email</label>
          <input type="email" placeholder="student@example.com" required className="w-full p-8 bg-slate-50 dark:bg-black border-4 rounded-[2.5rem] font-black text-center outline-none focus:border-indigo-600 transition-all dark:text-white text-xl shadow-inner" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={isSyncing} className="w-full bg-indigo-600 text-white py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">
          {isSyncing ? 'SEARCHING CLOUD...' : 'RESTORE MY ACCESS'}
        </button>
      </form>
    </div>
  );
};

const Footer = () => (
  <footer className="no-print bg-white dark:bg-slate-950 border-t-8 border-slate-50 dark:border-slate-900 py-24 px-10 mt-auto">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
      <div className="flex flex-col items-center md:items-start gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">A</div>
          <span className="font-black text-xl uppercase tracking-tighter dark:text-white">ACE12TH GRADE.</span>
        </div>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest max-w-xs text-center md:text-left leading-relaxed">Board Master Files for Batch 2026. Made with ❤️ for Students.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-12 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Free Notes</Link>
        <Link to="/premium" className="hover:text-rose-600 transition-colors">The Vault</Link>
        <Link to="/login" className="hover:text-black dark:hover:text-white transition-colors">Restore Access</Link>
      </div>
      <div className="text-center md:text-right space-y-4">
        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">© 2026 ACE12TH MASTER ARCHIVE</p>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Global Sync Enabled</p>
      </div>
    </div>
  </footer>
);

const App = () => {
  const [isDark, setIsDark] = useState(false);
  const [purchased, setPurchased] = useState<string[]>(() => { 
    try { 
      const data = localStorage.getItem(PURCHASE_KEY); 
      return data ? JSON.parse(data) : []; 
    } catch { return []; } 
  });
  const [user, setUser] = useState<UserProfile | null>(() => { 
    try { 
      const data = localStorage.getItem(USER_KEY); 
      return data ? JSON.parse(data) : null; 
    } catch { return null; } 
  });

  useEffect(() => { if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY); }, [user]);
  useEffect(() => { localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchased)); }, [purchased]);

  const handleLogin = (email: string) => { 
    const newUser = { email, purchasedSubjects: purchased, lastSync: Date.now() };
    setUser(newUser); 
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-700">
        <HashRouter>
          <MobileHeader />
          <aside className="no-print w-96 bg-white dark:bg-slate-950 border-r-8 border-slate-50 dark:border-slate-900 h-screen sticky top-0 hidden lg:flex flex-col z-50">
            <div className="p-12 mb-4 flex flex-col items-center space-y-12">
              <Link to="/"><div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center font-black text-5xl shadow-2xl">A</div></Link>
              <button onClick={() => setIsDark(!isDark)} className="px-10 py-4 rounded-[1.5rem] bg-black dark:bg-white text-white dark:text-black font-black text-[11px] w-full shadow-2xl uppercase tracking-[0.3em]">{isDark ? 'LIGHT MODE' : 'DARK MODE'}</button>
            </div>
            <nav className="flex-1 overflow-y-auto px-10 space-y-6 no-scrollbar pb-16">
              {SUBJECTS.map(s => <Link key={s.id} to={`/subject/${s.id}`} className="flex items-center space-x-6 p-6 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-900 border-4 border-transparent hover:border-indigo-600 group"><span className="text-5xl group-hover:scale-110 transition-transform">{s.icon}</span><span className="text-xs font-black uppercase tracking-widest dark:text-white leading-none">{s.name}</span></Link>)}
              <Link to="/premium" className="flex items-center space-x-6 p-8 rounded-[2.5rem] bg-rose-600 text-white font-black shadow-xl hover:scale-105 transition-all"><span className="text-5xl">💎</span><span className="text-sm uppercase tracking-widest leading-none">THE VAULT</span></Link>
            </nav>
            <div className="p-10 border-t border-slate-100 dark:border-slate-800">
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logged in as</div>
                  <div className="text-[11px] font-black text-indigo-600 truncate">{user.email}</div>
                  <button onClick={() => setUser(null)} className="text-left text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline mt-2">Logout</button>
                </div>
              ) : (
                <Link to="/login" className="flex items-center gap-4 text-indigo-600 hover:scale-105 transition-transform">
                  <span className="text-2xl">🔄</span>
                  <span className="text-[11px] font-black uppercase tracking-widest">Account Sync</span>
                </Link>
              )}
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto relative flex flex-col no-scrollbar">
            <FomoToast />
            <div className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/subject/:id" element={<SubjectPage purchased={purchased} />} />
                <Route path="/chapter/:subjectId/:title/:part/:total" element={<ChapterView />} />
                <Route path="/vault/:subjectId" element={<VaultView purchased={purchased} />} />
                <Route path="/premium" element={<PremiumPortal settings={DEFAULT_SETTINGS} setPurchased={setPurchased} purchased={purchased} user={user} />} />
                <Route path="/login" element={<Login onLogin={handleLogin} setPurchased={setPurchased} />} />
              </Routes>
            </div>
            <Footer />
          </main>
        </HashRouter>
      </div>
    </div>
  );
};
export default App;
