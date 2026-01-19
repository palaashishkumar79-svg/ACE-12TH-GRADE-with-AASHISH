
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { SUBJECTS } from './constants';
import { ChapterNote, SubjectId, PremiumQuestion, AppSettings, UserProfile } from './types';
import { generateChapterNotes, generatePremiumQuestions } from './services/geminiService';
import NoteRenderer, { FormattedText } from './components/NoteRenderer';

// Unified Storage Keys
const PURCHASE_KEY = 'ace12_purchases_v3';
const USER_KEY = 'ace12_user_profile_v3';
const CLOUD_MOCK_KEY = 'ace12_cloud_sim_v3';

const DEFAULT_SETTINGS: AppSettings = {
  premiumPrice: 29, 
  isVaultOpen: true
};

const Breadcrumbs = () => {
  const { id, subjectId, title } = useParams();
  const location = useLocation();
  const path = location.pathname;

  const getSubjectName = (sid: string) => SUBJECTS.find(s => s.id === sid)?.name || sid;

  return (
    <nav className="no-print mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
      {id && (
        <>
          <span className="opacity-30">/</span>
          <Link to={`/subject/${id}`} className="hover:text-indigo-600 transition-colors">{getSubjectName(id)}</Link>
        </>
      )}
      {subjectId && (
        <>
          <span className="opacity-30">/</span>
          <Link to={`/subject/${subjectId}`} className="hover:text-indigo-600 transition-colors">{getSubjectName(subjectId)}</Link>
        </>
      )}
      {title && (
        <>
          <span className="opacity-30">/</span>
          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{title}</span>
        </>
      )}
    </nav>
  );
};

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/') return null;
  return (
    <div className="no-print mb-4 flex items-center gap-4">
      <button 
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate('/');
        }}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group"
      >
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 group-hover:border-indigo-600 flex items-center justify-center transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
        </div>
        <span className="font-black text-[10px] uppercase tracking-widest">Go Back</span>
      </button>
    </div>
  );
};

const MobileHeader = ({ user }: { user: UserProfile | null }) => (
  <header className="lg:hidden no-print h-16 bg-white dark:bg-slate-950 border-b-2 border-slate-100 dark:border-slate-900 px-6 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
    <Link to="/" className="flex items-center gap-2">
      <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-sm">A</div>
      <span className="font-black text-[10px] uppercase tracking-widest dark:text-white">Ace12th</span>
    </Link>
    <div className="flex items-center gap-3">
      <Link to="/login" className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full">Sync</Link>
      <Link to="/premium" className="text-[9px] font-black text-white bg-rose-600 px-3 py-1.5 rounded-full">Vault</Link>
    </div>
  </header>
);

const Footer = () => (
  <footer className="no-print bg-slate-900 text-slate-400 py-16 px-6 mt-20 border-t border-slate-800">
    <div className="max-w-7xl mx-auto flex flex-col items-center space-y-10">
      {/* Trust Badges for AdSense Confidence */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl border-b border-slate-800 pb-10">
        <div className="flex flex-col items-center text-center space-y-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">AI Verified Content</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-2">
          <span className="text-2xl">🔒</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Secure Payments</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-2">
          <span className="text-2xl">📖</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">NCERT Aligned</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-2">
          <span className="text-2xl">⚡</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Fast Learning</span>
        </div>
      </div>

      <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[11px] font-bold uppercase tracking-widest">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <Link to="/about" className="hover:text-white transition-colors">About ACE12THGRADE</Link>
        <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
        <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        <Link to="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
      </nav>
      
      <div className="text-[9px] uppercase tracking-[0.3em] opacity-40 text-center space-y-2">
        <p>© 2026 ACE12THGRADE • EMPOWERING CLASS 12 STUDENTS</p>
        <p>ALL RIGHTS RESERVED • MADE WITH ❤️ FOR BOARD EXAMS</p>
      </div>
    </div>
  </footer>
);

// --- AdSense Compliance Pages ---

const PageLayout = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="p-6 md:p-16 max-w-4xl mx-auto animate-in fade-in duration-500">
    <Breadcrumbs />
    <BackButton />
    <div className="bg-white dark:bg-slate-900 p-8 md:p-16 rounded-[3rem] border-4 border-slate-100 dark:border-slate-800 shadow-2xl space-y-8">
      <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter dark:text-white border-b-4 border-indigo-600 pb-4 inline-block">{title}</h1>
      <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 font-medium leading-relaxed space-y-6">
        {children}
      </div>
    </div>
  </div>
);

