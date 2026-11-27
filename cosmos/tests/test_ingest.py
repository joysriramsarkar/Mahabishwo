"""Offline ingest tests.

Every numeric row below is deliberately synthetic schema-fixture data, not an
astronomical measurement. Network tests use httpx.MockTransport only.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from dataclasses import replace
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

COSMOS = Path(__file__).resolve().parents[1]
REPOSITORY = COSMOS.parent
for path in (str(REPOSITORY), str(COSMOS)):
    if path not in sys.path:
        sys.path.insert(0, str(path))

from cosmos.datasets.adapters import (  # noqa: E402
    ADAPTER_NAMES,
    IngestError,
    LimitExceeded,
    describe_sources,
    get_adapter,
    load_releases,
    release_for,
)
from cosmos.datasets.adapters.catalog_tables import CosmicflowsAdapter  # noqa: E402
from cosmos.datasets.adapters.gaia import build_adql  # noqa: E402
from cosmos.datasets.adapters.normalization import measurement  # noqa: E402
from cosmos.datasets.adapters.sources import SOURCES as SOURCE_METADATA  # noqa: E402

_INGEST_CLI = COSMOS / "scientific-knowledge" / "ingest" / "cli.py"
_spec = importlib.util.spec_from_file_location("cosmos_ingest_cli_tested", _INGEST_CLI)
cli = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cli)

# SYNTHETIC FIXTURE ROWS ONLY. Names, identifiers and values are test sentinels.
GAIA_ROWS = [{
    "source_id": 900000000000000001,
    "ra": 101.25,
    "dec": -20.5,
    "ra_error": 0.01,
    "dec_error": 0.01,
    "parallax": 200.0,
    "parallax_error": 10.0,
    "radial_velocity": 12.5,
    "radial_velocity_error": 0.5,
    "phot_g_mean_mag": 15.0,
    "phot_g_mean_flux_over_error": 20.0,
}]
COSMICFLOWS_ROWS = [{
    "pgc": "SYNTHETIC-PGC-1", "name": "SYNTHETIC CF4 ROW", "ra": 101.0, "dec": -20.0,
    "dist": 12.5, "edist": 0.5, "vcmb": -34.0, "evcmb": 2.0,
}]
MCCONNACHIE_ROWS = [{
    "Name": "SYNTHETIC MC ROW", "RA": "06 48 00", "DEC": "-21 00 00",
    "DM": 31.25, "eDM": 0.2, "Vhel": -40.0, "eVhel": 3.0,
    "Ref": "SYNTHETIC LITERATURE REFERENCE",
}]
DESI_ROWS = [{
    "TARGETID": "SYNTHETIC-DESI-1", "RA": 103.0, "DEC": -22.0,
    "Z": 0.123, "ZERR": 0.004, "SPECTYPE": "QSO",
}]
EUCLID_ROWS = [{
    "object_id": "SYNTHETIC-EUCLID-1", "ra": 104.0, "dec": -23.0, "extendedness": 1,
    "photoz": 0.234, "photoz_err": 0.02, "mag_vis": 21.0, "mag_vis_err": 0.1,
}]
PLANCK_ROWS = [{
    "parameter": "SYNTHETIC_PARAMETER", "value": 2.5, "lower": 0.2, "upper": 0.4, "unit": "1",
    "model": "SYNTHETIC-MODEL", "data_combination": "SYNTHETIC-DATA",
}]
JWST_ROW = {
    "obs_id": "SYNTHETIC-JWST-OBS", "target_name": "SYNTHETIC JWST TARGET",
    "s_ra": 105.0, "s_dec": -24.0, "instrument_name": "SYNTHETIC-INSTRUMENT",
    "proposal_id": "999999", "calib_level": 2, "t_exptime": 12.5,
    "dataRights": "PUBLIC", "metaDataRights": "PUBLIC",
}
LIGO_ROWS = [{
    "name": "SYNTHETIC-GW-EVENT", "shortName": "SYNTHETIC-GW-EVENT-v1", "version": 1,
    "gps": 1234567890.5, "catalog": "GWTC", "detectors": ["H1", "L1"],
    "parameters": [
        {"name": "mass_1_source", "best": 11.0, "lower_error": -1.0, "upper_error": 2.0, "unit": "M_sun"},
        {"name": "luminosity_distance", "best": 300.0, "lower_error": -100.0, "upper_error": 150.0, "unit": "Mpc"},
        {"name": "far", "best": 0.001, "lower_error": None, "upper_error": None, "unit": "1/yr", "is_upper_limit": True},
    ],
}]

NORMALIZATION_FIXTURES = {
    "gaia": GAIA_ROWS,
    "cosmicflows": COSMICFLOWS_ROWS,
    "mcconnachie": MCCONNACHIE_ROWS,
    "desi": DESI_ROWS,
    "euclid": EUCLID_ROWS,
    "planck": PLANCK_ROWS,
    "jwst": JWST_ROW,
    "ligo": LIGO_ROWS,
}


def gate(catalogue: dict, tmp_path: Path) -> tuple[list[str], list[str]]:
    path = tmp_path / "gate-input.json"
    path.write_text(json.dumps(catalogue, allow_nan=False), encoding="utf-8")
    return cli.catalog_validator().validate(path)


def write_csv(path: Path, rows: list[dict]) -> Path:
    fields = list(rows[0])
    lines = [",".join(fields)]
    lines.extend(",".join(str(row[field]) for field in fields) for row in rows)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def test_registry_has_all_eight_strict_sources_and_current_tracker():
    assert set(ADAPTER_NAMES) == {
        "gaia", "cosmicflows", "mcconnachie", "desi", "euclid", "planck", "jwst", "ligo",
    }
    assert len(describe_sources()) == 8
    for source in SOURCE_METADATA.values():
        assert source.validate() == []
        assert source.citation and source.license_id and source.license_url
        assert source.uncertainty_policy and source.checked_on == "2026-11-27"
        assert "tbd" not in source.license_id.lower()
    tracker = load_releases()
    assert tracker["checked_on"] == "2026-11-27"
    assert all(item["status"] != "published" or item.get("release_date") for item in tracker["releases"])


def test_metadata_fails_closed_on_placeholder_license_and_bad_noncommercial_flag():
    with pytest.raises(IngestError, match="license_id"):
        replace(SOURCE_METADATA["gaia"], license_id="TBD")
    with pytest.raises(IngestError, match="non-commercial"):
        replace(SOURCE_METADATA["gaia"], commercial_use=True)


def test_upcoming_and_results_only_releases_are_blocked():
    with pytest.raises(IngestError, match="upcoming"):
        release_for("gaia", "DR4")
    with pytest.raises(IngestError, match="published-results-only"):
        release_for("desi", "DR2")
    assert release_for("gaia", "DR3")["status"] == "published"
    assert release_for("ligo")["status"] == "rolling"


def test_adql_is_regional_bounded_and_not_raw_sql():
    query = build_adql(10.0, 20.0, radius_deg=0.5, limit=7)
    assert "SELECT TOP 7" in query
    assert "FROM gaiadr3.gaia_source" in query
    assert "CONTAINS(POINT('ICRS', 10, 20), CIRCLE('ICRS', 10, 20, 0.5)) = 1" in query
    assert ";" not in query
    with pytest.raises(IngestError):
        build_adql("0); SELECT * FROM gaiadr3.gaia_source --", 0, 1, 10)
    with pytest.raises(IngestError):
        build_adql(0, 0, radius_deg=11, limit=10)
    with pytest.raises(IngestError):
        build_adql(0, 0, radius_deg=1, limit=2001)


def test_gaia_dry_run_never_calls_transport():
    def forbidden(request):
        pytest.fail(f"dry-run performed HTTP: {request.method} {request.url}")

    adapter = get_adapter("gaia", client=httpx.Client(transport=httpx.MockTransport(forbidden)))
    plan = adapter.plan(ra_deg=10, dec_deg=20, radius_deg=0.5, limit=7)
    assert plan["dry_run"] is True and plan["request_performed"] is False
    assert plan["network_operations"][0]["method"] == "POST"
    assert plan["license"] == "CC-BY-NC-3.0-IGO"


def test_gaia_mock_transport_and_normalization_preserve_uncertainties(tmp_path):
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={"data": GAIA_ROWS})

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = get_adapter("gaia", client=client).ingest(
            ra_deg=101, dec_deg=-20, radius_deg=0.5, limit=1, mock=True
        )
    assert len(requests) == 1 and requests[0].method == "POST"
    form = parse_qs(requests[0].content.decode())
    assert form["LANG"] == ["ADQL"] and form["FORMAT"] == ["json"]
    assert "CIRCLE" in form["QUERY"][0]
    obj = result["objects"][0]
    assert obj["id"].startswith("mock-gaia-dr3-") and obj["evidence"] == "MOCK"
    assert obj["ra_deg"] == 101.25 and obj["dec_deg"] == -20.5
    distance = next(item for item in obj["measurements"] if item["quantity"] == "distance")
    assert distance["value"] == pytest.approx(0.001 / 200.0)
    assert distance["sigma"] == pytest.approx(0.001 * 10.0 / 200.0**2)
    assert "SYNTHETIC TEST FIXTURE" in distance["source"]
    errors, warnings = gate(result, tmp_path)
    assert errors == [] and warnings == []


def test_gaia_missing_error_is_null_with_note_and_nonpositive_parallax_skipped(tmp_path):
    rows = [{
        "source_id": "SYNTHETIC-NO-ERROR", "ra": 1, "dec": 2, "parallax": 100,
        "radial_velocity": 5,
    }, {"source_id": "SYNTHETIC-NONPOSITIVE", "ra": 3, "dec": 4, "parallax": -1}]
    result = get_adapter("gaia").normalize(rows, mock=True)
    first = result["objects"][0]
    assert all(item["sigma"] is None and item["uncertainty_note"] for item in first["measurements"])
    assert result["objects"][1]["measurements"] == []
    errors, warnings = gate(result, tmp_path)
    assert errors == [] and len(warnings) == 2


@pytest.mark.parametrize("source", ADAPTER_NAMES)
def test_every_adapter_normalizes_synthetic_fixture_through_existing_gate(source, tmp_path):
    result = get_adapter(source).normalize(NORMALIZATION_FIXTURES[source], mock=True)
    assert result["objects"]
    assert result["catalogue"]["ingest"]["mock"] is True
    assert "download" in result["catalogue"]["note"].lower()
    for obj in result["objects"]:
        assert obj["evidence"] == "MOCK" and obj["id"].startswith("mock-")
        for item in obj["measurements"]:
            assert item["source"].startswith("SYNTHETIC TEST FIXTURE")
            assert item["license"] and item["data_version"] == "mock-1"
            assert item["sigma"] is not None or item["uncertainty_note"]
    errors, warnings = gate(result, tmp_path)
    assert errors == []


def test_cosmicflows_local_csv_and_missing_sigma_note(tmp_path):
    source = write_csv(tmp_path / "synthetic-cf4.csv", COSMICFLOWS_ROWS)
    result = get_adapter("cosmicflows").ingest(input_path=source, mock=True)
    obj = result["objects"][0]
    assert [item["quantity"] for item in obj["measurements"]] == ["distance", "cmb_velocity"]
    assert result["catalogue"]["ingest"]["source_files"] == [str(source.resolve())]
    errors, warnings = gate(result, tmp_path)
    assert errors == [] and warnings == []


def test_mcconnachie_distance_modulus_propagation():
    result = get_adapter("mcconnachie").normalize(MCCONNACHIE_ROWS, mock=True)
    obj = result["objects"][0]
    assert obj["ra_deg"] == pytest.approx(102.0) and obj["dec_deg"] == pytest.approx(-21.0)
    assert obj["literature_source"] == "SYNTHETIC LITERATURE REFERENCE"
    distance = obj["measurements"][0]
    assert distance["source_detail"] == "SYNTHETIC LITERATURE REFERENCE"
    expected = 10 ** ((31.25 - 25) / 5)
    assert distance["value"] == pytest.approx(expected)
    assert distance["sigma"] == pytest.approx(expected * 0.2 * 2.302585092994046 / 5)
    assert distance["original"]["distance_modulus_mag"] == 31.25


def test_desi_and_euclid_keep_classification_and_column_map(tmp_path):
    desi = get_adapter("desi").normalize(DESI_ROWS, mock=True)
    assert desi["objects"][0]["type"] == "quasar"
    assert desi["objects"][0]["measurements"][0]["quantity"] == "redshift"
    custom_rows = [{"custom_id": "SYNTHETIC", "custom_ra": 1, "custom_dec": 2, "custom_z": 0.1}]
    euclid = get_adapter("euclid").normalize(
        custom_rows, mock=True,
        columns={"id": "custom_id", "ra": "custom_ra", "dec": "custom_dec", "redshift": "custom_z"},
    )
    assert euclid["objects"][0]["ra_deg"] == 1
    assert euclid["objects"][0]["measurements"][0]["sigma"] is None
    assert euclid["objects"][0]["measurements"][0]["uncertainty_note"]


def test_planck_asymmetric_bounds_are_not_fabricated_sigma(tmp_path):
    result = get_adapter("planck").normalize(PLANCK_ROWS, mock=True)
    item = result["objects"][0]["measurements"][0]
    assert item["sigma"] is None
    assert item["interval"] == {"lower": 0.2, "upper": 0.4, "kind": "source-absolute-bounds"}
    assert item["model"] == "SYNTHETIC-MODEL" and item["data_combination"] == "SYNTHETIC-DATA"
    assert "not a symmetric sigma" in item["uncertainty_note"]
    errors, warnings = gate(result, tmp_path)
    assert errors == [] and len(warnings) == 1


def test_planck_rejects_ambiguous_sigma_and_interval():
    row = dict(PLANCK_ROWS[0], sigma=0.3)
    with pytest.raises(IngestError, match="ambiguous"):
        get_adapter("planck").normalize([row], mock=True)


def test_planck_signed_error_offsets_are_converted_explicitly():
    row = {
        "parameter": "SYNTHETIC_OFFSETS", "value": 2.5,
        "lower_error": -0.2, "upper_error": 0.4, "unit": "1",
        "model": "SYNTHETIC-MODEL", "data_combination": "SYNTHETIC-DATA",
    }
    result = get_adapter("planck").normalize([row], mock=True)
    item = result["objects"][0]["measurements"][0]
    assert item["interval"] == {"lower": 2.3, "upper": 2.9, "kind": "source-signed-offset-bounds"}
    assert item["sigma"] is None


def test_jwst_mock_transport_is_metadata_only_and_restricted_fails_closed():
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json=JWST_ROW)

    uri = "mast:JWST/product/synthetic_observation.fits"
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        adapter = get_adapter("jwst", client=client)
        result = adapter.ingest(data_uri=uri, mock=True)
    assert len(requests) == 1 and requests[0].method == "GET"
    assert parse_qs(urlparse(str(requests[0].url)).query)["uri"] == [uri]
    assert all("product/synthetic_observation.fits" not in str(request.url) for request in requests)
    item = result["objects"][0]["measurements"][0]
    assert item["quantity"] == "exposure_time" and item["sigma"] is None
    with pytest.raises(IngestError, match="not PUBLIC"):
        get_adapter("jwst").normalize({**JWST_ROW, "dataRights": "RESTRICTED"}, mock=True)


def test_ligo_mock_transport_never_follows_strain_or_posterior_links():
    requests = []

    def handler(request):
        requests.append(request)
        path = urlparse(str(request.url)).path
        if path.endswith("/events"):
            return httpx.Response(200, json={"results": [{key: value for key, value in LIGO_ROWS[0].items() if key != "parameters"}]})
        if path.endswith("/default-parameters"):
            return httpx.Response(200, json=LIGO_ROWS[0]["parameters"])
        pytest.fail(f"unexpected GWOSC request: {request.url}")

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = get_adapter("ligo", client=client).ingest(limit=1, include_parameters=True, mock=True)
    assert len(requests) == 2
    assert all("strain" not in str(request.url) and "zenodo" not in str(request.url) for request in requests)
    measurements = result["objects"][0]["measurements"]
    mass = next(item for item in measurements if item["original_parameter"] == "mass_1_source")
    assert mass["unit"] == "Msun" and mass["mass_definition"]
    assert mass["sigma"] is None and mass["interval"] == {"lower": 10.0, "upper": 13.0, "kind": "source-credible-interval-not-sigma"}
    upper_limit = next(item for item in measurements if item["original_parameter"] == "far")
    assert upper_limit["parameter_limit"] == {"upper": True, "lower": False}
    assert "one-sided" in upper_limit["uncertainty_note"]


def test_ligo_flat_default_parameters_do_not_turn_offsets_into_measurements():
    row = {
        "name": "SYNTHETIC-FLAT-GW", "shortName": "SYNTHETIC-FLAT-GW-v1", "version": 1,
        "parameters": {
            "mass_1_source": 11.0, "mass_1_source_lower": -1.0,
            "mass_1_source_upper": 2.0, "mass_1_source_unit": "M_sun",
        },
    }
    result = get_adapter("ligo").normalize([row], mock=True)
    measurements = result["objects"][0]["measurements"]
    assert len(measurements) == 1
    assert measurements[0]["original_parameter"] == "mass_1_source"
    assert measurements[0]["interval"]["lower"] == 10.0


def test_local_table_row_and_byte_limits(tmp_path):
    rows = [{**COSMICFLOWS_ROWS[0], "pgc": f"SYNTHETIC-{index}"} for index in range(3)]
    source = write_csv(tmp_path / "too-many.csv", rows)
    with pytest.raises(LimitExceeded, match="max_rows=2"):
        get_adapter("cosmicflows").ingest(input_path=source, max_rows=2, mock=True)
    tiny_metadata = replace(SOURCE_METADATA["cosmicflows"], max_response_bytes=32)
    source.write_text("x" * 33, encoding="utf-8")
    with pytest.raises(LimitExceeded, match="cap is 32"):
        CosmicflowsAdapter(tiny_metadata).ingest(input_path=source, mock=True)


def test_http_response_byte_limit_is_streamed_and_enforced():
    metadata = replace(SOURCE_METADATA["jwst"], max_response_bytes=16)

    def handler(request):
        return httpx.Response(200, content=b"x" * 100)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        adapter = get_adapter("jwst", client=client)
        adapter.metadata = metadata
        with pytest.raises(LimitExceeded, match="response exceeded 16 bytes"):
            adapter.fetch(data_uri="mast:JWST/product/synthetic.fits")


def test_strict_measurement_rules_reject_fabrication_and_nonfinite_values():
    metadata = SOURCE_METADATA["cosmicflows"]
    base = dict(quantity="distance", value=1, unit="Mpc", method="synthetic")
    with pytest.raises(IngestError, match="uncertainty_note"):
        measurement(metadata, **base)
    with pytest.raises(IngestError, match="non-finite"):
        measurement(metadata, **{**base, "value": float("nan")}, sigma=0.1)
    with pytest.raises(IngestError, match="mass_definition"):
        measurement(metadata, **{**base, "quantity": "mass", "unit": "Msun"}, sigma=0.1)
    with pytest.raises(IngestError, match="not quoted"):
        measurement(metadata, **base, sigma=0.1, uncertainty_note="uncertainty not quoted in source")


def test_cli_dry_run_is_io_free_and_requires_query_arguments(capsys):
    assert cli.main(["plan", "gaia", "--ra", "10", "--dec", "20", "--limit", "5"]) == 0
    plan = json.loads(capsys.readouterr().out)
    assert plan["request_performed"] is False and plan["dry_run"] is True
    assert cli.main(["plan", "gaia", "--ra", "10"]) == 2
    assert "missing or invalid arguments" in capsys.readouterr().err


def test_cli_ingest_without_execute_is_dry_run(tmp_path, capsys):
    source = write_csv(tmp_path / "synthetic.csv", COSMICFLOWS_ROWS)
    output = tmp_path / "must-not-exist.json"
    assert cli.main(["ingest", "cosmicflows", "--input", str(source), "--output", str(output)]) == 0
    assert json.loads(capsys.readouterr().out)["request_performed"] is False
    assert not output.exists()


def test_cli_mock_fixture_execute_validates_atomically_with_existing_gate(tmp_path, capsys):
    fixture = tmp_path / "synthetic-fixture.json"
    fixture.write_text(json.dumps({
        "mock": True,
        "notice": "Synthetic schema fixture only; not Cosmicflows-4 data.",
        "payload": {"rows": COSMICFLOWS_ROWS},
    }), encoding="utf-8")
    output = tmp_path / "normalized.json"
    assert cli.main([
        "ingest", "cosmicflows", "--fixture", str(fixture), "--execute", "--output", str(output),
    ]) == 0
    summary = json.loads(capsys.readouterr().out)
    assert summary["validated_by"] == "scientific-knowledge/ingest/validate_catalog.py"
    result = json.loads(output.read_text(encoding="utf-8"))
    assert result["catalogue"]["ingest"]["mock"] is True
    assert result["objects"][0]["evidence"] == "MOCK"
    errors, _ = gate(result, tmp_path)
    assert errors == []


def test_cli_failed_validation_does_not_replace_existing_output(tmp_path, capsys):
    fixture = tmp_path / "ambiguous-planck.json"
    fixture.write_text(json.dumps({
        "mock": True, "notice": "Synthetic invalid schema fixture.",
        "payload": {"rows": [dict(PLANCK_ROWS[0], sigma=0.3)]},
    }), encoding="utf-8")
    output = tmp_path / "existing.json"
    output.write_text("DO NOT REPLACE", encoding="utf-8")
    assert cli.main([
        "ingest", "planck", "--fixture", str(fixture), "--execute", "--output", str(output),
    ]) == 2
    assert output.read_text(encoding="utf-8") == "DO NOT REPLACE"
    assert "[FAIL]" in capsys.readouterr().err


def test_cli_rejects_unmarked_fixture_and_upcoming_release(tmp_path, capsys):
    fixture = tmp_path / "unmarked.json"
    fixture.write_text(json.dumps({"payload": GAIA_ROWS}), encoding="utf-8")
    assert cli.main([
        "ingest", "gaia", "--fixture", str(fixture), "--execute", "--output", str(tmp_path / "x.json"),
    ]) == 2
    assert "mock=true" in capsys.readouterr().err
    assert cli.main(["plan", "gaia", "--release", "DR4", "--ra", "0", "--dec", "0"]) == 2
    assert "upcoming" in capsys.readouterr().err


def test_existing_catalogue_gate_file_is_reused_not_copied():
    validator_path = Path(cli.catalog_validator().__file__).resolve()
    assert validator_path == (COSMOS / "scientific-knowledge" / "ingest" / "validate_catalog.py").resolve()
