
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { SUBJECTS, OWNER_EMAIL } from './constants';
import { ChapterNote, SubjectId, Transaction, PremiumQuestion, AppSettings, UserProfile } from './types';
import { generateChapterNotes, generatePremiumQuestions } from './services/geminiService';
import NoteRenderer, { FormattedText } from './components/NoteRenderer';

// Storage Keys
const PURCHASE_KEY = 'ace12_purchases_v3';
const USER_KEY = 'ace12_user_profile_v3';
const CLOUD_MOCK_KEY = 'ace12_cloud_sim_v3';

const DEFAULT_SETTINGS: AppSettings = {
  premiumPrice: 29, 
  isVaultOpen: true
};

const FomoToast = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = [
    "⚠️ Price rising to ₹99 in 12 hours!",
    "🚀 8,400+ students already unlocked the Vault",
    "💎 30% ALL-SUBJECT BUNDLE active now!",
    "🔥 Success Story: Rahul scored 98% using these PYQs"
  ];

  useEffect(() => {
    const timer = setInterval(() => setMsgIdx(p => (p + 1) % messages.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-24 right-6 z-[200] no-print pointer-events-none">
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-600 p-4 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] animate-bounce-slow flex items-center gap-3 max-w-[240px] transition-all border-l-8 border-l-indigo-600 pointer-events-auto">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
          {messages[msgIdx]}
        </p>
      </div>
    </div>
  );
};

const DarkModeToggle = ({ isDark, setIsDark }: { isDark: boolean, setIsDark: (v: boolean) => void }) => (
  <button 
    onClick={() => setIsDark(!isDark)}
    className="px-6 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all font-black text-[10px] shadow-xl uppercase tracking-widest border-2 border-slate-300 dark:border-slate-700"
  >
    {isDark ? 'LIGHT MODE' : 'DARK MODE'}
  </button>
);

const Sidebar = ({ isDark, setIsDark, user, onLogout }: { isDark: boolean, setIsDark: (v: boolean) => void, user: UserProfile | null, onLogout: () => void }) => (
  <aside className="no-print w-80 bg-white dark:bg-slate-950 border-r-4 border-slate-100 dark:border-slate-900 h-screen sticky top-0 hidden lg:flex flex-col shadow-2xl z-50">
    <div className="p-10 mb-2 flex flex-col items-center">
      <Link to="/" className="flex items-center space-x-4 group mb-10 transition-transform hover:scale-105">
        <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center font-black shadow-2xl text-3xl">A12</div>
        <span className="text-2xl font-black tracking-tighter text-black dark:text-white leading-none">Ace12th<br/><span className="text-indigo-600">GRADE</span></span>
      </Link>
      
      {user ? (
        <div className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 mb-6 text-center shadow-inner">
          <div className="flex justify-center mb-3">
            <div className="bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">Sync Active</div>
          </div>
          <div className="text-xs font-black text-black dark:text-white truncate mb-2">{user.email}</div>
          <button onClick={onLogout} className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">Log Out</button>
        </div>
      ) : (
        <Link to="/login" className="w-full bg-slate-900 text-white dark:bg-white dark:text-black p-5 rounded-2xl text-center font-black text-xs uppercase tracking-widest mb-6 shadow-xl hover:scale-105 transition-all">
          Restore Access
        </Link>
      )}

      <DarkModeToggle isDark={isDark} setIsDark={setIsDark} />
    </div>
    
    <nav className="flex-1 overflow-y-auto px-8 space-y-4 no-scrollbar">
      <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-6 px-2">Syllabus</div>
      {SUBJECTS.map(subject => (
        <Link key={subject.id} to={`/subject/${subject.id}`} className="flex items-center space-x-4 p-5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 text-black dark:text-white font-black transition-all group border-2 border-transparent hover:border-indigo-600">
          <span className="text-3xl group-hover:scale-110 transition-transform">{subject.icon}</span>
          <span className="text-[11px] uppercase tracking-widest leading-none">{subject.name}</span>
        </Link>
      ))}
      <div className="pt-10 text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] mb-6 px-2">Premium Exclusive</div>
      <Link to="/premium" className="flex items-center justify-between p-6 rounded-3xl bg-rose-600 text-white font-black border-2 border-rose-700 hover:scale-[1.02] transition-all shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <span className="text-3xl">💎</span>
          <span className="text-xs uppercase tracking-widest leading-none">THE VAULT</span>
        </div>
      </Link>
    </nav>
  </aside>
);

const Login = ({ onLogin }: { onLogin: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) { alert('Please enter a valid email.'); return; }
    
    setLoading(true);
    setTimeout(() => {
      onLogin(cleanEmail);
      setLoading(false);
      navigate('/');
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center min-h-[90vh] p-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-12 md:p-20 rounded-[4rem] border-4 border-slate-100 dark:border-slate-800 shadow-2xl max-w-xl w-full text-center space-y-10">
        <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center font-black mx-auto text-4xl shadow-2xl">A12</div>
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">Access Recovery</h2>
          <p className="text-slate-500 font-bold">Log in with your payment email to restore all your subjects.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="email" 
            placeholder="YOUR PAYMENT EMAIL" 
            className="w-full bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 p-7 rounded-[2rem] font-black text-center text-black dark:text-white text-lg transition-all focus:border-indigo-600 outline-none"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-7 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">
            {loading ? 'RESTORING...' : 'SYNC PREVIOUS ACCESS'}
          </button>
        </form>
      </div>
    </div>
  );
};

const VaultView = ({ purchased }: { purchased: string[] }) => {
  const { subjectId } = useParams<{ subjectId: SubjectId }>();
  const [questions, setQuestions] = useState<PremiumQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subject = SUBJECTS.find(s => s.id === subjectId);
  const isUnlocked = purchased.includes(subjectId as string);

  useEffect(() => {
    if (!isUnlocked) {
      setLoading(false);
      return;
    }

    const fetchVault = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await generatePremiumQuestions(subjectId as SubjectId);
        if (data && data.length > 0) {
          setQuestions(data);
        } else {
          setError("Failed to fetch premium content. Please refresh.");
        }
      } catch (err) { 
        console.error(err); 
        setError("AI server is busy. Please try again in a moment.");
      } finally { 
        setLoading(false); 
      }
    };
    fetchVault();
  }, [subjectId, isUnlocked]);

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12 p-10 text-center">
        <div className="text-9xl">🔒</div>
        <div className="space-y-6 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter">Vault Locked</h2>
          <p className="text-xl font-bold text-slate-500 uppercase">You need to unlock this subject from the Premium Portal to see these master questions.</p>
          <Link to="/premium" className="inline-block bg-rose-600 text-white px-16 py-6 rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:scale-105 transition-all">Go to Premium Portal</Link>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12 p-10 text-center animate-pulse">
      <div className="text-[10rem] animate-bounce">💎</div>
      <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">Opening Elite Vault...</h2>
      <p className="text-slate-500 font-bold uppercase tracking-widest">Generating 50+ High-Performance Board Questions for {subject?.name}</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 p-10 text-center">
      <div className="text-9xl">⚠️</div>
      <h2 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{error}</h2>
      <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest">Retry Access</button>
    </div>
  );

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto space-y-20 animate-in fade-in duration-700">
      <header className="text-center space-y-8">
        <div className="flex justify-center">
          <span className="bg-gradient-to-r from-emerald-500 to-indigo-600 text-white px-8 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl animate-pulse">✓ ELITE ARCHIVE UNLOCKED</span>
        </div>
        <h2 className="text-5xl md:text-6xl font-black text-black dark:text-white tracking-tighter uppercase leading-[0.8]">
          {subject?.name} <span className="text-indigo-600">VAULT.</span>
        </h2>
        <p className="text-xl md:text-2xl font-bold text-slate-500 max-w-4xl mx-auto uppercase tracking-tighter leading-tight">Elite 50 most repeated Board Exam patterns solved with High-Yield step-by-step logic.</p>
      </header>

      <div className="grid gap-16">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[4rem] border-[4px] border-slate-100 dark:border-slate-800 shadow-[0_40px_80px_rgba(0,0,0,0.06)] relative group hover:border-indigo-600 transition-all duration-700 overflow-hidden">
            <div className="absolute -right-8 -top-8 text-[14rem] opacity-5 font-black italic select-none group-hover:opacity-10 transition-opacity">#{idx+1}</div>
            
            <div className="flex flex-wrap gap-4 mb-10 items-center relative z-10">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg">{q.type || 'EXAM PATTERN'}</span>
              <div className="flex gap-2">
                {q.repeatedYears.map(year => <span key={year} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-4 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800 uppercase tracking-widest">{year}</span>) }
              </div>
              <span className="ml-auto bg-amber-100 text-amber-700 text-[9px] font-black px-5 py-1.5 rounded-full uppercase tracking-widest">Priority Score: {q.freqencyScore || 9.5}/10</span>
            </div>

            <h3 className="text-2xl md:text-4xl font-black text-black dark:text-white mb-12 leading-[1.1] tracking-tighter relative z-10">{q.question}</h3>
            
            <div className="relative z-10">
               <div className="bg-indigo-50 dark:bg-indigo-950/40 p-8 md:p-14 rounded-[3.5rem] border-4 border-indigo-600 shadow-inner relative group-hover:bg-indigo-600/5 transition-colors">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg">AI</div>
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400">ELITE MASTER SOLUTION</h4>
                  </div>
                  <FormattedText text={q.solution} className="text-black dark:text-white text-2xl md:text-3xl font-bold leading-[1.6]" />
                  <div className="mt-12 pt-8 border-t-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                    <span>• Optimized for Full Marks</span>
                    <span>Verified High-Yield AI Master •</span>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="no-print mt-24 p-16 bg-black dark:bg-white rounded-[4rem] text-center space-y-8 shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-indigo-600 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 opacity-20"></div>
         <h4 className="text-white dark:text-black text-4xl font-black uppercase tracking-tighter relative z-10">Mastered this subject?</h4>
         <p className="text-slate-400 dark:text-slate-500 font-bold max-w-2xl mx-auto uppercase text-xs tracking-[0.2em] leading-relaxed relative z-10">Don't risk your score. Unlock the Full 6-Subject Vault now to secure your 95%+ result across the board.</p>
         <Link to="/premium" className="inline-block bg-rose-600 text-white px-16 py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:scale-110 active:scale-95 shadow-2xl transition-all relative z-10">Explore All Vaults</Link>
      </footer>
    </div>
  );
};

