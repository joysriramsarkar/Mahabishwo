import pyarrow as pa, pyarrow.parquet as pq
import healpy as hp

class LightconeWriter:
    """প্রতি step-এ যেসব কণা/হ্যালো χ(a_prev)→χ(a_now) শেল অতিক্রম করে, লেখে।"""
    def __init__(self, cosmo, L, observer, nside=256, outdir="lightcone/halos"):
        self.cosmo, self.L, self.obs = cosmo, L, np.asarray(observer)
        self.nside, self.outdir = nside, outdir
        self.chi_prev = None

    def __call__(self, pos, vel, a):
        z = 1/a - 1
        chi_now = self.cosmo.chi(z)
        if self.chi_prev is None:
            self.chi_prev = chi_now; return
        # পর্যায়বৃত্ত বাক্সে পর্যবেক্ষক-সাপেক্ষ ন্যূনতম-ছবি ভেক্টর
        d = pos - self.obs
        d -= self.L*np.round(d/self.L)
        r = np.linalg.norm(d, axis=1)
        sel = (r <= self.chi_prev) & (r > chi_now)   # ভিতরের দিকে সরে আসছে
        if sel.any():
            dd = d[sel]; rr = r[sel]
            theta, phi = hp.vec2ang(dd/rr[:,None])
            v_los = np.einsum("ij,ij->i", vel[sel], dd)/rr
            # লাইট-কোন redshift: শেল-সীমায় রৈখিক interpolation
            z_cos = np.interp(rr, [chi_now, self.chi_prev],
                              [z, 1/(a-1e-9)-1])
            tbl = pa.table({
                "hpix": hp.ang2pix(self.nside, theta, phi, nest=True).astype("u4"),
                "ra":  np.degrees(phi).astype("f4"),
                "dec": (90-np.degrees(theta)).astype("f4"),
                "chi": rr.astype("f4"),
                "z_cos": z_cos.astype("f4"),
                "z_obs": (z_cos + (1+z_cos)*v_los/C_KMS).astype("f4"),  # RSD
                "v_los": v_los.astype("f4"),
            })
            pq.write_table(tbl, f"{self.outdir}/shell_z{z:.3f}.parquet")
        self.chi_prev = chi_now
