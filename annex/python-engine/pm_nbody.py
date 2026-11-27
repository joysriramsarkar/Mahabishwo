```python
def cic_deposit(pos, N, L):
    """Cloud-in-cell ভর-জমা → ঘনত্ব-গ্রিড (সমান ভরের কণা)."""
    rho = np.zeros((N,N,N))
    g = pos/L*N
    i = np.floor(g).astype(int); f = g - i
    for dx in (0,1):
        for dy in (0,1):
            for dz in (0,1):
                w = ((f[:,0] if dx else 1-f[:,0]) *
                     (f[:,1] if dy else 1-f[:,1]) *
                     (f[:,2] if dz else 1-f[:,2]))
                np.add.at(rho, ((i[:,0]+dx)%N, (i[:,1]+dy)%N, (i[:,2]+dz)%N), w)
    return rho/rho.mean() - 1.0            # overdensity δ

def pm_force(delta, kvec, L, Om, a):
    """∇²φ = (3/2) Ω_m H0² δ / a  (code units: H0=1, L in Mpc/h)."""
    KX,KY,KZ,k = kvec
    k2 = k**2
    dk = np.fft.rfftn(delta)
    phik = -1.5*Om/a * dk/k2; phik[0,0,0]=0
    return [np.fft.irfftn(-1j*Ki*phik) for Ki in (KX,KY,KZ)]

def cic_interp(field, pos, N, L):
    g = pos/L*N; i=np.floor(g).astype(int); f=g-i; out=np.zeros(len(pos))
    for dx in (0,1):
        for dy in (0,1):
            for dz in (0,1):
                w = ((f[:,0] if dx else 1-f[:,0])*(f[:,1] if dy else 1-f[:,1])
                     *(f[:,2] if dz else 1-f[:,2]))
                out += w*field[(i[:,0]+dx)%N,(i[:,1]+dy)%N,(i[:,2]+dz)%N]
    return out

def run_pm(pos, vel, kvec, N, L, cosmo, a_start, a_end, nsteps=20,
           on_step=None):
    """KDK leapfrog in scale factor a. vel = a² dx/dt (code units)."""
    a_grid = np.linspace(a_start, a_end, nsteps+1)
    E = lambda a: cosmo.E(1/a-1)
    for a0, a1 in zip(a_grid[:-1], a_grid[1:]):
        am = 0.5*(a0+a1)
        # Kick (half)
        delta = cic_deposit(pos, N, L)
        F = pm_force(delta, kvec, L, cosmo.Om, a0)
        acc = np.stack([cic_interp(Fi,pos,N,L) for Fi in F], -1)
        vel += acc * (am-a0)/(a0**2*E(a0))
        # Drift
        pos = np.mod(pos + vel*(a1-a0)/(am**3*E(am)), L)
        # Kick (half)
        delta = cic_deposit(pos, N, L)
        F = pm_force(delta, kvec, L, cosmo.Om, a1)
        acc = np.stack([cic_interp(Fi,pos,N,L) for Fi in F], -1)
        vel += acc * (a1-am)/(a1**2*E(a1))
        if on_step: on_step(pos, vel, a1)       # ← লাইট-কোন hook
    return pos, vel
```

> **উৎপাদনে:** এই PM-কে TreePM বা FMM দিয়ে short-range সংশোধন করা হয়; COLA-তে `vel` হয় 2LPT-ট্র্যাজেক্টরির সাপেক্ষে residual, তাই ১০–২০ step যথেষ্ট।