const ChapterView = () => {
  const { subjectId, title, part, total } = useParams<{ subjectId: string, title: string, part: string, total: string }>();
  const [note, setNote] = useState<ChapterNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      try {
        const data = await generateChapterNotes(subjectId as SubjectId, title!, parseInt(part!), parseInt(total!));
        setNote(data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchNote();
  }, [subjectId, title, part, total]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12 p-10 text-center animate-pulse">
      <div className="text-[10rem] animate-bounce-slow">📖</div>
      <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">Opening Chapter Files...</h2>
    </div>
  );

  return note ? <NoteRenderer note={note} /> : <div className="p-20 text-center font-black">Load Error</div>;
};

const PremiumPortal = ({ settings, setPurchased, purchased, user }: { settings: AppSettings, setPurchased: React.Dispatch<React.SetStateAction<string[]>>, purchased: string[], user: UserProfile | null }) => {
  const [cart, setCart] = useState<string[]>([]);
  const [email, setEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const navigate = useNavigate();

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isCheckoutOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isCheckoutOpen]);

  const toggleCart = (id: string) => {
    setCart(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const calculateTotal = () => {
    const baseTotal = cart.length * settings.premiumPrice;
    let discountPercent = 0;
    
    if (cart.length === 6) {
      discountPercent = 0.30; 
    } else if (cart.length >= 3) {
      discountPercent = 0.20; 
    }
    
    const discountAmount = baseTotal * discountPercent;
    return {
      subtotal: baseTotal,
      discount: discountAmount,
      total: baseTotal - discountAmount,
      discountLabel: discountPercent > 0 ? `${discountPercent * 100}%` : null
    };
  };

  const { subtotal, discount, total, discountLabel } = calculateTotal();

  const handleFinalUnlock = () => {
    if (!email.includes('@')) { 
      alert('⚠️ Critical: Enter a valid email to receive your permanent vault key.'); 
      return; 
    }
    const cleanEmail = email.toLowerCase().trim();
    setIsProcessing(true);
    
    setTimeout(() => {
      const updatedPurchases = Array.from(new Set([...purchased, ...cart]));
      setPurchased(updatedPurchases);
      localStorage.setItem(PURCHASE_KEY, JSON.stringify(updatedPurchases));
      
      const cloudDb = JSON.parse(localStorage.getItem(CLOUD_MOCK_KEY) || '{}');
      cloudDb[cleanEmail] = updatedPurchases;
      localStorage.setItem(CLOUD_MOCK_KEY, JSON.stringify(cloudDb));

      setIsProcessing(false);
      setIsCheckoutOpen(false);
      setCart([]);
      alert(`🎉 PAYMENT SUCCESSFUL! ${updatedPurchases.length} subjects are now permanently linked to ${cleanEmail}. Check your subjects now!`);
      navigate('/');
    }, 2000);
  };

  return (
    <div className="p-10 md:p-16 max-w-7xl mx-auto space-y-20 relative pb-48">
       <header className="text-center space-y-10 animate-in slide-in-from-top duration-700">
        <h2 className="text-6xl md:text-7xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">THE <span className="text-rose-600">VAULT.</span></h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
           <div className="bg-indigo-600 text-white p-8 rounded-[3rem] border-4 border-indigo-400 shadow-2xl relative overflow-hidden group">
              <h4 className="text-2xl font-black uppercase tracking-tighter mb-1 relative z-10">Study Bundle</h4>
              <p className="font-bold text-indigo-100 uppercase text-[10px] tracking-widest relative z-10">Add 3+ subjects to cart</p>
              <div className="text-5xl font-black mt-3 relative z-10">20% OFF</div>
           </div>
           <div className="bg-rose-600 text-white p-8 rounded-[3rem] border-4 border-rose-400 shadow-2xl relative overflow-hidden group animate-pulse">
              <h4 className="text-2xl font-black uppercase tracking-tighter mb-1 relative z-10">ULTIMATE ACCESS</h4>
              <p className="font-bold text-rose-100 uppercase text-[10px] tracking-widest relative z-10">Unlock all 6 subjects</p>
              <div className="text-5xl font-black mt-3 relative z-10">30% OFF</div>
           </div>
        </div>
        <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] animate-bounce">⚠️ Price rising to ₹99 soon! Current Price: ₹29 / subject</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {SUBJECTS.map(subject => {
          const isOwned = purchased.includes(subject.id);
          const inCart = cart.includes(subject.id);

          return (
            <div key={subject.id} className={`bg-white dark:bg-slate-900 p-10 rounded-[4rem] border-4 ${inCart ? 'border-indigo-600 scale-105 shadow-2xl' : 'border-slate-100 dark:border-slate-800 shadow-xl'} transition-all duration-500 flex flex-col items-center text-center space-y-6 group relative overflow-hidden`}>
              {isOwned ? (
                <div className="absolute top-8 right-8 text-emerald-500 font-black text-[9px] uppercase tracking-widest bg-emerald-50 px-5 py-1.5 rounded-full border border-emerald-100 shadow-sm">OWNED</div>
              ) : (
                <div className="absolute top-8 right-8 text-rose-600 font-black text-[9px] uppercase tracking-widest bg-rose-50 px-5 py-1.5 rounded-full border border-rose-100 shadow-sm animate-pulse">₹29</div>
              )}
              
              <div className="text-8xl group-hover:scale-110 transition-transform duration-700">{subject.icon}</div>
              <h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{subject.name}</h3>
              
              <div className="w-full space-y-2 pt-4 border-t-2 border-slate-50 dark:border-slate-800">
                 {['50+ Board Repeats', 'AI Model Answers', 'Full Subject Vault'].map(feat => (
                   <div key={feat} className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">• {feat}</div>
                 ))}
              </div>

              <button 
                disabled={isOwned}
                onClick={() => toggleCart(subject.id)}
                className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${isOwned ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : inCart ? 'bg-rose-600 text-white' : 'bg-black text-white dark:bg-white dark:text-black hover:bg-rose-600 hover:text-white'}`}
              >
                {isOwned ? 'UNLOCKED' : inCart ? 'REMOVE' : 'ADD TO VAULT'}
              </button>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-black/95 backdrop-blur-3xl border-2 border-white/20 p-8 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] z-[250] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-20 duration-500">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-3xl shadow-2xl animate-pulse text-white">🛒</div>
              <div>
                <div className="text-white font-black text-2xl uppercase tracking-tighter leading-none">{cart.length} SUBJECTS SELECTED</div>
                {discountLabel && <div className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] mt-1">✨ {discountLabel} SAVINGS APPLIED!</div>}
              </div>
           </div>
           
           <div className="flex items-center gap-10">
              <div className="text-right">
                <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Total Payable</div>
                <div className="text-white text-5xl font-black tracking-tighter leading-none">₹{total.toFixed(0)}</div>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(true)} 
                className="bg-indigo-600 text-white px-16 py-6 rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-90 transition-all"
              >
                PROCEED TO PAY
              </button>
           </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
           <div className="w-full max-w-6xl bg-white dark:bg-slate-950 rounded-[4rem] border-4 md:border-8 border-indigo-600 flex flex-col md:flex-row h-full max-h-[90vh] shadow-[0_80px_160px_rgba(0,0,0,1)] overflow-hidden relative">
              
              {/* Order Info (Left Panel) */}
              <div className="flex-[0.8] p-8 md:p-12 space-y-8 overflow-y-auto no-scrollbar border-b-4 md:border-b-0 md:border-r-4 border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950">
                 <div className="flex items-center justify-between border-b-4 pb-4 border-indigo-600">
                   <h2 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">Your Order</h2>
                   <button onClick={() => setIsCheckoutOpen(false)} className="bg-rose-50 text-rose-600 font-black uppercase text-[10px] px-5 py-2 rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-all">Back</button>
                 </div>
                 
                 <div className="space-y-4">
                    {cart.map(id => {
                       const s = SUBJECTS.find(subj => subj.id === id);
                       return (
                         <div key={id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                               <span className="text-3xl">{s?.icon}</span>
                               <span className="font-black text-xs text-black dark:text-white uppercase tracking-tight">{s?.name} Premium</span>
                            </div>
                            <span className="font-black text-lg text-indigo-600">₹29</span>
                         </div>
                       );
                    })}
                 </div>

                 <div className="pt-6 space-y-4 border-t-4 border-slate-100 dark:border-slate-900">
                    <div className="flex justify-between font-black uppercase text-[10px] tracking-widest text-slate-400">
                       <span>Subtotal</span>
                       <span>₹{subtotal}</span>
                    </div>
                    {discountLabel && (
                       <div className="flex justify-between font-black uppercase text-[10px] tracking-widest text-emerald-500">
                          <span>Bundle Discount ({discountLabel})</span>
                          <span>- ₹{discount.toFixed(0)}</span>
                       </div>
                    )}
                    <div className="flex justify-between items-center pt-6 border-t-4 border-slate-200 dark:border-slate-800">
                       <span className="text-2xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">Total</span>
                       <span className="text-5xl font-black text-indigo-600 tracking-tighter leading-none">₹{total.toFixed(0)}</span>
                    </div>
                 </div>
              </div>

              {/* Payment Detail (Right Panel) - MAKE EMAIL SUPER OBVIOUS */}
              <div className="flex-1 p-8 md:p-14 space-y-12 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col justify-center overflow-y-auto no-scrollbar">
                 <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black shadow-lg">1</div>
                        <label className="text-xs font-black uppercase tracking-[0.4em] text-indigo-700 dark:text-indigo-300">Enter Email for Access</label>
                      </div>
                      <input 
                        type="email" 
                        placeholder="example@gmail.com" 
                        autoFocus
                        className="w-full bg-white dark:bg-black border-4 border-indigo-200 dark:border-indigo-900 p-8 rounded-[3rem] font-black text-center text-black dark:text-white outline-none focus:border-indigo-600 text-2xl shadow-xl transition-all placeholder:opacity-30"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                      <p className="text-[10px] text-center font-black uppercase tracking-widest text-rose-600 bg-rose-50 dark:bg-rose-900/20 py-3 rounded-2xl border border-rose-100 dark:border-rose-900 shadow-sm px-6">
                        ⚠️ Pay using this email to unlock your vault immediately!
                      </p>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black shadow-lg">2</div>
                        <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-[0.4em]">Choose Payment Method</h4>
                       </div>
                       <div className="p-8 bg-white dark:bg-black border-4 border-indigo-600 rounded-[3rem] flex items-center justify-center gap-6 text-black dark:text-white shadow-xl relative cursor-pointer hover:bg-indigo-600 hover:text-white transition-all hover:scale-105 active:scale-95 group">
                          <span className="text-4xl group-hover:scale-125 transition-transform">📱</span>
                          <span className="text-sm font-black uppercase tracking-widest">PhonePe / UPI / Google Pay</span>
                          <div className="absolute -top-4 -right-2 bg-emerald-500 text-white text-[9px] px-4 py-2 rounded-full font-black animate-pulse shadow-xl border-2 border-white dark:border-black">SECURE GATEWAY</div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <button 
                      disabled={isProcessing}
                      onClick={handleFinalUnlock} 
                      className="w-full bg-rose-600 text-white py-12 rounded-[4rem] font-black text-3xl uppercase tracking-[0.2em] shadow-[0_40px_80px_rgba(225,29,72,0.4)] hover:scale-105 active:scale-90 transition-all flex items-center justify-center gap-4"
                    >
                      {isProcessing ? 'Processing Payment...' : `Confirm & Pay ₹${total.toFixed(0)}`}
                      {isProcessing && <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>}
                    </button>
                    <button onClick={() => setIsCheckoutOpen(false)} className="w-full text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] hover:text-rose-600 transition-colors">Cancel Payment</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SubjectPage = ({ purchased }: { purchased: string[] }) => {
  const { id } = useParams<{ id: SubjectId }>();
  const subject = SUBJECTS.find(s => s.id === id);
  const isPurchased = purchased.includes(id as string);

  if (!subject) return <div>Subject not found</div>;

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto space-y-16">
      <header className="flex flex-col lg:flex-row items-center gap-12 border-b-4 border-slate-100 dark:border-slate-900 pb-16">
        <div className="text-[10rem] drop-shadow-2xl animate-in zoom-in duration-700 flex-shrink-0">{subject.icon}</div>
        <div className="flex-1 text-center lg:text-left space-y-4">
          <h2 className="text-5xl md:text-6xl font-black text-black dark:text-white tracking-tighter uppercase leading-[0.8]">{subject.name}</h2>
          <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
            {isPurchased ? (
              <Link to={`/vault/${id}`} className="bg-emerald-500 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center gap-4 border-4 border-emerald-400">
                <span className="text-2xl animate-pulse">✓</span> OPEN PREMIUM VAULT
              </Link>
            ) : (
              <Link to="/premium" className="bg-rose-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(225,29,72,0.4)] animate-pulse hover:scale-110 active:scale-95 transition-all flex items-center gap-4 border-4 border-rose-400">
                <span className="text-2xl">💎</span> UNLOCK PREMIUM VAULT
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-10">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2">Detailed Notes Archive</div>
        {subject.chapters.map((chapter, idx) => (
          <div key={chapter.id} className="p-10 md:p-12 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-10 shadow-xl hover:scale-[1.02] hover:border-indigo-600 transition-all duration-700 group">
            <div className="flex-1 text-center md:text-left">
              <span className="text-indigo-600 font-black text-4xl italic opacity-10 tracking-tighter group-hover:opacity-100 transition-opacity">CH {idx+1}</span>
              <h3 className="text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tighter mt-3 leading-none">{chapter.title}</h3>
              <p className="text-lg font-bold text-slate-500 mt-4 leading-relaxed max-w-xl">{chapter.description}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {[...Array(chapter.totalParts)].map((_, i) => (
                <Link key={i} to={`/chapter/${id}/${chapter.title}/${i + 1}/${chapter.totalParts}`} className="bg-slate-50 dark:bg-slate-800 text-black dark:text-white px-8 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-inner hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all border-2 border-transparent hover:border-indigo-600 active:scale-90">Part {i+1}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => (
  <div className="p-10 md:p-20 max-w-7xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom-20 duration-1000">
    <header className="text-center space-y-10 max-w-6xl mx-auto">
      <div className="inline-block bg-indigo-600 text-white text-[12px] px-10 py-3 rounded-full font-black uppercase tracking-[0.5em] shadow-2xl mb-2">Class 12 Boards 2026 • AI MASTER</div>
      <h1 className="text-6xl md:text-8xl font-black text-black dark:text-white tracking-tighter leading-[0.7] uppercase">Boards <br/><span className="text-indigo-600">Mastered.</span></h1>
      <p className="text-2xl md:text-3xl font-bold text-slate-500 max-w-4xl mx-auto leading-relaxed uppercase tracking-tight">AI-Generated Master Notes & The 50 Most Repeated Board Exam patterns. Simplified for the perfect 95%+ score.</p>
      <div className="flex flex-wrap justify-center gap-10 pt-12">
        <Link to="/subject/physics" className="bg-black text-white dark:bg-white dark:text-black px-16 py-7 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-transparent hover:border-indigo-600">Free Notes</Link>
        <Link to="/premium" className="bg-rose-600 text-white px-16 py-7 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:scale-110 active:scale-95 transition-all relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0] transition-transform duration-500"></div>
          <span className="relative z-10">THE VAULT</span>
        </Link>
      </div>
    </header>
  </div>
);

const App = () => {
  const [isDark, setIsDark] = useState(false);
  const [purchased, setPurchased] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PURCHASE_KEY) || '[]');
    } catch { return []; }
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch { return null; }
  });

  useEffect(() => { 
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); 
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => { 
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchased)); 
  }, [purchased]);

  const handleLogin = (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const cloudDb = JSON.parse(localStorage.getItem(CLOUD_MOCK_KEY) || '{}');
    const cloudPurchases = cloudDb[cleanEmail] || [];
    const merged = Array.from(new Set([...purchased, ...cloudPurchases]));
    setPurchased(merged);
    setUser({ email: cleanEmail, purchasedSubjects: merged as SubjectId[], lastSync: Date.now() });
    
    if (cloudPurchases.length > 0) {
      alert(`🎉 ACCOUNT RESTORED! Access to ${cloudPurchases.length} subjects found for ${cleanEmail}. Syncing your vault now...`);
    } else {
      alert(`Account Linked to ${cleanEmail}. No previous purchases found on our master server.`);
    }
  };

  const handleLogout = () => {
    setUser(null);
    alert('Session Ended. Your vault access remains tied to your email.');
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <FomoToast />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-500 selection:bg-indigo-600 selection:text-white">
        <HashRouter>
          <Sidebar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={handleLogout} />
          <main className="flex-1 h-screen overflow-y-auto no-scrollbar relative">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/subject/:id" element={<SubjectPage purchased={purchased} />} />
              <Route path="/chapter/:subjectId/:title/:part/:total" element={<ChapterView />} />
              <Route path="/vault/:subjectId" element={<VaultView purchased={purchased} />} />
              <Route path="/premium" element={<PremiumPortal settings={DEFAULT_SETTINGS} setPurchased={setPurchased} purchased={purchased} user={user} />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
            </Routes>
          </main>
        </HashRouter>
      </div>
    </div>
  );
};

export default App;