const AboutPage = () => (
  <PageLayout title="About ACE12THGRADE">
    <p>Welcome to <strong>ACE12THGRADE</strong>, your dedicated platform for high-impact Class 12 Board Exam preparation. We focus on providing precision-engineered study materials designed to help students achieve excellence in their final board exams.</p>
    <p>Our platform is built on the philosophy that smart preparation beats hard work. By using AI-curated insights, we filter the vast syllabus into what actually matters for your exams.</p>
    <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight">Why Choose ACE12THGRADE?</h3>
    <ul className="list-disc pl-6 space-y-2">
      <li><strong>Precision AI Notes:</strong> Our notes are structured specifically for the latest 2026 Board Exam patterns, focusing on clarity and retention.</li>
      <li><strong>The Premium Vault Archive:</strong> A curated collection of the 50 most repeated questions from the last 10 years, solved with step-by-step AI logic.</li>
      <li><strong>Concept-First Approach:</strong> We don't just give you answers; we provide the 'Tricks' and 'Shortcuts' (in Hinglish where needed) to solve problems faster.</li>
      <li><strong>Exam-Ready Formatting:</strong> All our content is optimized for PDF download, allowing you to study anywhere, anytime without distractions.</li>
    </ul>
    <p>At ACE12THGRADE, we are committed to being the most reliable resource for Class 12 students across Physics, Chemistry, Maths, English, Computer Science, and Physical Education.</p>
  </PageLayout>
);

const ContactPage = () => (
  <PageLayout title="Contact Us">
    <p>Need help with your Vault access or have questions about our notes? Our support team is ready to assist you.</p>
    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-8 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900 space-y-4">
      <p className="font-black text-indigo-600 uppercase tracking-widest text-sm">Official Support Email:</p>
      <a href="mailto:ace12thgrade@gmail.com" className="text-2xl md:text-3xl font-black text-black dark:text-white hover:underline block truncate">ace12thgrade@gmail.com</a>
    </div>
    <p>We aim to respond to all student queries within 24 hours. If you've made a purchase, please mention your transaction details or registered email for faster resolution.</p>
  </PageLayout>
);

const DisclaimerPage = () => (
  <PageLayout title="Disclaimer">
    <p>The information provided by <strong>ACE12THGRADE</strong> is for general educational purposes. While our AI systems and human editors work to ensure accuracy, educational patterns and marking schemes may vary.</p>
    <p><strong>Educational Resource:</strong> Our content should be used as a supplementary resource alongside your official <strong>NCERT Textbooks</strong>. We do not claim to replace the official curriculum provided by educational boards.</p>
    <p><strong>Predictions:</strong> Our 'Most Repeated Questions' and 'Predicted PYQs' are based on statistical analysis of previous year papers. They are high-probability questions but do not guarantee their appearance in any specific exam.</p>
    <p><strong>Non-Affiliation:</strong> ACE12THGRADE is an independent platform and is not affiliated with or endorsed by CBSE, CISCE, or any other state board.</p>
  </PageLayout>
);

const PrivacyPolicyPage = () => (
  <PageLayout title="Privacy Policy">
    <p>Your privacy is important to us at ACE12THGRADE. This policy explains how we handle your data.</p>
    <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight">Data Handling</h3>
    <p>We collect your <strong>Email Address</strong> during account synchronization. This is used solely to maintain your access to the Premium Vault and to send important exam updates.</p>
    <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight">Security</h3>
    <p>We utilize browser Local Storage to keep your preferences and purchase data secure on your local device. We do not store payment sensitive information on our servers; all transactions are handled via secure third-party gateways.</p>
    <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-tight">Cookies</h3>
    <p>We may use cookies to improve your browsing experience and for analytics to understand which subjects are most popular among our students.</p>
  </PageLayout>
);

