import numpy as np
from scipy.integrate import quad, solve_ivp
from scipy.interpolate import interp1d

C_KMS = 299792.458

class Cosmology:
    def __init__(self, h=0.6766, Om=0.3111, Ob=0.0490, OL=0.6889,
                 Tcmb=2.7255, Neff=3.044, w0=-1.0, wa=0.0):
        self.h, self.Om, self.Ob, self.OL = h, Om, Ob, OL
        self.w0, self.wa = w0, wa
        # বিকিরণ: ফোটন + relativistic নিউট্রিনো
        Og = 2.4728e-5 / h**2 * (Tcmb/2.7255)**4
        self.Or = Og * (1 + 0.2271*Neff)
        self.Ok = 1 - Om - OL - self.Or
        self.H0 = 100*h                       # km/s/Mpc

    def E(self, z):
        a = 1/(1+z)
        fde = a**(-3*(1+self.w0+self.wa)) * np.exp(-3*self.wa*(1-a))
        return np.sqrt(self.Or*(1+z)**4 + self.Om*(1+z)**3
                       + self.Ok*(1+z)**2 + self.OL*fde)

    def chi(self, z):                          # comoving দূরত্ব [Mpc]
        f = lambda zz: 1/self.E(zz)
        return C_KMS/self.H0 * quad(f, 0, z, limit=200)[0]

    def D_A(self, z):  return self.chi(z)/(1+z)
    def D_L(self, z):  return self.chi(z)*(1+z)

    def age(self, z):                          # Gyr
        f = lambda zz: 1/((1+zz)*self.E(zz))
        H0_inv_gyr = 977.8/self.H0
        return H0_inv_gyr * quad(f, z, np.inf, limit=200)[0]

    def lookback(self, z): return self.age(0) - self.age(z)

    def growth(self, z):                       # রৈখিক বৃদ্ধি D(z), Heath integral
        f = lambda a: 1/(a*self.E(1/a-1))**3
        D = lambda a: 2.5*self.Om*self.E(1/a-1)*quad(f,1e-6,a)[0]
        return D(1/(1+z))/D(1.0)

cosmo = Cosmology()
for z in [0.1, 1, 3, 10, 1090]:
    print(f"z={z:6g}  chi={cosmo.chi(z):8.0f} Mpc  "
          f"D_A={cosmo.D_A(z):7.0f}  age={cosmo.age(z):7.4f} Gyr")
# z=1090 → chi≈14,000 Mpc : last-scattering surface
```
