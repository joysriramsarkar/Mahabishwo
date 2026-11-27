def sample_transients(gal, z, cosmo, t_obs_years=10, rng=None):
    """SN II ∝ SFR; SN Ia ∝ M★ (DTD-integrated proxy); time dilation (1+z)."""
    rng = rng or np.random.default_rng()
    dt_rest = t_obs_years/(1+z)
    k_cc, k_ia = 0.01, 1.3e-13          # per M☉ formed ; per M☉ per yr
    n_cc = rng.poisson(k_cc*gal["sfr"]*dt_rest)
    n_ia = rng.poisson(k_ia*10**gal["logMs"]*dt_rest)
    events = []
    for kind, n in (("SNII", n_cc), ("SNIa", n_ia)):
        for _ in range(int(n)):
            t0 = rng.uniform(0, t_obs_years)
            Mpk = -19.3 if kind=="SNIa" else rng.normal(-17.0, 1.0)
            events.append(dict(kind=kind, z=z, ra=gal["ra"], dec=gal["dec"],
                               t_peak=t0, m_peak=Mpk+5*np.log10(cosmo.D_L(z)*1e5),
                               stretch=(1+z)))
    return events