const BlogPlaceholder = () => (
  <PageLayout title="ACE12THGRADE Blog">
    <p>Stay tuned for our upcoming articles on Board Exam strategies:</p>
    <ul className="list-disc pl-6 space-y-2">
      <li>Subject-wise Weightage Analysis for 2026.</li>
      <li>How to write answers like a Board Topper.</li>
      <li>Mistakes to avoid in Practical Exams.</li>
      <li>Revision hacks for the last 30 days.</li>
    </ul>
  </PageLayout>
);

// --- End of AdSense Pages ---

const FomoToast = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = ["⚠️ Price rising to ₹99 soon!", "🚀 8,400+ students already in", "📄 High-Quality PDF Downloads Available!"];
  useEffect(() => {
    const timer = setInterval(() => setMsgIdx(p => (p + 1) % messages.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="fixed top-24 right-6 z-[200] no-print pointer-events-none hidden md:block">
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-600 p-4 rounded-2xl shadow-2xl animate-bounce-slow flex items-center gap-3 max-w-[220px] pointer-events-auto transition-all">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{messages[msgIdx]}</p>
      </div>
    </div>
  );
};

const Sidebar = ({ isDark, setIsDark, user, onLogout }: { isDark: boolean, setIsDark: (v: boolean) => void, user: UserProfile | null, onLogout: () => void }) => (
  <aside className="no-print w-80 bg-white dark:bg-slate-950 border-r-4 border-slate-100 dark:border-slate-900 h-screen sticky top-0 hidden lg:flex flex-col shadow-2xl z-50">
    <div className="p-10 mb-2 flex flex-col items-center">
      <Link to="/" className="flex items-center space-x-4 group mb-10 transition-transform hover:scale-105">
        <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center font-black shadow-2xl text-3xl">A12</div>
        <span className="text-2xl font-black tracking-tighter text-black dark:text-white leading-none">Ace12th<br/><span className="text-indigo-600">GRADE</span></span>
      </Link>
      {user ? (
        <div className="w-full bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 mb-6 text-center">
          <div className="text-xs font-black text-black dark:text-white truncate mb-2">{user.email}</div>
          <button onClick={onLogout} className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">Log Out</button>
        </div>
      ) : (
        <Link to="/login" className="w-full bg-slate-900 text-white dark:bg-white dark:text-black p-5 rounded-2xl text-center font-black text-xs uppercase tracking-widest mb-6 shadow-xl hover:scale-105 transition-all">Restore Access</Link>
      )}
      <button onClick={() => setIsDark(!isDark)} className="px-6 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all font-black text-[10px] shadow-xl uppercase tracking-widest border-2 border-slate-300 dark:border-slate-700 w-full">
        {isDark ? 'LIGHT MODE' : 'DARK MODE'}
      </button>
    </div>
    <nav className="flex-1 overflow-y-auto px-8 space-y-4 no-scrollbar pb-10">
      <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-6 px-2">Subjects</div>
      {SUBJECTS.map(subject => (
        <Link key={subject.id} to={`/subject/${subject.id}`} className="flex items-center space-x-4 p-5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 text-black dark:text-white font-black transition-all group border-2 border-transparent hover:border-indigo-600">
          <span className="text-3xl group-hover:scale-110 transition-transform">{subject.icon}</span>
          <span className="text-[11px] uppercase tracking-widest leading-none">{subject.name}</span>
        </Link>
      ))}
      <div className="pt-10 text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] mb-6 px-2">Premium</div>
      <Link to="/premium" className="flex items-center space-x-4 p-6 rounded-3xl bg-rose-600 text-white font-black border-2 border-rose-700 hover:scale-[1.02] transition-all shadow-xl">
        <span className="text-3xl">💎</span>
        <span className="text-xs uppercase tracking-widest leading-none">THE VAULT</span>
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
    }, 1200);
  };
  return (
    <div className="p-8 md:p-16 max-w-4xl mx-auto">
      <Breadcrumbs />
      <BackButton />
      <div className="bg-white dark:bg-slate-900 p-10 md:p-20 rounded-[4rem] border-4 border-slate-100 dark:border-slate-800 shadow-2xl text-center space-y-10">
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center font-black mx-auto text-3xl shadow-xl">A12</div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-black dark:text-white uppercase tracking-tighter">Account Sync</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Restore your vault access & download archives using your registered email.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="ENTER YOUR REGISTERED EMAIL" className="w-full bg-slate-50 dark:bg-black border-4 border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] font-black text-center text-black dark:text-white transition-all focus:border-indigo-600 outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
            {loading ? 'SYNCING DATA...' : 'RESTORE MY ACCESS'}
          </button>
        </form>
      </div>
    </div>
  );
};

