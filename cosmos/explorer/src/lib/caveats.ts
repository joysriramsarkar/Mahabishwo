/**
 * Caveat system (masterplan s15.3). Five triggers:
 *  1. any distance displayed      -> H0 +-7% warning
 *  2. object toward Zone of Avoidance -> dust obscuration warning
 *  3. galaxy with z > 10           -> JWST 3-10x model-uncertainty warning
 *  4. Gpc-scale structure highlighted -> pattern-finding p-value warning
 *  5. distance compared between objects at different cosmic times
 *     -> "these two objects never coexisted at that distance" warning
 * Meaning is never carried by colour alone: each caveat has icon + text.
 */
import type { CosmicObject } from '@/types/cosmos';

export interface Caveat {
  id: string;
  icon: string;
  severity: 'info' | 'warn';
  text: string;
  objectId?: string;
}

/** Approximate Galactic latitude from equatorial RA/Dec (degrees). */
export function galacticLatitudeDeg(raDeg: number, decDeg: number): number {
  // North Galactic Pole: RA 192.8595, Dec +27.1284 (J2000)
  const ra = ((raDeg - 192.8595) * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const decN = (27.1284 * Math.PI) / 180;
  const sinB = Math.sin(dec) * Math.sin(decN)
    + Math.cos(dec) * Math.cos(decN) * Math.cos(ra);
  return (Math.asin(Math.max(-1, Math.min(1, sinB))) * 180) / Math.PI;
}

export function computeCaveats(args: {
  selected?: CosmicObject | null;
  pinned?: CosmicObject[];
  compared?: CosmicObject[];
}): Caveat[] {
  const out: Caveat[] = [];
  const sel = args.selected ?? null;
  const focus = sel ? [sel] : [];

  for (const o of focus) {
    if (o.distanceMpc) {
      out.push({
        id: 'h0-range', icon: '⚠', severity: 'warn', objectId: o.id,
        text: `দূরত্বে H₀-অনিশ্চয়তা: Planck18 বনাম SH0ES-এ এই দূরত্ব প্রায় ±৭% বদলায় (${o.distanceMpc.value.toFixed(1)} Mpc হলো Planck18-ভিত্তিক)।`,
      });
    }
    if (o.ra !== undefined && o.dec !== undefined) {
      const b = galacticLatitudeDeg(o.ra, o.dec);
      if (Math.abs(b) < 10) {
        out.push({
          id: 'zoa', icon: '◐', severity: 'warn', objectId: o.id,
          text: `Zone of Avoidance-এর দিকে (গ্যালাকটিক অক্ষাংশ b ≈ ${b.toFixed(1)}°): আকাশগঙ্গার ধূলি এই দিকের বস্তু আড়াল করে — ক্যাটালগ অসম্পূর্ণ হতে পারে।`,
        });
      }
    }
    if (o.type === 'galaxy' && (o.redshift?.value ?? 0) > 10) {
      out.push({
        id: 'jwst-z10', icon: '⚠', severity: 'warn', objectId: o.id,
        text: 'z > 10 গ্যালাক্সি: JWST পর্যবেক্ষণে মডেল-অনিশ্চয়তা ৩–১০ গুণ — ভর/আলোকমাত্রা আক্ষরিকভাবে নির্ভরযোগ্য নয় (U11)।',
      });
    }
    if ((o.radiusMpc ?? 0) > 300 || o.type === 'great-wall') {
      out.push({
        id: 'gpc-pattern', icon: '⚠', severity: 'warn', objectId: o.id,
        text: 'Gpc-স্কেল কাঠামো: pattern-finding bias সম্ভব — পরিসংখ্যানগত তাৎপর্য (p-value) ছাড়া "বৃহত্তম কাঠামো" দাবি গ্রহণযোগ্য নয়।',
      });
    }
    if (o.vLosKms === undefined) {
      out.push({
        id: 'unknown-rsd', icon: '≈', severity: 'info', objectId: o.id,
        text: 'Line-of-sight peculiar velocity অজানা / পরিমাপ নেই — এই বস্তুর observed/comoving RSD displacement হিসাব করা যায়নি।',
      });
    }
    if (o.boundaryKind === 'flow-defined') {
      out.push({
        id: 'flow-boundary', icon: '≈', severity: 'info', objectId: o.id,
        text: 'এই সীমানা প্রবাহ-সংজ্ঞায়িত (velocity watershed): এটি সম্ভাব্যতা-মানচিত্র, ভৌত পৃষ্ঠ নয়। মহাকর্ষীয়ভাবে বাঁধা কাঠামোও নয়।',
      });
    }
  }

  const pair = args.compared ?? args.pinned ?? [];
  const withDist = pair.filter((o) => o.distanceMpc);
  if (withDist.length >= 2) {
    const ds = withDist.map((o) => o.distanceMpc!.value);
    if (Math.max(...ds) - Math.min(...ds) > 100) {
      out.push({
        id: 'not-coeval', icon: '⚠', severity: 'warn',
        text: 'সতর্কতা: তুলনাকৃত বস্তুগুলো ভিন্ন মহাজাগতিক সময়ের — এই দুটি বস্তু কখনোই এই দূরত্বে একই সময়ে বিদ্যমান ছিল না।',
      });
    }
  }
  return out;
}

/** "Why is this here?" - plain-language provenance explanation (s15.3). */
export function whyIsThisHere(o: CosmicObject): string[] {
  const ev: Record<CosmicObject['evidence'], string> = {
    observed: 'এটি সরাসরি পর্যবেক্ষিত বস্তু (OBS): টেলিস্কোপ-ক্যাটালগে এর পরিমাপ আছে।',
    reconstructed: 'এটি পুনর্গঠিত বস্তু (REC): পর্যবেক্ষিত বেগ/ঘনত্ব-ক্ষেত্র থেকে Wiener/BORG-ধরনের পুনর্গঠনে এর অবস্থান অনুমান করা।',
    simulated: 'এটি সিমুলেটেড বস্তু (SIM): ডেমো/সিমুলেশন রান থেকে তৈরি — বাস্তব আকাশে এই নির্দিষ্ট বস্তুটি নেই।',
    mock: 'এটি মক পর্যবেক্ষণ (MOCK): সিমুলেশনের ওপর যন্ত্রের ফরওয়ার্ড-মডেল চালানো।',
    unknown: 'এর উৎস অনিশ্চিত (UNC): নির্ভরযোগ্যতা কম, সতর্কতার সঙ্গে ব্যবহার করুন।',
  };
  const lines = [ev[o.evidence]];
  if (o.boundaryKind === 'flow-defined') lines.push('সীমানা: প্রবাহ-সংজ্ঞায়িত (watershed সম্ভাব্যতা-মানচিত্র)।');
  else if (o.boundaryKind === 'model-dependent') lines.push('সীমানা: মডেল-নির্ভর — সংজ্ঞা বদলালে সীমানা বদলায়।');
  else lines.push('সীমানা: ভৌত সংজ্ঞাভিত্তিক।');
  if (o.sources.length) {
    lines.push(`সূত্র: ${o.sources.map((s) => `${s.dataset} (${s.release})`).join('; ')}`);
  } else {
    lines.push('সূত্র: অজানা / পরিমাপ নেই — এই বস্তুর উৎস নথিভুক্ত নয়।');
  }
  if (!o.distanceMpc && !o.redshift) lines.push('দূরত্ব/redshift: অজানা / পরিমাপ নেই।');
  return lines;
}
