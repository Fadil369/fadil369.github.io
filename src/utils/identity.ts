// Small, dependency-free helpers shared by the profile, card and BPR pages.

const SPID_IN_TEXT = /\b(SA-[A-Z]{2,4}-\d{6})\b/i;

/** Finds a BPR SPID in whatever a QR code or a pasted link contains:
 *  a bare SPID, ?spid=…, /p/{SPID}, /verify/{SPID}, verify.brainsait.de/{SPID}. */
export function extractSpid(text: string | null | undefined): string | null {
  if (!text) return null;
  const s = String(text).trim();
  try {
    const u = new URL(s);
    const q = u.searchParams.get('spid');
    if (q && SPID_IN_TEXT.test(q)) return q.match(SPID_IN_TEXT)![1].toUpperCase();
    const m = decodeURIComponent(u.pathname).match(SPID_IN_TEXT);
    if (m) return m[1].toUpperCase();
  } catch { /* not a URL */ }
  const m = s.match(SPID_IN_TEXT);
  return m ? m[1].toUpperCase() : null;
}

export interface Contact {
  given: string; family: string; prefix?: string;
  fullName: string; org?: string; title?: string;
  email?: string; phone?: string; url?: string; note?: string;
  city?: string; country?: string;
}

// RFC 6350 text escaping, then 75-octet line folding (continuation lines start with one space).
const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/** vCard 4.0 for "Save contact". Only fields the person already publishes. */
export function buildVCard(c: Contact): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    `N:${esc(c.family)};${esc(c.given)};;${esc(c.prefix || '')};`,
    `FN:${esc(c.fullName)}`,
    c.org && `ORG:${esc(c.org)}`,
    c.title && `TITLE:${esc(c.title)}`,
    c.email && `EMAIL;TYPE=work:${c.email}`,
    c.phone && `TEL;TYPE=cell;VALUE=uri:tel:${c.phone.replace(/[^\d+]/g, '')}`,
    c.url && `URL:${c.url}`,
    (c.city || c.country) && `ADR;TYPE=work:;;;${esc(c.city || '')};;;${esc(c.country || '')}`,
    c.note && `NOTE:${esc(c.note)}`,
    'END:VCARD',
  ].filter(Boolean) as string[];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const OWNER: Contact = {
  given: 'Mohamed', family: 'El Fadil', prefix: 'Dr.', fullName: 'Dr. Mohamed El Fadil',
  org: 'BrainSAIT', title: 'RCM, Healthcare Intelligent Improvement Advisor',
  email: 'elfadil369@icloud.com', phone: '+966 543 560 672', url: 'https://fadil369.github.io/',
  city: 'Riyadh', country: 'Saudi Arabia',
  note: 'BPR provider ID SA-PHY-000003 — verify at https://fadil369.github.io/bpr/verify?spid=SA-PHY-000003',
};
