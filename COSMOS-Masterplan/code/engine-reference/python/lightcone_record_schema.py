# লাইট-কোন গ্যালাক্সি রেকর্ড (Apache Arrow schema, ~১৪০ B/গ্যালাক্সি)
GALAXY_SCHEMA = {
    "id":            "uint64",
    "halo_id":       "uint64",
    "hpix":          "uint32",    # HEALPix nest, nside=256
    "ra", "dec":     "float32",   # degrees
    "z_cos":         "float32",   # cosmological redshift
    "z_obs":         "float32",   # + peculiar velocity (RSD)
    "chi":           "float32",   # comoving Mpc
    "v_los":         "float32",   # km/s
    "log_mstar":     "float32",
    "log_mhalo":     "float32",
    "sfr":           "float32",
    "log_z_gas":     "float32",
    "log_mbh":       "float32",
    "lambda_edd":    "float32",
    "r_half_kpc":    "float32",
    "bt_ratio":      "float32",   # bulge/total
    "a_v":           "float32",   # internal dust
    "mag":           "float32[12]",  # u g r i z y J H K W1 W2 + 1 UV  (observer-frame, k-corr সহ)
    "is_central":    "bool",
    "kappa_lens":    "float32",   # foreground lensing convergence at this (n̂, χ)
    "gamma1","gamma2": "float32",
    "mw_ebv":        "float32",   # আকাশগঙ্গা-মার্কার থেকে extinction
}
