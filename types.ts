
export type SubjectId = 
  | 'physics' | 'chemistry' | 'maths' | 'english' | 'computer_science' | 'physical_education';

export interface Chapter {
  id: string;
  title: string;
  description: string;
  isImportant?: boolean;
  totalParts: number;
}

export interface Subject {
  id: SubjectId;
  name: string;
  icon: string;
  color: string;
  chapters: Chapter[];
}

export interface NoteSection {
  title: string;
  content: string;
  type: 'theory' | 'formula' | 'trick' | 'reaction' | 'code' | 'summary' | 'application' | 'derivation' | 'character_sketch' | 'stanza_analysis';
  visualPrompt?: string;
}

export interface ImportantQuestion {
  question: string;
  solution: string;
  yearAnalysis: string;
}

export interface ChapterNote {
  chapterTitle: string;
  subject: SubjectId;
  sections: NoteSection[];
  importantQuestions: ImportantQuestion[];
  part?: number;
}

export interface QuickRevision {
  summary: string;
  formulas: string[];
  keyPoints: string[];
}

export interface PremiumQuestion {
  type?: string; 
  question: string;
  solution: string;
  freqencyScore: number;
  repeatedYears: string[];
}

export interface VaultData {
  revision: QuickRevision;
  questions: PremiumQuestion[];
}

export interface Transaction {
  id: string;
  subjectId: SubjectId;
  amount: number;
  timestamp: number;
  userName: string;
  email?: string;
}

export interface UserProfile {
  email: string;
  purchasedSubjects: SubjectId[];
  lastSync: number;
}

export interface AppSettings {
  premiumPrice: number;
  isVaultOpen: boolean;
}
