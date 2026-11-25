/**
 * Comprehensive Astronomical Datasets
 * Sourced from NASA, ESA, Planck Mission, SDSS & Cosmicflows-3.
 * Bilingual labels (Bengali & English), realistic coordinates and physical stats.
 */
import {
  SuperclusterData,
  GalaxyClusterData,
  GalaxyData,
  StarSystemData,
  CosmicEra,
} from '../core/types';

/**
 * Real orbital periods in Earth days (NASA / exoplanet catalogues).
 * Used to derive physically-correct *relative* orbital speeds for every system.
 */
export const ORBIT_PERIOD_DAYS: Record<string, number> = {
  mercury: 87.97,
  venus: 224.7,
  earth: 365.25,
  mars: 686.98,
  jupiter: 4332.6,
  saturn: 10759,
  uranus: 30687,
  neptune: 60190,
  proxima_d: 5.1,
  proxima_b: 11.2,
  t1_b: 1.51,
  t1_e: 6.1,
  t1_f: 9.2,
  k_f: 129.9,
};

/** Real orbital eccentricities (NASA / JPL). Zero for poorly-constrained exoplanets. */
export const ORBIT_ECCENTRICITY: Record<string, number> = {
  mercury: 0.2056,
  venus: 0.0068,
  earth: 0.0167,
  mars: 0.0934,
  jupiter: 0.0489,
  saturn: 0.0565,
  uranus: 0.0457,
  neptune: 0.0113,
  proxima_d: 0.0,
  proxima_b: 0.11,
  t1_b: 0.0,
  t1_e: 0.0,
  t1_f: 0.0,
  k_f: 0.0,
};

/**
 * Real sidereal rotation periods in Earth days (NASA / IAU).
 * Retrograde worlds keep their retrograde nature in the axial tilt
 * (Venus 177.4°, Uranus 97.8°), so all periods here are positive.
 * Mercury's 58.65 d vs its 88 d year naturally produces the 3:2
 * spin-orbit resonance. Close-in exoplanets are tidally locked,
 * so their rotation period equals their orbital period (1:1).
 */
export const ROTATION_PERIOD_DAYS: Record<string, number> = {
  mercury: 58.646,
  venus: 243.018,
  earth: 0.99726968,
  mars: 1.02595676,
  jupiter: 0.41354,
  saturn: 0.44401,
  uranus: 0.71833,
  neptune: 0.67125,
  // Tidally locked exoplanets — day length equals year length
  proxima_d: 5.1,
  proxima_b: 11.2,
  t1_b: 1.51,
  t1_e: 6.1,
  t1_f: 9.2,
  k_f: 129.9,
};

/** Sun's equatorial (Carrington) rotation period in days. */
export const SUN_ROTATION_DAYS = 25.38;

/** The Moon: sidereal orbital period and inclination to the ecliptic. */
export const MOON_SIDEREAL_DAYS = 27.321661;
export const MOON_INCLINATION = (5.145 * Math.PI) / 180;

/**
 * Moon catalog for every planet with known major satellites (NASA / JPL).
 *
 * Physical truth preserved:
 *  - `periodDays` is the real sidereal orbital period (drives the motion
 *    from the unified clock — Phobos's 7.6-hour orbit, faster than Mars's
 *    own rotation, actually works here).
 *  - Regular satellites (`equatorial: true`) orbit in the planet's
 *    equatorial plane — Uranus's moons therefore swing perpendicular to
 *    the ecliptic, exactly as in reality. Earth's Moon and the captured
 *    retrograde Triton orbit nearer the ecliptic / an inclined plane.
 *  - `retrograde: true` makes the orbit run backward (Triton).
 *  - Tidal locking is inherent to the pivot construction: every moon keeps
 *    the same face toward its planet.
 *
 * Visual compromises (documented, as everywhere in the app): sizes and
 * distances are compressed so each satellite stays visible and inside its
 * planet's local neighbourhood; real systems span 60–260 planet radii.
 */
export interface MoonData {
  id: string;
  name: string;
  nameBn: string;
  /** Visual radius as a fraction of the host planet's radius. */
  radiusRatio: number;
  /** Visual orbital distance in host-planet radii (compressed from real). */
  distanceVR: number;
  /** Real sidereal orbital period in Earth days. */
  periodDays: number;
  /** Retrograde orbit (e.g. Triton). */
  retrograde?: boolean;
  /** Orbit in the planet's equatorial plane (regular satellites). */
  equatorial?: boolean;
  /** Orbital inclination to the reference plane, radians. */
  inclination?: number;
  /** Surface tint. */
  color?: string;
}

export const PLANET_MOONS: Record<string, MoonData[]> = {
  earth: [
    {
      id: 'moon', name: 'Moon', nameBn: 'চাঁদ',
      radiusRatio: 0.27, distanceVR: 2.6,
      periodDays: 27.321661, inclination: MOON_INCLINATION,
      color: '#c8c4bc',
    },
  ],
  mars: [
    {
      id: 'phobos', name: 'Phobos', nameBn: 'ফোবোস',
      radiusRatio: 0.055, distanceVR: 2.3,
      periodDays: 0.3189, equatorial: true,
      color: '#8f857a',
    },
    {
      id: 'deimos', name: 'Deimos', nameBn: 'ডিমোস',
      radiusRatio: 0.04, distanceVR: 3.4,
      periodDays: 1.26244, equatorial: true,
      color: '#a3988a',
    },
  ],
  jupiter: [
    {
      id: 'io', name: 'Io', nameBn: 'আইও',
      radiusRatio: 0.09, distanceVR: 2.6,
      periodDays: 1.769138, equatorial: true,
      color: '#e0be6a',
    },
    {
      id: 'europa', name: 'Europa', nameBn: 'ইউরোপা',
      radiusRatio: 0.08, distanceVR: 3.3,
      periodDays: 3.551181, equatorial: true,
      color: '#cfc9bd',
    },
    {
      id: 'ganymede', name: 'Ganymede', nameBn: 'গ্যানিমিড',
      radiusRatio: 0.125, distanceVR: 4.3,
      periodDays: 7.15455, equatorial: true,
      color: '#9b9284',
    },
    {
      id: 'callisto', name: 'Callisto', nameBn: 'ক্যালিস্টো',
      radiusRatio: 0.11, distanceVR: 5.6,
      periodDays: 16.6890174, equatorial: true,
      color: '#6f675c',
    },
  ],
  saturn: [
    {
      id: 'enceladus', name: 'Enceladus', nameBn: 'এনসেলাডাস',
      radiusRatio: 0.05, distanceVR: 3.0,
      periodDays: 1.370218, equatorial: true,
      color: '#e6eef2',
    },
    {
      id: 'rhea', name: 'Rhea', nameBn: 'রিয়া',
      radiusRatio: 0.07, distanceVR: 3.7,
      periodDays: 4.518212, equatorial: true,
      color: '#b5aea2',
    },
    {
      id: 'titan', name: 'Titan', nameBn: 'টাইটান',
      radiusRatio: 0.105, distanceVR: 4.9,
      periodDays: 15.945421, equatorial: true,
      color: '#d9a441',
    },
    {
      id: 'iapetus', name: 'Iapetus', nameBn: 'ইয়াপেটাস',
      radiusRatio: 0.06, distanceVR: 6.1,
      periodDays: 79.3215, equatorial: true,
      color: '#8a7f6d',
    },
  ],
  uranus: [
    {
      id: 'miranda', name: 'Miranda', nameBn: 'মিরান্ডা',
      radiusRatio: 0.05, distanceVR: 2.4,
      periodDays: 1.413479, equatorial: true,
      color: '#9aa4a4',
    },
    {
      id: 'titania', name: 'Titania', nameBn: 'টাইটানিয়া',
      radiusRatio: 0.085, distanceVR: 3.4,
      periodDays: 8.705872, equatorial: true,
      color: '#8f8a80',
    },
    {
      id: 'oberon', name: 'Oberon', nameBn: 'ওবেরন',
      radiusRatio: 0.08, distanceVR: 4.4,
      periodDays: 13.463239, equatorial: true,
      color: '#7d786e',
    },
  ],
  neptune: [
    {
      id: 'triton', name: 'Triton', nameBn: 'ট্রাইটন (পশ্চাৎগামী)',
      radiusRatio: 0.095, distanceVR: 3.2,
      periodDays: 5.876854, retrograde: true, inclination: 0.4,
      color: '#c9bdb0',
    },
  ],
};

