/* ---------- ডার্ক ম্যাটার কণা: ৫৬ বাইট ---------- */
struct DMParticle {
    float    pos[3];        // 12 B  (quantized to 32-bit fixed point)
    float    vel[3];        // 12 B
    float    mass;          //  4 B
    uint64_t id;            //  8 B
    uint32_t key;           //  4 B  Peano-Hilbert
    float    pot;           //  4 B  (ঐচ্ছিক, output-এর জন্য)
    float    softening;     //  4 B
    uint8_t  level;         //  1 B  zoom level
    uint8_t  ti_bin;        //  1 B  timestep bin
    uint16_t pad;           //  2 B
};                          // মোট ৫২→৫৬ B (aligned)

/* ---------- গ্যাস উপাদান: ~২০০ বাইট ---------- */
struct GasCell {
    double   pos[3];        // 24 B
    float    vel[3];        // 12 B
    float    mass;          //  4 B
    float    rho;           //  4 B
    float    u_int;         //  4 B  নির্দিষ্ট অভ্যন্তরীণ শক্তি
    float    B[3];          // 12 B  চৌম্বক ক্ষেত্র
    float    psi;           //  4 B  div-B cleaning
    float    hsml;          //  4 B  smoothing length
    float    metals[11];    // 44 B  H,He,C,N,O,Ne,Mg,Si,S,Ca,Fe
    float    dust[4];       // 16 B  গ্রাফাইট/সিলিকেট × ২ আকার-বিন
    float    chem[20];      // 80 B  অ-সাম্য রাসায়নিক প্রজাতি
    float    e_cr;          //  4 B  cosmic ray শক্তি ঘনত্ব
    float    rad[5*4];      // 80 B  E_nu, F_nu(3) প্রতি bin × ৫ bins
    uint64_t id;            //  8 B
    uint32_t key;           //  4 B
    uint8_t  ti_bin, flags; //  2 B
};                          // মোট ~৩১০ B (পূর্ণ সংস্করণ)

/* ---------- নক্ষত্র কণা (L7: এক কণা = এক নক্ষত্র) ---------- */
struct StarParticle {
    float    pos[3], vel[3];//  24 B
    float    mass;          //   4 B  বর্তমান ভর
    float    mass_init;     //   4 B  জন্মভর (IMF থেকে)
    float    t_birth;       //   4 B
    float    metals[11];    //  44 B
    float    L_bol, T_eff;  //   8 B
    float    R_star;        //   4 B
    uint8_t  phase;         //   1 B  MS/RGB/AGB/WD/NS/BH...
    uint8_t  binary_flag;   //   1 B
    uint64_t companion_id;  //   8 B
    uint64_t id;            //   8 B
};                          // মোট ~১১২ B

/* ---------- কৃষ্ণবিবর ---------- */
struct BHParticle {
    double   pos[3], vel[3];//  48 B
    double   mass;          //   8 B
    double   spin[3];       //  24 B  dimensionless a*
    double   mdot;          //   8 B
    double   E_feedback;    //   8 B  জমা feedback শক্তি
    uint64_t id;            //   8 B
};
