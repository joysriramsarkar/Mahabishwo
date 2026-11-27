```python
import numpy as np

def transfer_eh98(k, cosmo):
    """Eisenstein–Hu (1998) no-wiggle fit — শিক্ষামূলক; বাস্তবে CLASS/CAMB."""
    h, Om, Ob = cosmo.h, cosmo.Om, cosmo.Ob
    Th = 2.7255/2.7
    s  = 44.5*np.log(9.83/(Om*h*h))/np.sqrt(1+10*(Ob*h*h)**0.75)
    alpha = 1 - 0.328*np.log(431*Om*h*h)*Ob/Om + 0.38*np.log(22.3*Om*h*h)*(Ob/Om)**2
    Gam = Om*h*(alpha + (1-alpha)/(1+(0.43*k*s)**4))
    q  = k*Th**2/Gam
    L0 = np.log(2*np.e + 1.8*q)
    C0 = 14.2 + 731/(1+62.5*q)
    return L0/(L0 + C0*q*q)

def linear_pk(k, cosmo, ns=0.9665, sigma8=0.8102):
    """P(k) at z=0 [Mpc^3], k in 1/Mpc; sigma8-normalized."""
    T = transfer_eh98(k/cosmo.h, cosmo)     # EH নেয় h/Mpc
    P = k**ns * T**2
    # sigma8 normalization
    R = 8/cosmo.h
    kk = np.logspace(-4, 2, 4000)
    W = 3*(np.sin(kk*R)-kk*R*np.cos(kk*R))/(kk*R)**3
    Pk = kk**ns*transfer_eh98(kk/cosmo.h, cosmo)**2
    s8sq = np.trapz(Pk*W**2*kk**2, kk)/(2*np.pi**2)
    return P * sigma8**2/s8sq

def gaussian_field(N, L, cosmo, seed=0, z_init=49.):
    """Comoving বাক্সে δ(x) at z_init, Fourier-space Gaussian sampling."""
    rng = np.random.default_rng(seed)
    kf = 2*np.pi/L
    kx = np.fft.fftfreq(N, d=1/N)*kf
    kz = np.fft.rfftfreq(N, d=1/N)*kf
    KX, KY, KZ = np.meshgrid(kx, kx, kz, indexing="ij")
    k = np.sqrt(KX**2+KY**2+KZ**2); k[0,0,0] = 1e-10
    Pk = linear_pk(k, cosmo) * cosmo.growth(z_init)**2
    # white noise → রঙিন
    wn = rng.standard_normal((N,N,N))
    dk = np.fft.rfftn(wn) * np.sqrt(Pk) * (N**3/L**1.5)  # discrete normalization
    dk[0,0,0] = 0
    return dk, (KX,KY,KZ,k)

def lpt_displacement(dk, kvec, order=2):
    """1LPT (Zel'dovich) ও 2LPT displacement ক্ষেত্র ψ(q)."""
    KX,KY,KZ,k = kvec
    k2 = k**2
    # 1LPT: ψ1 = -i k δ / k²
    psi1 = [np.fft.irfftn(-1j*Ki*dk/k2) for Ki in (KX,KY,KZ)]
    if order == 1: return psi1, None
    # 2LPT source: Σ_{i<j} (φ_ii φ_jj − φ_ij²), φ_ij = k_i k_j δ/k²
    phi = {}
    for a,Ka in enumerate((KX,KY,KZ)):
        for b,Kb in enumerate((KX,KY,KZ)):
            if b>=a: phi[(a,b)] = np.fft.irfftn(-Ka*Kb*dk/k2)
    src = (phi[(0,0)]*phi[(1,1)] - phi[(0,1)]**2 +
           phi[(0,0)]*phi[(2,2)] - phi[(0,2)]**2 +
           phi[(1,1)]*phi[(2,2)] - phi[(1,2)]**2)
    sk = np.fft.rfftn(src)
    psi2 = [np.fft.irfftn(1j*Ki*sk/k2) for Ki in (KX,KY,KZ)]
    return psi1, psi2

def place_particles(N, L, psi1, psi2, D1=1.0):
    """x = q + D1 ψ1 − (3/7) D1² ψ2  (EdS 2LPT সহগ)."""
    q = (np.arange(N)+0.5)*L/N
    Q = np.stack(np.meshgrid(q,q,q,indexing="ij"), axis=-1)
    disp1 = np.stack(psi1, -1); disp2 = np.stack(psi2, -1)
    x = Q + D1*disp1 - (3/7)*D1**2*disp2
    return np.mod(x, L).reshape(-1,3)