/**
 * Simulation clock: at time-scale 1×, one real second equals one Earth day.
 * Every motion in the star-system layers (orbits, spins, moons, sun,
 * asteroid belt) is driven from this one clock using real periods, so
 * all physical ratios are preserved exactly.
 */
export const SIM_DAYS_PER_SECOND = 1;

/** One astronomical unit in kilometres. */
export const AU_KM = 149_597_870.7;

/** Earth's mean orbital speed at 1 AU around a 1-M☉ star (km/s). */
export const EARTH_MEAN_SPEED_KMS = 29.7847;

/** Real semi-major axes in AU (NASA / JPL) — used for live orbital telemetry. */
export const SEMI_MAJOR_AU: Record<string, number> = {
  mercury: 0.3871,
  venus: 0.7233,
  earth: 1.0,
  mars: 1.5237,
  jupiter: 5.2029,
  saturn: 9.5367,
  uranus: 19.1892,
  neptune: 30.0699,
  proxima_d: 0.029,
  proxima_b: 0.0485,
  t1_b: 0.01154,
  t1_e: 0.02925,
  t1_f: 0.03849,
  k_f: 0.432,
};

/** Host-star masses in solar masses — used for vis-viva orbital speeds. */
export const STAR_MASS_SOLAR: Record<string, number> = {
  solar: 1.0,
  proxima: 0.1221,
  trappist: 0.0898,
  kepler186: 0.544,
};

