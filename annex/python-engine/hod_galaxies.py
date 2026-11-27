```python
from scipy.special import erf

def hod_zheng07(logM, logMmin=12.0, sig=0.3, logM0=12.0, logM1=13.3, alpha=1.0):
    Ncen = 0.5*(1+erf((logM-logMmin)/sig))
    M, M0, M1 = 10**logM, 10**logM0, 10**logM1
    Nsat = Ncen*np.clip((M-M0)/M1, 0, None)**alpha
    return Ncen, Nsat

def nfw_sample(n, c, rng):
    """NFW-এ ব্যাসার্ধ sample (r/r_vir), inverse-CDF numeric."""
    x = np.linspace(1e-3, 1, 2048)
    cdf = (np.log(1+c*x) - c*x/(1+c*x)); cdf/=cdf[-1]
    return np.interp(rng.random(n), cdf, x)

def paint_galaxies(halos, z, rng, cosmo):
    """halos: dict with logM, pos(3), vel(3), rvir, c, hpix."""
    Ncen, Nsat = hod_zheng07(halos["logM"] + 0.1*z)  # z-বিবর্তন খেলনা
    has_cen = rng.random(len(Ncen)) < Ncen
    nsat = rng.poisson(Nsat)
    gal = []
    # central
    gal.append(dict(pos=halos["pos"][has_cen], vel=halos["vel"][has_cen],
                    logM=halos["logM"][has_cen], central=True))
    # satellites
    idx = np.repeat(np.arange(len(nsat)), nsat)
    r  = nfw_sample(len(idx), halos["c"][idx], rng)*halos["rvir"][idx]
    u  = rng.normal(size=(len(idx),3)); u/=np.linalg.norm(u,axis=1)[:,None]
    sigv = np.sqrt(4.3e-9*10**halos["logM"][idx]/halos["rvir"][idx])  # G in Mpc km²/s²/M☉
    gal.append(dict(pos=halos["pos"][idx]+r[:,None]*u,
                    vel=halos["vel"][idx]+rng.normal(size=(len(idx),3))*sigv[:,None]/np.sqrt(3),
                    logM=halos["logM"][idx], central=False))
    return gal

def stellar_mass_from_halo(logMh, z, rng):
    """Behroozi-ধরনের SMHM, log-normal scatter 0.2 dex (খেলনা প্যারামিটার)."""
    M1 = 11.5 + 0.3*z; eps = 0.02; a=-1.4; b=0.5
    x = logMh - M1
    logMs = np.log10(eps) + M1 + (a*x if np.ndim(x)==0 else 0) \
            + np.where(x<0, a*x, b*x)
    return logMs + rng.normal(0, 0.2, size=np.shape(logMh))

def apparent_mag(logMs, sfr, z, cosmo, band="r"):
    """SPS-এর জায়গায় খুব স্থূল M/L: M_r ≈ 4.65 − 2.5 log10(L/L☉)."""
    ML = 3.0 if sfr < 0.1 else 1.0                 # quenched vs star-forming
    Mabs = 4.65 - 2.5*(logMs - np.log10(ML))
    mu = 5*np.log10(cosmo.D_L(z)*1e6/10)
    kcorr = 1.2*z                                  # খেলনা k-correction
    return Mabs + mu + kcorr
```

