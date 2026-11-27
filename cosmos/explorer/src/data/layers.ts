import type { LayerDef, LayerId } from '@/types/cosmos';

export const LAYERS: LayerDef[] = [
  { id: 'observable-boundary', label: 'পর্যবেক্ষণযোগ্য সীমা', description: 'light-travel সীমা, বস্তুর অবস্থান নয়', evidence: ['observed'], defaultVisible: true, defaultOpacity: 0.15 },
  { id: 'cmb', label: 'CMB', description: 'শেষ বিক্ষেপণ পৃষ্ঠ, z≈1100', evidence: ['observed'], defaultVisible: true, defaultOpacity: 0.9 },
  { id: 'cosmic-web', label: 'কসমিক ওয়েব', description: 'ফিলামেন্ট, নড, ভoid-এর সমন্বিত বিন্যাস', evidence: ['reconstructed', 'simulated'], defaultVisible: true, defaultOpacity: 0.6 },
  { id: 'superclusters', label: 'সুপারক্লাস্টার', description: 'প্রবাহ-সংজ্ঞায়িত অঞ্চল', evidence: ['reconstructed'], defaultVisible: true, defaultOpacity: 0.8 },
  { id: 'clusters-groups', label: 'গুচ্ছ ও গোষ্ঠী', description: 'X-ray, SZ, অপটিক্যাল নিশ্চিত', evidence: ['observed'], defaultVisible: true, defaultOpacity: 0.9 },
  { id: 'galaxies', label: 'গ্যালাক্সি', description: 'স্পেক্ট্রোস্কোপিক ও ফোটোমেট্রিক নমুনা', evidence: ['observed'], defaultVisible: true, defaultOpacity: 1 },
  { id: 'filaments', label: 'ফিলামেন্ট', description: 'গ্যালাক্সির তারের মতো বিন্যাস', evidence: ['reconstructed'], defaultVisible: true, defaultOpacity: 0.45 },
  { id: 'voids', label: 'ভoid', description: 'নিম্ন-ঘনত্ব অঞ্চল', evidence: ['reconstructed'], defaultVisible: false, defaultOpacity: 0.3 },
  { id: 'velocity-field', label: 'বেগ-ক্ষেত্র', description: 'peculiar velocity', evidence: ['reconstructed'], defaultVisible: false, defaultOpacity: 0.35 },
  { id: 'survey-footprint', label: 'জরিপ কভারেজ', description: 'কোন অঞ্চলে ডেটা আছে', evidence: ['observed'], defaultVisible: false, defaultOpacity: 0.2 },
  { id: 'uncertainty', label: 'অনিশ্চয়তা', description: 'মডেল-নির্ভর অঞ্চল', evidence: ['unknown'], defaultVisible: false, defaultOpacity: 0.25 },
];

export const DEFAULT_LAYERS = Object.fromEntries(
  LAYERS.map((l) => [l.id, { visible: l.defaultVisible, opacity: l.defaultOpacity }])
) as Record<LayerId, { visible: boolean; opacity: number }>;
