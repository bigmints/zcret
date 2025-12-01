export interface Secret {
  id: string;
  label: string;
  value: string; // The password, secret, or note content
  username?: string;
  category: 'login' | 'wifi' | 'note' | 'card' | 'contact';
  createdAt: number;
  strengthScore?: number; // 0-100
}

export interface ShareSession {
  secretId: string;
  expiresAt: number; // Timestamp
  token: string;
}

export interface PasswordAnalysis {
  score: number;
  feedback: string[];
  crackTimeEstimate: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  IMPORT = 'IMPORT',
  CREATE = 'CREATE',
  SHARED_LINK = 'SHARED_LINK' // View for someone opening a link
}