const VaultView = ({ purchased, userEmail }: { purchased: string[], userEmail?: string }) => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [questions, setQuestions] = useState<PremiumQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const checkAccess = () => {
    const localData = JSON.parse(localStorage.getItem(PURCHASE_KEY) || '[]');
    return purchased.includes(subjectId as string) || localData.includes(subjectId as string);
  };
  
  const isUnlocked = checkAccess();
  const subject = SUBJECTS.find(s => s.id === subjectId);

  useEffect(() => {
    if (!isUnlocked || !subjectId) { setLoading(false); return; }
    const fetchVault = async () => {
      setLoading(true);
      try { 
        const data = await generatePremiumQuestions(subjectId as SubjectId); 
        setQuestions(data || []); 
      } catch (err) { 
        console.error("Vault failed:", err);
      } finally { 
        setLoading(false); 
      }
    };
    fetchVault();
  }, [subjectId, isUnlocked]);

  if (!isUnlocked) {
    return (
      <div className="p-8 md:p-16 text-center space-y-8 animate-in fade-in">
        <Breadcrumbs />
        <BackButton />
        <div className="text-9xl">🔒</div>
        <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Vault Restricted</h2>
        <p className="text-slate-500 uppercase font-black text-xs max-w-lg mx-auto leading-relaxed">This vault contains 50+ high-yield predicted questions. Unlock to access and download PDF.</p>
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <Link to="/premium" className="bg-rose-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Unlock Vault ₹29</Link>
          <Link to="/login" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Already Purchased? Sync Now</Link>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center space-y-10 animate-pulse">
      <div className="text-9xl">💎</div>
      <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Generating PDF Archive...</h2>
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Assembling predicted questions for {subject?.name}</p>
    </div>
  );

  return (
    <div className="p-6 md:p-16 max-w-7xl mx-auto space-y-12">
      <div className="no-print flex flex-col gap-2">
        <Breadcrumbs />
        <div className="flex justify-between items-start">
          <BackButton />
          <button onClick={() => window.print()} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl">
            <span>⬇️</span> DOWNLOAD PDF
          </button>
        </div>
      </div>
      <header className="text-center space-y-6">
        <span className="bg-indigo-600 text-white px-6 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest">VAULT ACCESS: ACTIVE</span>
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter dark:text-white">{subject?.name} <span className="text-indigo-600">PREDICTIONS.</span></h2>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest max-w-xl mx-auto">Elite 50 most repeated Board Exam questions with AI-powered solutions.</p>
      </header>
      <div className="grid gap-12">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border-4 border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group section-card">
            <div className="absolute right-[-40px] top-[-40px] text-[12rem] opacity-[0.03] font-black italic select-none">#{idx+1}</div>
            <div className="flex flex-wrap gap-3 mb-8 relative z-10">
              <span className="bg-indigo-600 text-white text-[9px] font-black px-5 py-1.5 rounded-full uppercase tracking-widest">{q.type}</span>
              {q.repeatedYears.map(y => <span key={y} className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black px-3 py-1 rounded-full uppercase">{y}</span>)}
            </div>
            <h3 className="text-2xl md:text-3xl font-black mb-8 leading-tight tracking-tight dark:text-white relative z-10">{q.question}</h3>
            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-8 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900">
               <FormattedText text={q.solution} className="text-lg md:text-xl font-bold dark:text-white leading-relaxed" />
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
      try { 
        const data = await generateChapterNotes(subjectId as SubjectId, title!, parseInt(part!), parseInt(total!)); 
        setNote(data); 
      } catch (err) { 
        console.error("Notes failed:", err);
      } finally { 
        setLoading(false); 
      }
    };
    fetchNote();
  }, [subjectId, title, part, total]);
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center animate-pulse">
      <div className="text-8xl mb-8">📖</div>
      <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Assembling Master Files...</h2>
    </div>
  );
  return (
    <div className="p-4 md:p-10">
      <Breadcrumbs />
      <BackButton />
      {note ? <NoteRenderer note={note} /> : <div className="p-20 text-center font-black">Error loading notes.</div>}
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
    if (cart.length === 6) discount = 0.30; else if (cart.length >= 3) discount = 0.20;
    const amount = baseTotal * discount;
    return { subtotal: baseTotal, discountAmount: amount, total: baseTotal - amount, label: discount > 0 ? `${discount * 100}%` : null };
  };
  
  const { subtotal, discountAmount, total, label } = calculateTotal();

  const handleFinalUnlock = () => {
    if (!email.includes('@')) { alert('Please enter a valid email for account sync.'); return; }
    const cleanEmail = email.toLowerCase().trim();
    setIsProcessing(true);
    
    setTimeout(() => {
      const currentStored = JSON.parse(localStorage.getItem(PURCHASE_KEY) || '[]');
      const updated = Array.from(new Set([...currentStored, ...purchased, ...cart]));
      
      setPurchased(updated);
      localStorage.setItem(PURCHASE_KEY, JSON.stringify(updated));
      
      const cloudDb = JSON.parse(localStorage.getItem(CLOUD_MOCK_KEY) || '{}');
      const existing = cloudDb[cleanEmail] || [];
      const updatedHistory = Array.from(new Set([...existing, ...updated]));
      cloudDb[cleanEmail] = updatedHistory;
      localStorage.setItem(CLOUD_MOCK_KEY, JSON.stringify(cloudDb));

      setIsProcessing(false);
      setIsCheckoutOpen(false);
      setCart([]);
      alert(`SUCCESS! Vault content is now UNLOCKED for you. Go to subject page to View & Download.`);
      navigate('/');
    }, 1800);
  };

  return (
    <div className="p-6 md:p-16 max-w-7xl mx-auto space-y-16 relative pb-48">
      <Breadcrumbs />
      <BackButton />
      <header className="text-center space-y-12">
        <h2 className="text-5xl md:text-8xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">THE <span className="text-rose-600">VAULT.</span></h2>
        <p className="text-lg font-bold text-slate-500 uppercase tracking-widest max-w-2xl mx-auto">Get 50+ Most Repeated Board PYQs & High-Yield Predictions for 2026.</p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 p-8 rounded-[3rem] text-center">
            <span className="text-[10px] font-black text-indigo-600 uppercase mb-2 block tracking-widest">1 Subject</span>
            <div className="text-4xl font-black dark:text-white">₹29</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 p-8 rounded-[3rem] text-center relative">
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-full">20% OFF</div>
            <span className="text-[10px] font-black text-emerald-600 uppercase mb-2 block tracking-widest">3+ Subjects</span>
            <div className="text-4xl font-black dark:text-white">COMBO</div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-300 p-8 rounded-[3rem] text-center relative">
            <div className="absolute top-4 right-4 bg-rose-600 text-white text-[8px] font-black px-3 py-1 rounded-full">30% OFF</div>
            <span className="text-[10px] font-black text-rose-600 uppercase mb-2 block tracking-widest">All Subjects</span>
            <div className="text-4xl font-black dark:text-white">ELITE</div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {SUBJECTS.map(subject => {
          const isOwned = purchased.includes(subject.id);
          const inCart = cart.includes(subject.id);
          return (
            <div key={subject.id} className={`bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-4 ${inCart ? 'border-indigo-600 scale-105 shadow-2xl' : 'border-slate-100 dark:border-slate-800'} transition-all flex flex-col items-center text-center space-y-6 group`}>
              <div className="text-7xl group-hover:scale-110 transition-transform">{subject.icon}</div>
              <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{subject.name}</h3>
              <button disabled={isOwned} onClick={() => toggleCart(subject.id)} className={`w-full py-5 rounded-[1.5rem] font-black text-[9px] uppercase tracking-widest shadow-lg ${isOwned ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100' : inCart ? 'bg-rose-600 text-white' : 'bg-black text-white dark:bg-white dark:text-black'}`}>
                {isOwned ? '✓ UNLOCKED' : inCart ? 'REMOVE' : 'ADD TO VAULT'}
              </button>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-black/95 p-8 rounded-[2.5rem] shadow-2xl z-[250] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-10">
           <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center text-2xl text-white">🛒</div>
              <div>
                <div className="text-white font-black text-xl uppercase tracking-tighter">{cart.length} SUBJECTS SELECTED</div>
                {label && <div className="text-emerald-400 font-black text-[8px] uppercase tracking-widest animate-pulse">✨ {label} DISCOUNT APPLIED</div>}
              </div>
           </div>
           <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-white text-4xl font-black">₹{total.toFixed(0)}</div>
                <div className="text-slate-400 text-[9px] font-black uppercase line-through">₹{subtotal}</div>
              </div>
              <button onClick={() => setIsCheckoutOpen(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">CHECKOUT</button>
           </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xl p-10 rounded-[3.5rem] border-8 border-indigo-600 space-y-8 text-center overflow-hidden">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Instant Unlock</h2>
              <div className="space-y-4">
                <div className="flex justify-between font-black uppercase text-[10px] text-slate-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
                {discountAmount > 0 && <div className="flex justify-between font-black uppercase text-[10px] text-emerald-500 bg-emerald-50 p-3 rounded-xl border border-emerald-100"><span>Savings</span><span>-₹{discountAmount.toFixed(0)}</span></div>}
                <div className="flex justify-between items-center border-t-2 pt-6"><span className="text-xl font-black uppercase tracking-tighter">Total</span><span className="text-4xl font-black text-indigo-600">₹{total.toFixed(0)}</span></div>
              </div>
              <div className="space-y-2 bg-indigo-50 dark:bg-indigo-950/40 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Link to your Email Account</p>
                <input type="email" placeholder="YOUR EMAIL ADDRESS" className="w-full p-6 bg-white dark:bg-black border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-center text-black dark:text-white outline-none focus:border-indigo-600" value={email} onChange={e => setEmail(e.target.value)} />
                <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Immediate access to Vault PDF archives after payment.</p>
              </div>
              <button onClick={handleFinalUnlock} disabled={isProcessing} className="w-full bg-rose-600 text-white py-8 rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                {isProcessing ? 'INITIALIZING...' : `PAY ₹${total.toFixed(0)}`}
              </button>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">Cancel</button>
           </div>
        </div>
      )}
    </div>
  );
};

const SubjectPage = ({ purchased }: { purchased: string[] }) => {
  const { id } = useParams<{ id: string }>();
  const subject = SUBJECTS.find(s => s.id === id);
  const currentPurchased = [...purchased, ...JSON.parse(localStorage.getItem(PURCHASE_KEY) || '[]')];
  const isPurchased = currentPurchased.includes(id as string);
  
  if (!subject) return (
    <div className="p-20 text-center flex flex-col items-center">
      <h2 className="text-2xl font-black">Subject not found</h2>
      <Link to="/" className="text-indigo-600 underline mt-4">Go Home</Link>
    </div>
  );

  return (
    <div className="p-6 md:p-16 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
      <Breadcrumbs />
      <BackButton />
      <header className="flex flex-col lg:flex-row items-center gap-12 border-b-4 border-slate-100 dark:border-slate-900 pb-16">
        <div className="text-[8rem] md:text-[10rem] drop-shadow-2xl animate-in zoom-in duration-700">{subject.icon}</div>
        <div className="flex-1 text-center lg:text-left space-y-6">
          <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white tracking-tighter uppercase leading-none">{subject.name} MASTER FILES</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {isPurchased ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                 <Link to={`/vault/${id}`} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-105 transition-all">✓ OPEN PREMIUM VAULT</Link>
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">VAULT UNLOCKED</span>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Link to="/premium" className="bg-rose-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl animate-pulse">💎 UNLOCK VAULT ARCHIVE</Link>
                <Link to="/login" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600">Restore Past Purchase</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="grid gap-8">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4">Course Contents</div>
        {subject.chapters.map((chapter, idx) => (
          <div key={chapter.id} className="p-8 md:p-10 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 shadow-lg hover:border-indigo-600 transition-all group">
            <div className="flex-1 text-center md:text-left">
              <span className="text-indigo-600 font-black text-3xl italic opacity-20">CH {idx+1}</span>
              <h3 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter mt-2">{chapter.title}</h3>
              <p className="text-slate-500 mt-2 font-bold uppercase text-[9px] tracking-widest leading-relaxed max-w-xl">{chapter.description}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[...Array(chapter.totalParts)].map((_, i) => (
                <Link key={i} to={`/chapter/${id}/${chapter.title}/${i + 1}/${chapter.totalParts}`} className="bg-slate-50 dark:bg-slate-800 text-black dark:text-white px-6 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 border-transparent hover:border-indigo-600 transition-all active:scale-90">Part {i+1}</Link>
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
    <div className="animate-in fade-in duration-1000 pb-20">
      <header className="text-center space-y-10 max-w-6xl mx-auto pt-16 px-6">
        <div className="inline-block bg-indigo-600 text-white text-[12px] px-8 py-3 rounded-full font-black uppercase tracking-[0.4em] shadow-2xl">Board Prep Master 2026</div>
        <h1 className="text-6xl md:text-8xl font-black text-black dark:text-white tracking-tighter leading-[0.8] uppercase">Ace 12th <br/><span className="text-indigo-600">GRADE.</span></h1>
        <p className="text-xl md:text-2xl font-bold text-slate-500 max-w-4xl mx-auto leading-relaxed uppercase tracking-tight">AI Notes & High-Yield Predictions. View or Download as High-Quality PDF.</p>
        <div className="flex flex-col items-center gap-8 pt-8">
          <div className="flex flex-wrap justify-center gap-6">
            <button onClick={() => subjectsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="bg-black text-white dark:bg-white dark:text-black px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Free Notes</button>
            <Link to="/premium" className="bg-rose-600 text-white px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Unlock Vault</Link>
          </div>
          <Link to="/login" className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-3 transition-all bg-slate-100 px-6 py-3 rounded-full dark:bg-slate-900 border-2 border-slate-200"><span>🔄</span> Restore Purchased Access</Link>
        </div>
      </header>
      <div ref={subjectsRef} className="mt-40 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-4"><h2 className="text-4xl md:text-6xl font-black text-black dark:text-white uppercase tracking-tighter">Choose Subject</h2><div className="w-20 h-2 bg-indigo-600 mx-auto rounded-full"></div></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SUBJECTS.map(subject => (
            <Link key={subject.id} to={`/subject/${subject.id}`} className="group bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-4 border-slate-100 dark:border-slate-800 shadow-xl hover:border-indigo-600 hover:scale-[1.03] transition-all flex flex-col items-center text-center space-y-6">
              <div className="text-8xl group-hover:scale-110 transition-transform duration-500">{subject.icon}</div>
              <h3 className="text-3xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">{subject.name}</h3>
              <div className="w-full bg-slate-50 dark:bg-slate-800 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">Start Reading</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    localStorage.setItem(PURCHASE_KEY, JSON.stringify(merged));
    setPurchased(merged);
    setUser({ email: cleanEmail, purchasedSubjects: merged as SubjectId[], lastSync: Date.now() });
    if (cloudPurchases.length > 0) alert(`✅ SYNCED! Vault access restored for ${cleanEmail}.`);
    else alert(`Account linked. No previous purchases found for this email.`);
  };

  const handleLogout = () => { setUser(null); alert('Logged out.'); };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-500">
        <HashRouter>
          <MobileHeader user={user} />
          <Sidebar isDark={isDark} setIsDark={setIsDark} user={user} onLogout={handleLogout} />
          <main className="flex-1 h-[calc(100vh-4rem)] lg:h-screen overflow-y-auto no-scrollbar relative flex flex-col">
            <FomoToast />
            <div className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/subject/:id" element={<SubjectPage purchased={purchased} />} />
                <Route path="/chapter/:subjectId/:title/:part/:total" element={<ChapterView />} />
                <Route path="/vault/:subjectId" element={<VaultView purchased={purchased} userEmail={user?.email} />} />
                <Route path="/premium" element={<PremiumPortal settings={DEFAULT_SETTINGS} setPurchased={setPurchased} purchased={purchased} user={user} />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/disclaimer" element={<DisclaimerPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/blog" element={<BlogPlaceholder />} />
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