export const SUPERCLUSTERS: SuperclusterData[] = [
  {
    id: 'laniakea',
    name: 'Laniakea Supercluster',
    nameBn: 'ল্যানিয়াকিয়া সুপারক্লাস্টার',
    description:
      'Our home supercluster, spanning ~520 million light-years and containing ~100,000 galaxies flowing toward the Great Attractor.',
    descriptionBn:
      'আমাদের মহাজাগতিক ঠিকানা—প্রায় ৫২ কোটি আলোকবর্ষব্যাপী বিস্তৃত এবং প্রায় ১ লক্ষ ছায়াপথ ধারণকারী মহাকায় সুপারক্লাস্টার, যা গ্রেট অ্যাট্রাক্টরের দিকে ধাবিত হচ্ছে।',
    color: '#38bdf8',
    position: [0, 0, 0],
    radiusMly: 260,
    galaxyCount: 100000,
    massSOL: '1 × 10¹⁷',
    members: [
      {
        id: 'virgo',
        name: 'Virgo Cluster',
        nameBn: 'ভার্গো ক্লাস্টার',
        offset: [0, 0, 0],
        distanceMly: 54,
        galaxyCount: 1300,
        massSOL: '1.2 × 10¹⁵',
        descriptionBn:
          'লোকাল সুপারক্লাস্টারের হৃদয়—১,৩০০–২,০০০ ছায়াপথের ঘন সমাবেশ, যার কেন্দ্রে বিশাল উপবৃত্তাকার M87 ও তার সুপারম্যাসিভ ব্ল্যাক হোল।',
      },
      {
        id: 'hydra_centaurus',
        name: 'Hydra-Centaurus Cluster',
        nameBn: 'হাইড্রা-সেন্টরাস ক্লাস্টার',
        offset: [-0.55, -0.08, 0.35],
        distanceMly: 150,
        galaxyCount: 1000,
        massSOL: '1 × 10¹⁶',
        descriptionBn:
          'গ্রেট অ্যাট্রাক্টর অঞ্চলের প্রধান ক্লাস্টার—ল্যানিয়াকিয়ার সমস্ত ছায়াপথ এই মহাকর্ষীয় কেন্দ্রের দিকে প্রবাহিত হচ্ছে।',
      },
      {
        id: 'norma',
        name: 'Norma Cluster (Abell 3627)',
        nameBn: 'নর্মা ক্লাস্টার (Abell 3627)',
        offset: [0.42, -0.24, -0.48],
        distanceMly: 220,
        galaxyCount: 800,
        massSOL: '1 × 10¹⁶',
        descriptionBn:
          'আকাশগঙ্গার সমতল দ্বারা আংশিকভাবে লুকানো বিশাল ক্লাস্টার, গ্রেট অ্যাট্রাক্টরের কেন্দ্রের কাছাকাছি অবস্থিত।',
      },
      {
        id: 'pavo_indus',
        name: 'Pavo-Indus Cluster',
        nameBn: 'পাভো-ইন্ডাস ক্লাস্টার',
        offset: [0.2, 0.32, 0.55],
        distanceMly: 230,
        galaxyCount: 600,
        massSOL: '5 × 10¹⁵',
        descriptionBn:
          'দক্ষিণ আকাশের লম্বা ছায়াপথ-শৃঙ্খল, যা পাভো ও ইন্ডাস তারামণ্ডল জুড়ে ল্যানিয়াকিয়ার এক প্রান্ত গঠন করেছে।',
      },
      {
        id: 'fornax',
        name: 'Fornax Cluster',
        nameBn: 'ফরন্যাক্স ক্লাস্টার',
        offset: [0.16, -0.34, 0.2],
        distanceMly: 62,
        galaxyCount: 340,
        massSOL: '7 × 10¹³',
        descriptionBn:
          'নিকটবর্তী ছোট কিন্তু ঘন ক্লাস্টার, যেখানে NGC 1365-এর মতো বিখ্যাত বার-স্পাইরাল ছায়াপথ ও প্রচুর আন্তঃক্লাস্টার গরম গ্যাস রয়েছে।',
      },
    ],
    sourceUrl: 'https://www.nature.com/articles/nature13674',
    sourceName: 'Nature — Tully et al. (2014)',
  },
  {
    id: 'shapley',
    name: 'Shapley Supercluster',
    nameBn: 'শ্যাপলি সুপারক্লাস্টার',
    description:
      'The largest known concentration of gravitationally interacting galaxies in our local universe (~650 million ly away).',
    descriptionBn:
      'আমাদের নিকটবর্তী মহাবিশ্বের বৃহত্তম মহাকর্ষীয় ছায়াপথ সমাবেশ (প্রায় ৬৫ কোটি আলোকবর্ষ দূরে অবস্থিত)।',
    color: '#f59e0b',
    position: [180, 45, -90],
    radiusMly: 200,
    galaxyCount: 80000,
    massSOL: '5 × 10¹⁷',
    members: [
      {
        id: 'abell_3558',
        name: 'Abell 3558',
        nameBn: 'Abell 3558 (শ্যাপলি কোর)',
        offset: [0, 0, 0],
        distanceMly: 650,
        galaxyCount: 800,
        massSOL: '1 × 10¹⁶',
        descriptionBn:
          'শ্যাপলি সুপারক্লাস্টারের সর্বাধিক ঘন কেন্দ্র, যেখানে অসংখ্য উপবৃত্তাকার ছায়াপথ ও প্রচণ্ড গরম X-ray গ্যাস রয়েছে।',
      },
      {
        id: 'abell_3560',
        name: 'Abell 3560',
        nameBn: 'Abell 3560',
        offset: [-0.42, 0.2, 0.3],
        distanceMly: 640,
        galaxyCount: 400,
        massSOL: '4 × 10¹⁵',
        descriptionBn:
          'শ্যাপলি কোরের পশ্চিম দিকের সমৃদ্ধ ক্লাস্টার, যা প্রধান কেন্দ্রের সঙ্গে মহাকর্ষীয়ভাবে যুক্ত।',
      },
      {
        id: 'abell_3562',
        name: 'Abell 3562',
        nameBn: 'Abell 3562',
        offset: [0.36, -0.16, -0.34],
        distanceMly: 660,
        galaxyCount: 450,
        massSOL: '5 × 10¹⁵',
        descriptionBn:
          'শ্যাপলির পূর্ব-দক্ষিণ প্রান্তের ক্লাস্টার; এর কেন্দ্রে একটি শক্তিশালী রেডিও গ্যালাক্সি ও ঘন গরম গ্যাস আছে।',
      },
      {
        id: 'abell_3556',
        name: 'Abell 3556',
        nameBn: 'Abell 3556',
        offset: [0.14, 0.36, 0.18],
        distanceMly: 630,
        galaxyCount: 300,
        massSOL: '3 × 10¹⁵',
        descriptionBn:
          'শ্যাপলি চেইনের উত্তর দিকের সদস্য, যা সুপারক্লাস্টারের দীর্ঘ ফিলামেন্টকে আরও বিস্তৃত করে।',
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Shapley_Supercluster',
    sourceName: 'Wikipedia — Shapley Supercluster',
  },
  {
    id: 'perseus_pisces',
    name: 'Perseus-Pisces Supercluster',
    nameBn: 'পার্সিয়াস-পাইসিস সুপারক্লাস্টার',
    description:
      'One of the largest known structures in the universe, forming a brilliant filament bounding the Taurus Void.',
    descriptionBn:
      'মহাবিশ্বের বৃহত্তম কাঠামো সমূহের একটি, যা একটি উজ্জ্বল ফিলামেন্ট তৈরি করে তোরো ভয়েডকে ঘিরে রেখেছে।',
    color: '#ec4899',
    position: [-140, 60, 110],
    radiusMly: 150,
    galaxyCount: 45000,
    massSOL: '2 × 10¹⁷',
    members: [
      {
        id: 'perseus',
        name: 'Perseus Cluster (Abell 426)',
        nameBn: 'পার্সিয়াস ক্লাস্টার (Abell 426)',
        offset: [0, 0, 0],
        distanceMly: 240,
        galaxyCount: 1000,
        massSOL: '1 × 10¹⁶',
        descriptionBn:
          'মহাবিশ্বের সবচেয়ে শক্তিশালী X-ray উৎসগুলোর একটি—এর কেন্দ্রীয় গ্যালাক্সি NGC 1275 থেকে প্রচণ্ড জেট নির্গত হয়।',
      },
      {
        id: 'pisces',
        name: 'Pisces Cluster',
        nameBn: 'পাইসিস ক্লাস্টার',
        offset: [-0.45, 0.16, 0.28],
        distanceMly: 220,
        galaxyCount: 500,
        massSOL: '5 × 10¹⁵',
        descriptionBn:
          'পার্সিয়াস-পাইসিস শৃঙ্খলের দক্ষিণ প্রান্ত, যা মীন তারামণ্ডলে একটি দীর্ঘ ছায়াপথ-ফিলামেন্ট গঠন করে।',
      },
      {
        id: 'abell_262',
        name: 'Abell 262',
        nameBn: 'Abell 262',
        offset: [0.4, -0.2, -0.22],
        distanceMly: 210,
        galaxyCount: 300,
        massSOL: '3 × 10¹⁵',
        descriptionBn:
          'পার্সিয়াস-পাইসিস সুপারক্লাস্টারের আরেকটি প্রধান নোড, যেখানে অনেক ছোট উপবৃত্তাকার ও লেন্টিকুলার ছায়াপথ রয়েছে।',
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Perseus-Pisces_Supercluster',
    sourceName: 'Wikipedia — Perseus–Pisces Supercluster',
  },
  {
    id: 'coma',
    name: 'Coma Supercluster',
    nameBn: 'কোমা সুপারক্লাস্টার',
    description:
      'Contains the famous Coma and Leo clusters, forming the CfA2 Great Wall filament of galaxies.',
    descriptionBn:
      'বিখ্যাত কোমা ও লিও ক্লাস্টার সম্বলিত মহাজাগতিক অঞ্চল, যা সিএফএ২ গ্রেট ওয়াল ফিলামেন্ট গঠন করেছে।',
    color: '#a855f7',
    position: [0, 160, 40],
    radiusMly: 100,
    galaxyCount: 30000,
    massSOL: '1.5 × 10¹⁷',
    members: [
      {
        id: 'coma_cluster',
        name: 'Coma Cluster (Abell 1656)',
        nameBn: 'কোমা ক্লাস্টার (Abell 1656)',
        offset: [0, 0, 0],
        distanceMly: 321,
        galaxyCount: 1000,
        massSOL: '1 × 10¹⁶',
        descriptionBn:
          'কোমা সুপারক্লাস্টারের কেন্দ্র—১,০০০-এর বেশি ছায়াপথের সমাবেশ, যেখানে প্রথম ডার্ক ম্যাটারের প্রমাণ পাওয়া যায় (Zwicky, ১৯৩৩)।',
      },
      {
        id: 'leo_cluster',
        name: 'Leo Cluster (Abell 1367)',
        nameBn: 'লিও ক্লাস্টার (Abell 1367)',
        offset: [0.45, 0.2, -0.24],
        distanceMly: 330,
        galaxyCount: 500,
        massSOL: '3 × 10¹⁵',
        descriptionBn:
          'সিংহ তারামণ্ডলের সমৃদ্ধ ক্লাস্টার, যা কোমা ক্লাস্টারের সঙ্গে মিলে সিএফএ২ গ্রেট ওয়ালের একটি প্রধান অংশ গঠন করে।',
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Coma_Supercluster',
    sourceName: 'Wikipedia — Coma Supercluster',
  },
  {
    id: 'bootes_void',
    name: 'Boötes Void (The Great Void)',
    nameBn: 'বুটিস ভয়েড (মহাশূন্যতা)',
    description:
      'A colossal spherical region of almost empty space ~330 million light-years in diameter with extraordinarily few galaxies.',
    descriptionBn:
      'প্রায় ৩৩ কোটি আলোকবর্ষ ব্যাসবিশিষ্ট প্রায় ফাঁকা মহাজাগতিক অঞ্চল, যেখানে অস্বাভাবিকভাবে খুব কম ছায়াপথ রয়েছে।',
    color: '#64748b',
    position: [60, 120, -180],
    radiusMly: 165,
    galaxyCount: 60,
    massSOL: 'Negligible',
    members: [],
    sourceUrl: 'https://en.wikipedia.org/wiki/Bo%C3%B6tes_Void',
    sourceName: 'Wikipedia — Boötes Void',
  },
];

export const GALAXY_CLUSTERS: GalaxyClusterData[] = [
  {
    id: 'local_group',
    name: 'The Local Group',
    nameBn: 'লোকাল গ্রুপ (স্থানীয় ছায়াপথ গোষ্ঠী)',
    description:
      'Gravitationally bound group of over 80 galaxies, dominated by the Milky Way and Andromeda.',
    descriptionBn:
      '৮০টিরও বেশি ছায়াপথ নিয়ে গঠিত মহাকর্ষীয়ভাবে আবদ্ধ ছায়াপথ গোষ্ঠী, যার মূল সদস্য আকাশগঙ্গা ও অ্যান্ড্রোমিডা।',
    color: '#60a5fa',
    position: [0, 0, 0],
    radiusKly: 5000,
    memberGalaxies: ['milkyway', 'andromeda', 'triangulum', 'lmc', 'smc'],
    dominantGalaxy: 'Andromeda (M31) & Milky Way',
  },
  {
    id: 'virgo_cluster',
    name: 'Virgo Cluster',
    nameBn: 'ভার্গো ছায়াপথ ক্লাস্টার',
    description:
      'Heart of the Local Supercluster, containing 1,500–2,000 galaxies including the supergiant elliptical M87.',
    descriptionBn:
      'আমাদের লোকাল সুপারক্লাস্টারের কেন্দ্র, যাতে ১৫০০-২০০০ ছায়াপথ এবং দৈত্যাকার উপবৃত্তাকার ছায়াপথ M87 রয়েছে।',
    color: '#fbbf24',
    position: [48, 72, -32],
    radiusKly: 7500,
    memberGalaxies: [],
    dominantGalaxy: 'Messier 87 (M87)',
  },
  {
    id: 'fornax_cluster',
    name: 'Fornax Cluster',
    nameBn: 'ফরনাক্স ক্লাস্টার',
    description:
      'Second richest galaxy cluster within 100 million light-years, located in the constellation Fornax.',
    descriptionBn: '১০ কোটি আলোকবর্ষের মধ্যে অবস্থিত দ্বিতীয় বৃহত্তম ছায়াপথ ক্লাস্টার।',
    color: '#34d399',
    position: [-52, -68, 36],
    radiusKly: 4000,
    memberGalaxies: [],
    dominantGalaxy: 'NGC 1399',
  },
];

export const GALAXIES: GalaxyData[] = [
  {
    id: 'milkyway',
    name: 'Milky Way Galaxy',
    nameBn: 'আকাশগঙ্গা ছায়াপথ',
    type: 'barred-spiral',
    diameterKly: 100,
    starCountBillions: 300,
    ageBillionYears: 13.6,
    hasBlackHole: true,
    blackHoleMassSolar: 4150000,
    color: '#93c5fd',
    position: [0, 0, 0],
    description:
      'Our home barred spiral galaxy featuring two major arms (Perseus & Scutum-Centaurus) and Sagittarius A* at its nucleus.',
    descriptionBn:
      'আমাদের আবাসস্থল দণ্ডাকৃতি সর্পিল ছায়াপথ, যাতে পার্সিয়াস ও স্কুটাম-সেন্টরাস প্রধান বাহু এবং কেন্দ্রে স্যাজিটেরিয়াস এ* অবস্থিত।',
    landmarks: [
      {
        id: 'sgr_a',
        label: 'Sagittarius A* (SMBH)',
        labelBn: 'স্যাজিটেরিয়াস এ* (ব্ল্যাক হোল)',
        color: '#fbbf24',
        position: [0, 0, 0],
        description:
          'Supermassive black hole of ~4.15 million solar masses anchoring the galactic center.',
        descriptionBn:
          'আকাশগঙ্গার কেন্দ্রে অবস্থিত প্রায় ৪১.৫ লক্ষ সূর্যভরের অতিভারী কৃষ্ণগহ্বর।',
        stats: [
          { label: 'ভর', value: '~৪.১৫ মিলিয়ন সূর্যভর' },
          { label: 'দূরত্ব', value: '~২৬,৬৭০ আলোকবর্ষ' },
        ],
        sourceName: 'Event Horizon Telescope',
        sourceUrl: 'https://eventhorizontelescope.org/',
      },
      {
        id: 'solar_loc',
        label: 'Our Solar System (Orion Spur)',
        labelBn: '☀️ আমাদের সৌরজগৎ',
        color: '#fde047',
        position: [15.5, 0.25, 20.8],
        description:
          'Located on the inner edge of the Orion Spur ~26,000 light-years from the galactic center.',
        descriptionBn:
          'আকাশগঙ্গার কেন্দ্র থেকে প্রায় ২৬,০০০ আলোকবর্ষ দূরে কালপুরুষ শাখায় অবস্থিত।',
        stats: [
          { label: 'গ্যালাকটিক বছর', value: '২৩ কোটি বছর' },
          { label: 'কক্ষীয় গতি', value: '~২৩০ কিমি/সেকেন্ড' },
        ],
        actionLabel: 'Enter Solar System',
        actionLabelBn: 'সৌরজগতে প্রবেশ করুন',
        actionType: 'enterSystem',
        actionTarget: 'solar',
        sourceName: 'NASA Milky Way',
        sourceUrl: 'https://science.nasa.gov/universe/galaxies/',
      },
    ],
  },
  {
    id: 'andromeda',
    name: 'Andromeda Galaxy (M31)',
    nameBn: 'অ্যান্ড্রোমিডা ছায়াপথ (M31)',
    type: 'spiral',
    diameterKly: 152,
    starCountBillions: 1000,
    ageBillionYears: 10.0,
    hasBlackHole: true,
    blackHoleMassSolar: 140000000,
    color: '#c084fc',
    position: [-26, 12, 22],
    description:
      'The largest galaxy in the Local Group, heading toward a merger with the Milky Way in ~4.5 billion years.',
    descriptionBn:
      'লোকাল গ্রুপের বৃহত্তম ছায়াপথ, যা প্রায় ৪.৫ বিলিয়ন বছর পর আকাশগঙ্গার সাথে মিলিত হবে।',
  },
  {
    id: 'triangulum',
    name: 'Triangulum Galaxy (M33)',
    nameBn: 'ত্রিভুজ ছায়াপথ (M33)',
    type: 'spiral',
    diameterKly: 60,
    starCountBillions: 40,
    ageBillionYears: 12.0,
    hasBlackHole: false,
    color: '#38bdf8',
    position: [-34, -8, 30],
    description: 'Third-largest member of the Local Group, highly active in star formation.',
    descriptionBn: 'লোকাল গ্রুপের তৃতীয় বৃহত্তম ছায়াপথ, যাতে অত্যন্ত সক্রিয়ভাবে নতুন নক্ষত্র সৃষ্টি হচ্ছে।',
  },
  {
    id: 'lmc',
    name: 'Large Magellanic Cloud',
    nameBn: 'বৃহৎ ম্যাগেলানিক মেঘ (LMC)',
    type: 'irregular',
    diameterKly: 14,
    starCountBillions: 20,
    ageBillionYears: 13.0,
    hasBlackHole: true,
    color: '#f472b6',
    position: [-9, -15, 7],
    description:
      'Satellite galaxy of the Milky Way, home to the Tarantula Nebula (most active starburst region locally).',
    descriptionBn: 'আকাশগঙ্গার প্রধান উপগ্রহ ছায়াপথ, যাতে বিখ্যাত তারানতুলা নীহারিকা অবস্থিত।',
  },
  {
    id: 'smc',
    name: 'Small Magellanic Cloud',
    nameBn: 'ক্ষুদ্র ম্যাগেলানিক মেঘ (SMC)',
    type: 'dwarf',
    diameterKly: 7,
    starCountBillions: 3,
    ageBillionYears: 13.0,
    hasBlackHole: false,
    color: '#fb7185',
    position: [-14, -18, 11],
    description: 'Dwarf irregular satellite galaxy of the Milky Way ~200,000 light-years away.',
    descriptionBn: 'আকাশগঙ্গার ক্ষুদ্র উপগ্রহ ছায়াপথ, প্রায় ২ লক্ষ আলোকবর্ষ দূরে অবস্থিত।',
  },
];

export const STAR_SYSTEMS_CATALOG: Record<string, StarSystemData> = {
  solar: {
    id: 'solar',
    name: 'Our Solar System',
    nameBn: 'আমাদের সৌরজগৎ',
    subtitle: 'Orion Spur • 8 Planets & Earth',
    subtitleBn: 'কালপুরুষ শাখা • ৮টি গ্রহ ও পৃথিবী',
    description:
      'Located ~26,000 light-years from the galactic core, our system orbits the center every 230 million years.',
    descriptionBn:
      'আকাশগঙ্গার কেন্দ্র থেকে প্রায় ২৬,০০০ আলোকবর্ষ দূরে কালপুরুষ শাখায় অবস্থিত আমাদের সূর্য ও ৮টি গ্রহের পরিবার।',
    star: {
      name: 'Sun (Sol)',
      nameBn: 'সূর্য (Sol)',
      radius: 4.8,
      color: '#fef08a',
      glowColor: '#fbbf24',
      textureType: 'sun_yellow',
      temperature: 5778,
      spectralClass: 'G2V',
      luminosity: 1.0,
    },
    habitableZone: { inner: 18.5, outer: 27.5 },
    defaultCamera: { theta: 0.85, phi: 1.02, radius: 46 },
    stats: [
      { label: 'নক্ষত্রের ধরন', value: 'G2V হলুদ বামন' },
      { label: 'কেন্দ্র থেকে দূরত্ব', value: 'প্রায় ২৬,০০০ আলোকবর্ষ' },
      { label: 'গ্যালাকটিক বছর', value: 'প্রায় ২৩ কোটি বছর' },
      { label: 'মোট গ্রহ', value: '৮টি প্রধান গ্রহ' },
    ],
    sourceName: 'NASA Solar System Exploration',
    sourceUrl: 'https://science.nasa.gov/solar-system/',
    planets: [
      {
        id: 'mercury', name: 'Mercury', nameBn: 'বুধ', shortName: 'Mercury', shortNameBn: 'বুধ',
        orbitRadius: 9.5, radius: 0.65, speed: 0.88, tilt: 0.03, rotSpeed: 0.12, textureType: 'mercury', color: '#94a3b8',
        subtitle: 'Innermost rocky planet', subtitleBn: 'সূর্যের নিকটতম উত্তপ্ত পাথুরে গ্রহ',
        description: 'Smallest planet with extreme temperature swings from -180°C to 430°C.',
        descriptionBn: 'সৌরজগতের ক্ষুদ্রতম গ্রহ, যেখানে বায়ুমণ্ডল না থাকায় চরম তাপমাত্রার পার্থক্য ঘটে।',
        stats: [{ label: 'ব্যাস', value: '৪,৮৭৯ কিমি' }, { label: 'কক্ষপথ কাল', value: '৮৮ দিন' }, { label: 'চাঁদ', value: '০' }],
        sourceName: 'NASA Mercury', sourceUrl: 'https://science.nasa.gov/mercury/',
      },
      {
        id: 'venus', name: 'Venus', nameBn: 'শুক্র', shortName: 'Venus', shortNameBn: 'শুক্র',
        orbitRadius: 13.5, radius: 1.15, speed: 0.62, tilt: 3.1, rotSpeed: -0.06, textureType: 'venus', color: '#f59e0b',
        atmosphereColor: '#fcd34d',
        subtitle: 'Runaway greenhouse world', subtitleBn: 'সবচেয়ে উত্তপ্ত গ্রীনহাউস গ্রহ',
        description: 'Veiled in thick sulfuric acid clouds with surface temperatures above 465°C.',
        descriptionBn: 'ঘন সালফিউরিক এসিডের মেঘে ঢাকা এবং ৪৬৫°C তাপমাত্রার সৌরজগতের সবচেয়ে উত্তপ্ত গ্রহ।',
        stats: [{ label: 'ব্যাস', value: '১২,১০৪ কিমি' }, { label: 'কক্ষপথ কাল', value: '২২৫ দিন' }, { label: 'বায়ুচাপ', value: '৯২ বার' }],
        sourceName: 'NASA Venus', sourceUrl: 'https://science.nasa.gov/venus/',
      },
      {
        id: 'earth', name: 'Earth', nameBn: 'পৃথিবী (বাসস্থান)', shortName: 'Earth', shortNameBn: '🌍 পৃথিবী',
        orbitRadius: 19.8, radius: 1.35, speed: 0.48, tilt: 0.41, rotSpeed: 0.5, textureType: 'earth', color: '#38bdf8',
        atmosphereColor: '#60a5fa', hasClouds: true, hasMoon: true, hasNightLights: true,
        subtitle: 'Our living blue marble oasis', subtitleBn: 'মহাবিশ্বে প্রাণের একমাত্র পরিচিত ঠিকানা',
        description: 'Only known world with liquid surface water, plate tectonics, and a biosphere supporting millions of species.',
        descriptionBn: 'তরল পানি, সুরক্ষাকারী বায়ুমণ্ডল ও চৌম্বক ক্ষেত্র সমৃদ্ধ মহাবিশ্বে আমাদের একমাত্র নীলাভ গ্রহ।',
        stats: [{ label: 'ব্যাস', value: '১২,৭৪২ কিমি' }, { label: 'কক্ষপথ কাল', value: '৩৬৫.২৫ দিন' }, { label: 'উপগ্রহ', value: '১টি (চাঁদ)' }],
        sourceName: 'NASA Earth Science', sourceUrl: 'https://science.nasa.gov/earth/',
      },
      {
        id: 'mars', name: 'Mars', nameBn: 'মঙ্গল (লাল গ্রহ)', shortName: 'Mars', shortNameBn: 'মঙ্গল',
        orbitRadius: 26.5, radius: 0.88, speed: 0.38, tilt: 0.44, rotSpeed: 0.48, textureType: 'mars', color: '#ea580c',
        atmosphereColor: '#fb923c',
        subtitle: 'The rust-red desert world', subtitleBn: 'বিশাল গিরিখাত ও আগ্নেয়গিরির লাল গ্রহ',
        description: 'Home to Olympus Mons (tallest volcano in solar system) and ancient dry riverbeds.',
        descriptionBn: 'সৌরজগতের বৃহত্তম আগ্নেয়গিরি অলিম্পাস মনস এবং প্রাচীন শুকনো নদীর উপত্যকা সমৃদ্ধ লাল গ্রহ।',
        stats: [{ label: 'ব্যাস', value: '৬,৭৭৯ কিমি' }, { label: 'কক্ষপথ কাল', value: '৬৮৭ দিন' }, { label: 'উপগ্রহ', value: '২টি (ফোবোস ও ডিমোস)' }],
        sourceName: 'NASA Mars Exploration', sourceUrl: 'https://science.nasa.gov/mars/',
      },
      {
        id: 'jupiter', name: 'Jupiter', nameBn: 'বৃহস্পতি (গ্রহরাজ)', shortName: 'Jupiter', shortNameBn: 'বৃহস্পতি',
        orbitRadius: 36.5, radius: 2.85, speed: 0.22, tilt: 0.05, rotSpeed: 0.85, textureType: 'jupiter', color: '#d97706',
        atmosphereColor: '#f59e0b',
        subtitle: 'The colossus gas giant', subtitleBn: 'সৌরজগতের বৃহত্তম গ্যাস দানব',
        description: 'More massive than all other planets combined, with a centuries-old Great Red Spot storm.',
        descriptionBn: 'অন্য সব গ্রহের সম্মিলিত ভরের দ্বিগুণেরও বেশি এবং শতাব্দীর পর শতাব্দী ধরে চলা মহা লাল ঝড়ে আচ্ছাদিত।',
        stats: [{ label: 'ব্যাস', value: '১,৩৯,৮২০ কিমি' }, { label: 'কক্ষপথ কাল', value: '১১.৮৬ বছর' }, { label: 'পরিচিত উপগ্রহ', value: '৯৫টি' }],
        sourceName: 'NASA Jupiter', sourceUrl: 'https://science.nasa.gov/jupiter/',
      },
      {
        id: 'saturn', name: 'Saturn', nameBn: 'শনি (বলয়রাজ)', shortName: 'Saturn', shortNameBn: 'শনি',
        orbitRadius: 46.0, radius: 2.45, speed: 0.16, tilt: 0.47, rotSpeed: 0.78, textureType: 'saturn', color: '#eab308',
        atmosphereColor: '#fde047', hasRings: true, ringInner: 3.2, ringOuter: 6.2,
        subtitle: 'The magnificent ringed jewel', subtitleBn: 'অনুপম বরফ বলয়ের রাজকীয় গ্রহ',
        description: 'Famous for its complex ice and dust ring system spanning ~282,000 km.',
        descriptionBn: 'প্রায় ২,৮২,০০০ কিমি বিস্তৃত কোটি কোটি বরফের টুকরো দিয়ে তৈরি মনোমুগ্ধকর বলয় সমৃদ্ধ গ্রহ।',
        stats: [{ label: 'ব্যাস', value: '১,১৬,৪৬০ কিমি' }, { label: 'কক্ষপথ কাল', value: '২৯.৪৫ বছর' }, { label: 'পরিচিত উপগ্রহ', value: '১৪৬টি' }],
        sourceName: 'NASA Saturn', sourceUrl: 'https://science.nasa.gov/saturn/',
      },
      {
        id: 'uranus', name: 'Uranus', nameBn: 'ইউরেনাস', shortName: 'Uranus', shortNameBn: 'ইউরেনাস',
        orbitRadius: 54.0, radius: 1.65, speed: 0.11, tilt: 1.7, rotSpeed: -0.52, textureType: 'uranus', color: '#06b6d4',
        atmosphereColor: '#67e8f9', hasThinRing: true,
        subtitle: 'The tilted cyan ice giant', subtitleBn: 'পাশ ফিরে ঘোরা নীলাভ বরফ দানব',
        description: 'Rotates on its side with a 98° axial tilt; composed of water, methane, and ammonia ices.',
        descriptionBn: 'প্রায় ৯৮° কাত হয়ে পাশ ফিরে ঘোরে এবং মিথেন গ্যাসের কারণে এর রঙ হালকা সায়ান-নীল।',
        stats: [{ label: 'ব্যাস', value: '৫০,৭২৪ কিমি' }, { label: 'কক্ষপথ কাল', value: '৮৪ বছর' }, { label: 'পরিচিত উপগ্রহ', value: '২৮টি' }],
        sourceName: 'NASA Uranus', sourceUrl: 'https://science.nasa.gov/uranus/',
      },
      {
        id: 'neptune', name: 'Neptune', nameBn: 'নেপচুন', shortName: 'Neptune', shortNameBn: 'নেপচুন',
        orbitRadius: 62.0, radius: 1.6, speed: 0.08, tilt: 0.49, rotSpeed: 0.56, textureType: 'neptune', color: '#2563eb',
        atmosphereColor: '#60a5fa',
        subtitle: 'Supersonic windswept outer world', subtitleBn: 'সুপারসনিক তীব্র ঝড়ের গাঢ় নীল বরফ দানব',
        description: 'Outermost major planet, featuring the fastest planetary winds exceeding 2,100 km/h.',
        descriptionBn: 'সৌরজগতের দূরতম গ্রহ যেখানে ঘণ্টায় ২,১০০ কিলোমিটারের বেশি গতির সুপারসনিক ঝড় বয়ে চলে।',
        stats: [{ label: 'ব্যাস', value: '৪৯,২৪৪ কিমি' }, { label: 'কক্ষপথ কাল', value: '১৬৪.৮ বছর' }, { label: 'পরিচিত উপগ্রহ', value: '১৬টি' }],
        sourceName: 'NASA Neptune', sourceUrl: 'https://science.nasa.gov/neptune/',
      },
    ],
  },
  proxima: {
    id: 'proxima',
    name: 'Proxima Centauri System',
    nameBn: 'প্রক্সিমা সেন্টরি মণ্ডল',
    subtitle: '4.24 Light-years • Nearest Star to Earth',
    subtitleBn: '৪.২৪ আলোকবর্ষ দূরে • নিকটতম নক্ষত্র ও বহির্গ্রহ',
    description: 'An M-dwarf star orbited by rocky exoplanets, including habitable-zone Proxima b.',
    descriptionBn: 'আমাদের নিকটতম প্রতিবেশী লাল বামন নক্ষত্র এবং এর বাসযোগ্য অঞ্চলে অবস্থিত পাথুরে গ্রহ প্রক্সিমা b।',
    star: {
      name: 'Proxima Centauri',
      nameBn: 'প্রক্সিমা সেন্টরি',
      radius: 3.4,
      color: '#ef4444',
      glowColor: '#dc2626',
      textureType: 'sun_red',
      temperature: 3042,
      spectralClass: 'M5.5Ve',
      luminosity: 0.0017,
    },
    habitableZone: { inner: 16.0, outer: 22.0 },
    defaultCamera: { theta: 0.65, phi: 1.0, radius: 40 },
    stats: [
      { label: 'পৃথিবী থেকে দূরত্ব', value: '৪.২৪ আলোকবর্ষ' },
      { label: 'নক্ষত্রের ধরন', value: 'M-টাইপ লাল বামন' },
      { label: 'পরিচিত গ্রহ', value: 'Proxima d, b' },
    ],
    sourceName: 'NASA Proxima b',
    sourceUrl: 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/',
    planets: [
      {
        id: 'proxima_d', name: 'Proxima Centauri d', nameBn: 'প্রক্সিমা d', shortName: 'Proxima d', shortNameBn: 'Proxima d',
        orbitRadius: 11.0, radius: 0.8, speed: 0.68, tilt: 0.08, rotSpeed: 0.25, textureType: 'proxima_d', color: '#d97757',
        subtitle: 'Sub-Earth rocky inner world', subtitleBn: 'হালকা পাথুরে অভ্যন্তরীণ গ্রহ',
        description: 'Orbits every 5.1 days with ~0.26 Earth masses.',
        descriptionBn: 'মাত্র ৫.১ দিনে নক্ষত্রকে প্রদক্ষিণকারী পৃথিবীর প্রায় এক-চতুর্থাংশ ভরের ছোট পাথুরে গ্রহ।',
        stats: [{ label: 'ভর', value: 'পৃথিবীর ~০.২৬ গুণ' }, { label: 'কক্ষপথ কাল', value: '৫.১ দিন' }],
        sourceName: 'NASA Exoplanets', sourceUrl: 'https://science.nasa.gov/exoplanets/',
      },
      {
        id: 'proxima_b', name: 'Proxima Centauri b', nameBn: 'প্রক্সিমা b (বাসযোগ্য)', shortName: 'Proxima b', shortNameBn: '🔴 Proxima b',
        orbitRadius: 18.5, radius: 1.45, speed: 0.38, tilt: 0.12, rotSpeed: 0.32, textureType: 'proxima_b', color: '#fb7185',
        atmosphereColor: '#fda4af', hasClouds: true,
        subtitle: 'Closest known habitable-zone exoplanet', subtitleBn: 'পৃথিবীর নিকটতম বাসযোগ্য অঞ্চলের সুপার-আর্থ',
        description: 'Rocky super-Earth orbiting in the habitable zone every 11.2 days; subjected to stellar flares.',
        descriptionBn: 'নক্ষত্রের বাসযোগ্য অঞ্চলে থাকা পৃথিবীর সবচেয়ে কাছের বহিঃসৌর গ্রহ।',
        stats: [{ label: 'ভর', value: 'পৃথিবীর ~১.০৬–১.২৭ গুণ' }, { label: 'কক্ষপথ কাল', value: '১১.২ দিন' }, { label: 'দূরত্ব', value: '৪.২৪ আলোকবর্ষ' }],
        sourceName: 'NASA Proxima b', sourceUrl: 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/',
      },
    ],
  },
  trappist: {
    id: 'trappist',
    name: 'TRAPPIST-1 System',
    nameBn: 'ট্র্যাপিস্ট-১ নক্ষত্রমণ্ডল',
    subtitle: '40 Light-years • 7 Earth-sized Rocky Worlds',
    subtitleBn: '৪০ আলোকবর্ষ দূরে • ৭টি পৃথিবী-আকারের পাথুরে গ্রহের সংসার',
    description: 'Ultra-cool red dwarf orbited by seven Earth-sized terrestrial planets, three in the habitable zone.',
    descriptionBn: 'অতি-শীতল লাল বামন নক্ষত্রকে ঘিরে ঘন সন্নিবিষ্ট ৭টি পাথুরে গ্রহ, যার মধ্যে ৩টি বাসযোগ্য অঞ্চলে রয়েছে।',
    star: {
      name: 'TRAPPIST-1',
      nameBn: 'ট্র্যাপিস্ট-১',
      radius: 3.1,
      color: '#f43f5e',
      glowColor: '#e11d48',
      textureType: 'sun_red',
      temperature: 2566,
      spectralClass: 'M8V',
      luminosity: 0.0005,
    },
    habitableZone: { inner: 19.0, outer: 31.0 },
    defaultCamera: { theta: 0.68, phi: 0.96, radius: 48 },
    stats: [
      { label: 'পৃথিবী থেকে দূরত্ব', value: 'প্রায় ৪০ আলোকবর্ষ' },
      { label: 'মোট পাথুরে গ্রহ', value: '৭টি (b থেকে h)' },
      { label: 'বাসযোগ্য অঞ্চলে', value: 'TRAPPIST-1e, f, g' },
    ],
    sourceName: 'NASA Webb TRAPPIST-1',
    sourceUrl: 'https://science.nasa.gov/mission/webb/',
    planets: [
      {
        id: 't1_b', name: 'TRAPPIST-1b', nameBn: 'TRAPPIST-1b', shortName: '1b', shortNameBn: '1b',
        orbitRadius: 8.5, radius: 1.05, speed: 0.85, tilt: 0.04, rotSpeed: 0.3, textureType: 't1_b', color: '#f97316',
        subtitle: 'Blistering inner rocky world', subtitleBn: 'উত্তপ্ত অভ্যন্তরীণ পাথুরে গ্রহ',
        description: 'Orbits in just 1.5 days; observed by JWST.',
        descriptionBn: 'মাত্র ১.৫ দিনে নক্ষত্রকে প্রদক্ষিণ করে।',
        stats: [{ label: 'কক্ষপথ কাল', value: '১.৫ দিন' }],
        sourceName: 'NASA', sourceUrl: 'https://science.nasa.gov/',
      },
      {
        id: 't1_e', name: 'TRAPPIST-1e', nameBn: 'TRAPPIST-1e (বাসযোগ্য)', shortName: '1e (HZ)', shortNameBn: '💧 1e (বাসযোগ্য)',
        orbitRadius: 21.0, radius: 1.25, speed: 0.42, tilt: 0.08, rotSpeed: 0.35, textureType: 'trappist_e', color: '#38bdf8',
        atmosphereColor: '#38bdf8', hasClouds: true,
        subtitle: 'Prime candidate for liquid water ocean', subtitleBn: 'বাসযোগ্য অঞ্চলের সবচেয়ে সম্ভাবনাময় মহাসাগরীয় গ্রহ',
        description: 'Earth-density terrestrial world located solidly within the habitable zone.',
        descriptionBn: 'পৃথিবীর অত্যন্ত কাছাকাছি ঘনত্ব ও আকারের গ্রহ, যাতে তরল পানির সম্ভাবনা সবচেয়ে বেশি।',
        stats: [{ label: 'ভর', value: 'পৃথিবীর ~০.৬৯ গুণ' }, { label: 'কক্ষপথ কাল', value: '৬.১ দিন' }],
        sourceName: 'NASA TRAPPIST-1e', sourceUrl: 'https://science.nasa.gov/exoplanet-catalog/trappist-1-e/',
      },
      {
        id: 't1_f', name: 'TRAPPIST-1f', nameBn: 'TRAPPIST-1f', shortName: '1f', shortNameBn: '1f',
        orbitRadius: 25.5, radius: 1.18, speed: 0.32, tilt: 0.06, rotSpeed: 0.3, textureType: 't1_f', color: '#67e8f9',
        atmosphereColor: '#a5f3fc',
        subtitle: 'Cool ocean/ice-rich world', subtitleBn: 'বাসযোগ্য অঞ্চলের শীতল মহাসাগরীয় প্রার্থী',
        description: 'Orbits in 9.2 days; potentially rich in volatiles.',
        descriptionBn: 'বাসযোগ্য অঞ্চলের শীতল অংশে ৯.২ দিনে নক্ষত্রকে প্রদক্ষিণ করে।',
        stats: [{ label: 'কক্ষপথ কাল', value: '৯.২ দিন' }],
        sourceName: 'NASA', sourceUrl: 'https://science.nasa.gov/',
      },
    ],
  },
  kepler186: {
    id: 'kepler186',
    name: 'Kepler-186 System',
    nameBn: 'কেপলার-১৮৬ নক্ষত্রমণ্ডল',
    subtitle: '580 Light-years • Cygnus Constellation',
    subtitleBn: '৫৮০ আলোকবর্ষ দূরে • সিগনাস তারামণ্ডলের ৫ গ্রহের সংসার',
    description: 'Famous for Kepler-186f, the first Earth-size planet found in the habitable zone of another star.',
    descriptionBn: 'অন্য নক্ষত্রের বাসযোগ্য অঞ্চলে আবিষ্কৃত প্রথম পৃথিবী-আকারের গ্রহ Kepler-186f-এর আবাস।',
    star: {
      name: 'Kepler-186',
      nameBn: 'কেপলার-১৮৬',
      radius: 3.8,
      color: '#f97316',
      glowColor: '#ea580c',
      textureType: 'sun_red',
      temperature: 3788,
      spectralClass: 'M1V',
      luminosity: 0.04,
    },
    habitableZone: { inner: 24.0, outer: 32.0 },
    defaultCamera: { theta: 0.6, phi: 0.98, radius: 46 },
    stats: [
      { label: 'পৃথিবী থেকে দূরত্ব', value: 'প্রায় ৫৮০ আলোকবর্ষ' },
      { label: 'মোট গ্রহ', value: '৫টি (b, c, d, e, f)' },
      { label: 'ঐতিহাসিক গ্রহ', value: 'Kepler-186f' },
    ],
    sourceName: 'NASA Kepler-186f',
    sourceUrl: 'https://science.nasa.gov/exoplanet-catalog/kepler-186-f/',
    planets: [
      {
        id: 'k_f', name: 'Kepler-186f', nameBn: 'Kepler-186f (ঐতিহাসিক বাসযোগ্য)', shortName: '186f', shortNameBn: '💠 186f (বাসযোগ্য)',
        orbitRadius: 28.5, radius: 1.45, speed: 0.22, tilt: 0.16, rotSpeed: 0.36, textureType: 'kepler_186f', color: '#22d3ee',
        atmosphereColor: '#67e8f9', hasClouds: true,
        subtitle: 'First Earth-sized habitable-zone exoplanet ever discovered', subtitleBn: 'বাসযোগ্য অঞ্চলে আবিষ্কৃত প্রথম পৃথিবী-আকারের এক্সোপ্ল্যানেট',
        description: 'Orbits every 130 days; receives ~1/3 of the stellar energy Earth receives from the Sun.',
        descriptionBn: '২০১৪ সালে আবিষ্কৃত ঐতিহাসিক বহির্গ্রহ, যা প্রায় ১৩০ দিনে নক্ষত্রকে প্রদক্ষিণ করে।',
        stats: [{ label: 'ব্যাসার্ধ', value: 'পৃথিবীর ~১.১৭ গুণ' }, { label: 'কক্ষপথ কাল', value: '১৩০ দিন' }],
        sourceName: 'NASA Kepler-186f', sourceUrl: 'https://science.nasa.gov/exoplanet-catalog/kepler-186-f/',
      },
    ],
  },
};

export const COSMIC_ERAS: CosmicEra[] = [
  {
    id: 'big_bang',
    name: 'Big Bang & Inflation',
    nameBn: 'বিগ ব্যাং ও মহাজাগতিক স্ফীতি',
    startBya: 0.0,
    endBya: 0.0001,
    color: '#ffffff',
    description: 'The universe originates from a singularity and undergoes exponential inflation.',
    descriptionBn: 'অসীম ঘনত্বের বিন্দু থেকে মহাবিশ্বের সূচনা এবং সেকেন্ডের ক্ষুদ্র ভগ্নাংশে অতি-দ্রুত স্ফীতি।',
  },
  {
    id: 'recombination',
    name: 'Recombination & CMB',
    nameBn: 'রিকম্বিনেশন ও সিএমবি (আলোর মুক্তি)',
    startBya: 0.00038,
    endBya: 0.1,
    color: '#f59e0b',
    description: 'Electrons bind to protons; the universe becomes transparent, releasing the CMB.',
    descriptionBn: '৩৮০,০০০ বছর বয়সে হাইড্রোজেন তৈরি হয় এবং প্রথম মুক্ত আলো (CMB) চারিদিকে ছড়িয়ে পড়ে।',
  },
  {
    id: 'cosmic_dawn',
    name: 'Cosmic Dawn & First Stars',
    nameBn: 'কসমিক ডন ও প্রথম নক্ষত্রের জন্ম',
    startBya: 0.1,
    endBya: 1.0,
    color: '#38bdf8',
    description: 'First generation massive Population III stars ignite and re-ionize the cosmos.',
    descriptionBn: 'মহাজাগতিক অন্ধকার যুগ শেষে প্রথম প্রজন্মের অতিভারী নক্ষত্রের জন্ম।',
  },
  {
    id: 'galaxy_era',
    name: 'Peak Galaxy Formation',
    nameBn: 'ছায়াপথ গঠনের স্বর্ণযুগ',
    startBya: 1.0,
    endBya: 9.2,
    color: '#a855f7',
    description: 'Protogalaxies merge into giant spirals and ellipticals; quasars shine.',
    descriptionBn: 'হাজার হাজার আদি ছায়াপথ সংঘর্ষের মাধ্যমে সর্পিল ছায়াপথে রূপান্তরিত হয়।',
  },
  {
    id: 'solar_birth',
    name: 'Solar System & Earth Form',
    nameBn: 'সৌরজগৎ ও পৃথিবীর সৃষ্টি',
    startBya: 9.2,
    endBya: 9.4,
    color: '#eab308',
    description: 'A molecular cloud collapses in the Orion Spur, forming our Sun and Earth ~4.6 Bya.',
    descriptionBn: 'প্রায় ৪.৬ বিলিয়ন বছর আগে কালপুরুষ শাখায় গ্যাস ও ধূলিকণার মেঘ ধসে সূর্য ও পৃথিবী সৃষ্টি হয়।',
  },
  {
    id: 'present',
    name: 'Present Stelliferous Era',
    nameBn: 'বর্তমান নক্ষত্রময় যুগ (আজকে)',
    startBya: 13.8,
    endBya: 100.0,
    color: '#22c55e',
    description: 'The universe today at 13.8 billion years — teeming with stars and worlds.',
    descriptionBn: '১৩.৮ বিলিয়ন বছর বয়সে আজকের সমৃদ্ধ মহাবিশ্ব—নক্ষত্র ও গ্রহে পূর্ণ।',
  },
];
