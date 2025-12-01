import { Secret } from "../types";

// In a real implementation, these would be Firestore calls.
// const db = getFirestore(app);
// const secretsCollection = collection(db, 'secrets');

const STORAGE_KEY = 'whispervault_secrets';

export const getSecrets = (): Secret[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSecret = (secret: Secret): void => {
  const current = getSecrets();
  const updated = [secret, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteSecret = (id: string): void => {
  const current = getSecrets();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const parseImportCSV = (csvContent: string): Secret[] => {
  const lines = csvContent.split('\n');
  const secrets: Secret[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 2) {
      secrets.push({
        id: crypto.randomUUID(),
        label: parts[0] || 'Imported Secret',
        username: parts[1] || '',
        value: parts[2] || 'unknown',
        category: 'login',
        createdAt: Date.now()
      });
    }
  }
  return secrets;
};

export const batchSaveSecrets = (secrets: Secret[]) => {
  const current = getSecrets();
  const updated = [...secrets, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// --- SHARE LOGIC ---

/**
 * Encodes secret data into a URL hash for serverless sharing.
 */
export const generateShareUrl = (secret: Secret): string => {
  // Minimize payload size by picking only necessary fields
  const payload = {
    l: secret.label,
    u: secret.username,
    v: secret.value,
    c: secret.category
  };
  
  const jsonStr = JSON.stringify(payload);
  const base64Str = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  
  const origin = window.location.origin + window.location.pathname;
  return `${origin}#share?data=${base64Str}`;
};

/**
 * Decodes secret data from URL hash.
 */
export const parseShareData = (encodedData: string): Secret | null => {
  try {
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(encodedData), (c: string) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonStr);
    
    return {
      id: 'shared-' + Date.now(),
      label: payload.l,
      username: payload.u,
      value: payload.v,
      category: payload.c,
      createdAt: Date.now()
    };
  } catch (e) {
    console.error("Failed to parse share data", e);
    return null;
  }
};

/**
 * Generates a VCF 3.0 string for contact sharing.
 */
export const generateVCard = (secret: Secret): string => {
  const nameParts = secret.label.split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');

  const isEmail = secret.username?.includes('@');
  
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${secret.label}`,
    isEmail ? `EMAIL;TYPE=INTERNET:${secret.username}` : `TEL;TYPE=CELL:${secret.username}`,
    `ADR;TYPE=HOME:;;${secret.value.replace(/\n/g, ';')};;;;`,
    `NOTE:Shared via WhisperVault`,
    'END:VCARD'
  ].join('\n');
};