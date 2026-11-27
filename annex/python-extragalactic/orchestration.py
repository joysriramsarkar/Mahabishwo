def run_simulation(engine, lightcone, outputs):
    state = engine.initialize_state()

    while state.scale_factor < 1.0:
        dt = engine.scheduler.choose_timestep(state)

        # Symplectic gravity/hydro integration-এর ধারণাগত ক্রম
        state = engine.gravity.half_kick(state, dt)
        state = engine.hydrodynamics.advance(state, dt)
        state = engine.radiation.advance(state, dt)
        state = engine.chemistry_and_cooling.advance(state, dt)

        state = engine.stars.form_and_evolve(state, dt)
        state = engine.stellar_feedback.inject(state, dt)
        state = engine.black_holes.accrete_and_feedback(state, dt)

        state = engine.gravity.half_kick(state, dt)
        state = engine.advance_clock(state, dt)

        engine.zooms.refine_or_derefine(state)
        lightcone.process_crossings(state)
        outputs.write_if_due(state)

        engine.diagnostics.check_conservation(state)
        engine.diagnostics.check_zoom_contamination(state)

    outputs.finalize_catalogs_and_provenance()
