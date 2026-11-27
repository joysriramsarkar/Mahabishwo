import healpy as hp

def make_cmb_sky(cls_TT, cls_EE, cls_BB, cls_TE, nside=2048, lmax=6000, seed=1):
    np.random.seed(seed)
    T, Q, U = hp.synfast([cls_TT, cls_EE, cls_BB, cls_TE], nside,
                         lmax=lmax, pol=True, new=True)
    return T, Q, U

def lens_map(T, kappa, nside):
    """Born-approx remapping: T_len(n̂) = T(n̂ + ∇φ); κ = −∇²φ/2.
       (উৎপাদনে lenspyx / LensPix; এখানে প্রথম-ক্রম ধারণা)"""
    lmax = 3*nside-1
    klm = hp.map2alm(kappa, lmax=lmax)
    ell = np.arange(lmax+1); fac = np.zeros_like(ell, float)
    fac[1:] = 2.0/(ell[1:]*(ell[1:]+1))
    plm = hp.almxfl(klm, fac)                       # φ_lm
    _, dth, dph = hp.alm2map_der1(plm, nside)       # ∇φ
    th, ph = hp.pix2ang(nside, np.arange(hp.nside2npix(nside)))
    th2 = th + dth; ph2 = ph + dph/np.sin(th)
    return hp.get_interp_val(T, th2, ph2)

def tsz_from_halos(halo_tbl, nside, cosmo):
    """GNFW চাপ-প্রোফাইল প্রজেক্ট করে Compton-y মানচিত্র."""
    y = np.zeros(hp.nside2npix(nside))
    for h in halo_tbl.to_pylist():                  # বাস্তবে ভেক্টরাইজড/GPU
        M500 = 10**h["logM"]*0.7; z=h["z_cos"]
        R500 = (3*M500/(4*np.pi*500*2.775e11*cosmo.h**2*cosmo.E(z)**2))**(1/3)
        theta500 = R500/cosmo.D_A(z)
        Y500 = 2.5e-4*(M500/3e14)**1.79*cosmo.E(z)**(2/3)/cosmo.D_A(z)**2  # Arnaud10-ধরনের
        vec = hp.ang2vec(np.radians(90-h["dec"]), np.radians(h["ra"]))
        pix = hp.query_disc(nside, vec, 5*theta500)
        ang = hp.rotator.angdist(vec, hp.pix2vec(nside, pix))
        prof = (1+(ang/theta500*1.18)**2)**(-1.5)   # স্থূল β-ধরনের
        y[pix] += Y500*prof/prof.sum()*len(pix)/hp.nside2pixarea(nside)
    return y
