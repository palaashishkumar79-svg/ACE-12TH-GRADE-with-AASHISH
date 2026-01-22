
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { SUBJECTS } from './constants';
import { ChapterNote, SubjectId, PremiumQuestion, UserProfile } from './types';
import { generateChapterNotes, generatePremiumQuestions, savePurchaseToSheet, fetchPurchasesFromSheet } from './services/geminiService';
import NoteRenderer, { FormattedText, FormulaImage } from './components/NoteRenderer';

const PURCHASE_KEY = 'ace12_purchases_v2026_final';
const REFERRAL_KEY = 'ace12_referrals_v2026';

const FomoToast = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = ["🔥 42 students unlocked Vault just now", "⚠️ Price rising to ₹99 soon!", "🚀 18.5k+ Class 12th users active", "💎 All-Subject Discount ends in 2h"];
  useEffect(() => {
    const timer = setInterval(() => setMsgIdx(p => (p + 1) % messages.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="fixed top-24 right-8 z-[200] no-print hidden md:block">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-indigo-600 p-5 rounded-3xl shadow-2xl animate-bounce-slow flex items-center gap-4 max-w-[280px]">
        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{messages[msgIdx]}</p>
      </div>
    </div>
  );
};

const VaultView = ({ purchased }: { purchased: string[] }) => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [questions, setQuestions] = useState<PremiumQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const isUnlocked = purchased.includes(subjectId as string);
  const subject = SUBJECTS.find(s => s.id === subjectId);

  useEffect(() => {
    if (!isUnlocked) return;
    const fetchVault = async () => {
      setLoading(true);
      try { 
        const data = await generatePremiumQuestions(subjectId as SubjectId); 
        setQuestions(data); 
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchVault();
  }, [subjectId, isUnlocked]);

  if (!isUnlocked) return (
    <div className="p-24 text-center space-y-10">
      <div className="text-[10rem]">🔒</div>
      <h2 className="text-5xl font-black uppercase tracking-tighter dark:text-white">Diamond Archive Locked</h2>
      <p className="text-slate-500 uppercase font-black text-xs tracking-widest max-w-md mx-auto leading-relaxed">This elite archive of 40 most-repeated Board questions is restricted. Unlock via The Vault.</p>
      <Link to="/premium" className="inline-block bg-rose-600 text-white px-16 py-6 rounded-[2rem] font-black uppercase text-sm shadow-xl">Unlock Vault ₹29</Link>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-12 text-center animate-pulse gap-8">
      <div className="text-[10rem] animate-spin-slow">💎</div>
      <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Extracting 40 Elite Board Questions...</h2>
    </div>
  );

  return (
    <div className="p-8 md:p-24 max-w-7xl mx-auto space-y-24 animate-in fade-in duration-1000">
      <header className="text-center space-y-8">
        <div className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-xl">Verified Master Archive</div>
        <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter dark:text-white leading-none">{subject?.name} <span className="text-indigo-600">VAULT.</span></h2>
        <button onClick={() => window.print()} className="bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl">DOWNLOAD AS PDF</button>
      </header>
      <div className="grid gap-20">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-12 md:p-24 rounded-[5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute right-[-40px] top-[-40px] text-[20rem] opacity-[0.02] font-black italic select-none">#{idx+1}</div>
            <div className="flex flex-wrap gap-4 mb-10 relative z-10">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest">{q.type || 'H.Y. Concept'}</span>
              {q.repeatedYears.map(y => <span key={y} className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black px-4 py-2 rounded-full uppercase">{y}</span>)}
            </div>
            <h3 className="text-4xl md:text-5xl font-black mb-12 leading-tight tracking-tighter dark:text-white relative z-10">{q.question}</h3>
            {q.visualPrompt && <div className="mb-16 max-w-2xl mx-auto"><FormulaImage prompt={q.visualPrompt} /></div>}
            <div className="bg-indigo-50 dark:bg-indigo-950/50 p-12 rounded-[4rem] border-2 border-indigo-100 dark:border-indigo-900">
               <FormattedText text={q.solution} className="text-xl md:text-2xl font-bold dark:text-white leading-relaxed" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PremiumPortal = ({ purchased, setPurchased }: { purchased: string[], setPurchased: any }) => {
  const [cart, setCart] = useState<string[]>([]);
  const [referralCount, setReferralCount] = useState<number>(() => {
    return parseInt(localStorage.getItem(REFERRAL_KEY) || '0');
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', streetAddress: '', city: '', zipCode: '' });
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(REFERRAL_KEY, referralCount.toString());
  }, [referralCount]);

  const handleShare = async () => {
    const shareData = {
      title: 'Ace12th Master Archive',
      text: 'Bhai check this! 12th Board exam ke liye AI predicted questions aur master notes mil rahe hai yaha. Best source for 95%+ marks!',
      url: 'https://ace12th-grade.netlify.app/'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setReferralCount(p => Math.min(20, p + 1));
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`);
        setReferralCount(p => Math.min(20, p + 1));
      }
    } catch (err) {
      console.log('Share canceled or failed');
    }
  };

  const toggleCart = (id: string) => setCart(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const calculateTotal = () => {
    const baseTotal = cart.length * 29;
    let bundleDiscount = 0;
    if (cart.length === 6) bundleDiscount = 0.20; 
    else if (cart.length >= 3) bundleDiscount = 0.10;
    
    // Referral Discount: 5% per referral
    const referralDiscount = referralCount * 0.05;
    const combinedDiscount = Math.min(1, bundleDiscount + referralDiscount);
    
    const discountAmount = baseTotal * combinedDiscount;
    const finalTotal = baseTotal - discountAmount;

    return { 
      subtotal: baseTotal, 
      discountAmount, 
      total: finalTotal, 
      label: combinedDiscount > 0 ? `${(combinedDiscount * 100).toFixed(0)}% OFF APPLIED` : null,
      isFree: finalTotal <= 0 && cart.length > 0
    };
  };

  const { subtotal, discountAmount, total, label, isFree } = calculateTotal();

  const handleFinalUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    // Use lowercased email for saving
    const finalEmail = formData.email.toLowerCase().trim();
    const success = await savePurchaseToSheet({ ...formData, email: finalEmail, productName: cart.join(', '), totalAmount: total, timestamp: new Date().toISOString() });
    
    setPurchased(Array.from(new Set([...purchased, ...cart])));
    setIsSyncing(false);
    setIsCheckoutOpen(false);
    alert(isFree ? "REFERRAL REWARD: VAULT UNLOCKED FOR FREE!" : "VAULT UNLOCKED! Your access is active.");
    navigate('/');
  };

  return (
    <div className="p-8 md:p-24 max-w-7xl mx-auto space-y-24 pb-64">
      {/* Referral Rule Sticky Notice */}
      <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-indigo-400">
        <div className="flex items-center gap-6">
          <div className="text-4xl">🎁</div>
          <div>
            <h4 className="font-black uppercase tracking-tighter text-xl">Share Ace12th & Study for FREE!</h4>
            <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Get 5% OFF for every friend you refer. 20 friends = 100% FREE Access to all subjects.</p>
          </div>
        </div>
        <button onClick={handleShare} className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-xl hover:scale-105 transition-all">
          SHARE LINK & EARN
        </button>
      </div>

      <header className="text-center space-y-10">
        <h2 className="text-7xl md:text-[10rem] font-black dark:text-white tracking-tighter uppercase leading-none">THE <span className="text-rose-600">VAULT.</span></h2>
        
        {/* Premium Importance Block */}
        <div className="max-w-4xl mx-auto bg-slate-900 text-white p-12 rounded-[4rem] border-b-8 border-rose-600 space-y-6">
           <div className="inline-block bg-rose-600 px-4 py-1 rounded-full text-[10px] font-black uppercase">Elite Board Resource</div>
           <h3 className="text-3xl font-black uppercase leading-tight">Why Premium Questions are non-negotiable?</h3>
           <p className="text-slate-400 text-sm font-medium leading-relaxed">Most students fail because they study everything but practice nothing. Our Vault contains exactly 40 questions per subject—these are the ones that actually repeat. Our AI has analyzed 10 years of data to give you a 95% similarity prediction. Don't leave your results to chance.</p>
        </div>

        {/* Referral Progress Bar */}
        <div className="max-w-3xl mx-auto space-y-4">
           <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest">
              <span>Referral Progress</span>
              <span>{referralCount}/20 Friends</span>
           </div>
           <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-1000" 
                style={{ width: `${(referralCount/20)*100}%` }}
              />
           </div>
           {referralCount >= 20 && <p className="text-emerald-500 font-black uppercase text-[10px] animate-pulse tracking-widest">🎉 100% DISCOUNT UNLOCKED! CHOOSE ALL SUBJECTS NOW.</p>}
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {SUBJECTS.map(subject => {
          const isOwned = purchased.includes(subject.id);
          const inCart = cart.includes(subject.id);
          return (
            <div key={subject.id} className={`bg-white dark:bg-slate-900 p-12 rounded-[4rem] border-4 ${inCart ? 'border-indigo-600 shadow-2xl scale-105' : 'border-slate-50 dark:border-slate-800'} transition-all cursor-pointer relative group`} onClick={() => !isOwned && toggleCart(subject.id)}>
              {inCart && <div className="absolute top-8 right-8 text-4xl">✅</div>}
              <div className="text-[7rem] text-center mb-8 group-hover:scale-110 transition-transform">{subject.icon}</div>
              <h3 className="text-3xl font-black text-center mb-8 uppercase dark:text-white">{subject.name}</h3>
              <div className={`w-full py-5 rounded-[2rem] font-black text-center text-xs uppercase tracking-widest transition-all ${isOwned ? 'bg-emerald-50 text-emerald-600' : inCart ? 'bg-rose-600 text-white' : 'bg-black text-white hover:bg-indigo-600'}`}>
                {isOwned ? '✓ UNLOCKED' : inCart ? 'SELECTED' : 'ADD TO VAULT'}
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-black p-10 rounded-[3.5rem] shadow-2xl z-[250] flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 backdrop-blur-xl">
           <div className="text-white space-y-2">
              <div className="font-black text-4xl uppercase">{cart.length} Subject Archives</div>
              {label && <div className="text-rose-500 font-black text-xs uppercase tracking-widest animate-pulse">{label}</div>}
           </div>
           <div className="flex items-center gap-12">
              <div className="text-right text-white">
                <div className="text-6xl font-black">₹{total.toFixed(0)}</div>
                {discountAmount > 0 && <div className="text-slate-400 text-xs font-black line-through">WAS ₹{subtotal}</div>}
              </div>
              <button onClick={() => setIsCheckoutOpen(true)} className="bg-indigo-600 text-white px-16 py-7 rounded-3xl font-black uppercase text-sm shadow-xl hover:scale-105 transition-all">
                {isFree ? 'CLAIM FOR FREE' : 'CHECKOUT NOW'}
              </button>
           </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-3xl p-10 md:p-16 rounded-[4rem] border-8 border-indigo-600 space-y-8 max-h-[90vh] overflow-y-auto">
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter dark:text-white">Final Sync Details</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Necessary for cloud backup and access restoration.</p>
              </div>
              <form onSubmit={handleFinalUnlock} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name" required className="w-full p-6 bg-slate-50 rounded-2xl font-black outline-none focus:border-indigo-600 border-2 border-transparent" onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  <input type="text" placeholder="Last Name" required className="w-full p-6 bg-slate-50 rounded-2xl font-black outline-none focus:border-indigo-600 border-2 border-transparent" onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <input type="email" placeholder="Purchase Email (Used for Sync)" required className="w-full p-6 bg-slate-50 rounded-2xl font-black outline-none focus:border-indigo-600 border-2 border-transparent" onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="text" placeholder="Full Street Address" required className="w-full p-6 bg-slate-50 rounded-2xl font-black outline-none focus:border-indigo-600 border-2 border-transparent" onChange={e => setFormData({...formData, streetAddress: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="City" required className="w-full p-6 bg-slate-50 rounded-2xl font-black outline-none focus:border-indigo-600 border-2 border-transparent" onChange={e => setFormData({...formData, city: e.target.value})} />
                  <input type="text" placeholder="Zip Code" required className="w-full p-6 bg-slate-50 rounded-2xl font-black outline-none focus:border-indigo-600 border-2 border-transparent" onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                </div>
                <button type="submit" disabled={isSyncing} className="w-full bg-rose-600 text-white py-10 rounded-3xl font-black text-3xl uppercase tracking-widest shadow-2xl">
                  {isSyncing ? 'SYNCHRONIZING...' : isFree ? 'CLAIM FOR ₹0' : `PAY ₹${total.toFixed(0)}`}
                </button>
                <button type="button" onClick={() => setIsCheckoutOpen(false)} className="w-full text-center text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-600">CANCEL ORDER</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const Login = ({ onLogin, setPurchased }: { onLogin: (profile: UserProfile) => void, setPurchased: (s: string[]) => void }) => {
  const [email, setEmail] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setIsSyncing(true);
    const cleanEmail = email.toLowerCase().trim();
    const cloudPurchases = await fetchPurchasesFromSheet(cleanEmail);
    
    // Pass a proper UserProfile object
    onLogin({
      email: cleanEmail,
      purchasedSubjects: cloudPurchases as SubjectId[],
      lastSync: Date.now()
    });
    
    setPurchased(cloudPurchases); 
    setIsSyncing(false);
    
    if (cloudPurchases.length > 0) {
      alert(`SYNC COMPLETE: ${cloudPurchases.length} subject archives restored.`);
      navigate('/');
    } else {
      alert("No active purchases found for this email. If you just paid, wait 5 mins and try again.");
    }
  };

  return (
    <div className="p-8 md:p-24 max-w-2xl mx-auto space-y-16 min-h-[60vh] flex flex-col justify-center animate-in zoom-in">
      <header className="text-center space-y-8">
        <h2 className="text-6xl font-black uppercase tracking-tighter dark:text-white">Cloud Sync</h2>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed">Enter your purchase email to restore access across all your devices.</p>
      </header>
      <form onSubmit={handleSync} className="space-y-8 bg-white dark:bg-slate-900 p-14 rounded-[5rem] border-4 border-slate-50 dark:border-slate-800 shadow-2xl">
        <div className="space-y-4">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-4">Account Email</label>
          <input type="email" placeholder="student@example.com" required className="w-full p-8 bg-slate-50 dark:bg-black border-4 rounded-[2.5rem] font-black text-center outline-none focus:border-indigo-600 dark:text-white text-xl" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={isSyncing} className="w-full bg-indigo-600 text-white py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
          {isSyncing ? 'RESTORE IN PROGRESS...' : 'RESTORE ACCESS'}
        </button>
        <p className="text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Verified access is linked to your billing email.</p>
      </form>
    </div>
  );
};

const SubjectPage = ({ purchased }: { purchased: string[] }) => {
  const { id } = useParams<{ id: string }>();
  const subject = SUBJECTS.find(s => s.id === id);
  const isPurchased = purchased.includes(id as string);
  if (!subject) return <div className="p-24 text-center font-black">Subject not found</div>;
  return (
    <div className="p-8 md:p-24 max-w-7xl mx-auto space-y-16 animate-in fade-in">
      <header className="flex flex-col lg:flex-row items-center gap-16 border-b-8 border-slate-50 dark:border-slate-900 pb-20">
        <div className="text-[12rem] drop-shadow-2xl">{subject.icon}</div>
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <h2 className="text-5xl md:text-8xl font-black text-black dark:text-white uppercase leading-none tracking-tighter">{subject.name} MASTER FILES</h2>
          <div className="flex flex-wrap justify-center lg:justify-start gap-6">
            {isPurchased ? (
              <Link to={`/vault/${id}`} className="bg-emerald-500 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">💎 OPEN PREMIUM VAULT</Link>
            ) : (
              <Link to="/premium" className="bg-rose-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase shadow-xl animate-pulse hover:scale-105 transition-all">💎 UNLOCK ELITE VAULT</Link>
            )}
          </div>
        </div>
      </header>
      <div className="grid gap-10">
        {subject.chapters.map((chapter, idx) => (
          <div key={chapter.id} className="p-12 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-10 shadow-lg hover:border-indigo-600 transition-all">
            <div className="text-center lg:text-left space-y-3">
              <span className="text-indigo-600 font-black text-4xl opacity-10 italic">UNIT {idx+1}</span>
              <h3 className="text-3xl font-black dark:text-white uppercase tracking-tighter">{chapter.title}</h3>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{chapter.description}</p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              {[...Array(chapter.totalParts)].map((_, i) => (
                <Link key={i} to={`/chapter/${id}/${chapter.title}/${i + 1}/${chapter.totalParts}`} className="bg-slate-50 dark:bg-slate-800 dark:text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase border-2 border-transparent hover:border-indigo-600 shadow-sm">Part {i+1}</Link>
              ))}
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
  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      try { const data = await generateChapterNotes(subjectId as SubjectId, title!, parseInt(part!), parseInt(total!)); setNote(data); } 
      catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchNote();
  }, [subjectId, title, part, total]);
  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center p-24 text-center animate-pulse dark:text-white gap-8"><div className="text-[10rem]">📖</div><h2 className="text-4xl font-black uppercase tracking-tighter">Retrieving Master Archive...</h2></div>;
  return <div className="p-8 md:p-12"><NoteRenderer note={note!} /></div>;
};

const Home = () => (
    <div className="pb-32 px-8">
      <header className="text-center space-y-12 max-w-6xl mx-auto pt-24 animate-in fade-in duration-1000">
        <div className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.4em] shadow-xl">Batch 2026 Master Archives</div>
        <h1 className="text-7xl md:text-[11rem] font-black text-black dark:text-white tracking-tighter leading-[0.75] uppercase">Ace 12th <br/><span className="text-indigo-600">GRADE.</span></h1>
        <p className="text-2xl font-bold text-slate-500 uppercase max-w-4xl mx-auto tracking-tight">AI-Curated Board Predictions & Comprehensive Master Files.</p>
        <div className="flex flex-wrap justify-center gap-8 pt-10">
          <Link to="/subject/physics" className="bg-black dark:bg-white text-white dark:text-black px-16 py-7 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-105 transition-all">Free Notes</Link>
          <Link to="/premium" className="bg-rose-600 text-white px-16 py-7 rounded-[2.5rem] font-black text-sm uppercase animate-pulse shadow-2xl hover:scale-105 transition-all">The Vault</Link>
        </div>
      </header>
      <div className="mt-56 max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-12">
        {SUBJECTS.map(subject => (
          <Link key={subject.id} to={`/subject/${subject.id}`} className="bg-white dark:bg-slate-900 p-12 rounded-[5rem] border-4 border-slate-50 dark:border-slate-800 shadow-xl hover:border-indigo-600 hover:scale-[1.05] transition-all flex flex-col items-center group">
            <div className="text-[9rem] group-hover:scale-110 transition-transform drop-shadow-xl">{subject.icon}</div>
            <h3 className="text-4xl font-black dark:text-white uppercase mt-10 tracking-tighter">{subject.name}</h3>
          </Link>
        ))}
      </div>
    </div>
);

const MobileHeader = () => (
  <header className="lg:hidden p-6 bg-white dark:bg-slate-950 border-b-4 border-slate-50 dark:border-slate-900 flex justify-between items-center sticky top-0 z-[100] no-print">
    <Link to="/" className="flex items-center gap-4">
      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl">A</div>
      <span className="font-black text-[10px] uppercase tracking-widest dark:text-white">ACE12TH MASTER</span>
    </Link>
    <div className="flex gap-2">
      <Link to="/login" className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-black text-[9px] uppercase">Sync</Link>
      <Link to="/premium" className="bg-rose-600 text-white px-4 py-2 rounded-full font-black text-[9px] uppercase">Vault</Link>
    </div>
  </header>
);

const App = () => {
  const [isDark, setIsDark] = useState(false);
  const [purchased, setPurchased] = useState<string[]>(() => {
    const data = localStorage.getItem(PURCHASE_KEY);
    return data ? JSON.parse(data) : [];
  });
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => { localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchased)); }, [purchased]);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <HashRouter>
          <MobileHeader />
          <div className="flex flex-col lg:flex-row">
            <aside className="no-print w-96 bg-white dark:bg-slate-950 border-r-8 border-slate-50 dark:border-slate-900 h-screen sticky top-0 hidden lg:flex flex-col">
              <div className="p-12 space-y-12">
                <Link to="/"><div className="w-24 h-24 bg-indigo-600 text-white rounded-[3rem] flex items-center justify-center font-black text-6xl shadow-2xl">A</div></Link>
                <button onClick={() => setIsDark(!isDark)} className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest">{isDark ? 'LIGHT MODE' : 'DARK MODE'}</button>
              </div>
              <nav className="flex-1 overflow-y-auto px-10 space-y-6 no-scrollbar pb-16">
                {SUBJECTS.map(s => <Link key={s.id} to={`/subject/${s.id}`} className="flex items-center space-x-6 p-6 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-900 border-4 border-transparent hover:border-indigo-600 group"><span className="text-5xl group-hover:scale-110 transition-transform">{s.icon}</span><span className="text-xs font-black uppercase dark:text-white tracking-widest">{s.name}</span></Link>)}
                <Link to="/premium" className="flex items-center space-x-6 p-8 rounded-[2.5rem] bg-rose-600 text-white font-black shadow-xl hover:scale-105 transition-all"><span className="text-5xl">💎</span><span className="text-sm uppercase tracking-widest">THE VAULT</span></Link>
              </nav>
              <div className="p-10 border-t-2 border-slate-50 dark:border-slate-900">
                 <Link to="/login" className="flex items-center gap-4 text-indigo-600 hover:text-indigo-800 transition-colors">
                    <span className="text-2xl">🔄</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">RESYNC ACCOUNT</span>
                 </Link>
              </div>
            </aside>
            <main className="flex-1 relative no-scrollbar">
              <FomoToast />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/subject/:id" element={<SubjectPage purchased={purchased} />} />
                <Route path="/chapter/:subjectId/:title/:part/:total" element={<ChapterView />} />
                <Route path="/vault/:subjectId" element={<VaultView purchased={purchased} />} />
                <Route path="/premium" element={<PremiumPortal purchased={purchased} setPurchased={setPurchased} />} />
                <Route path="/login" element={<Login onLogin={(u:UserProfile) => setUser(u)} setPurchased={setPurchased} />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </div>
    </div>
  );
};
export default App;
