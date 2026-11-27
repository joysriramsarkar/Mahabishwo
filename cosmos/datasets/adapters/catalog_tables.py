"""Offline adapters for small exports from Cosmicflows-4, McConnachie, DESI,
Euclid, and Planck. Column aliases are explicit; release-specific overrides are
supported instead of guessing ambiguous schemas.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Mapping, Sequence

from .framework import LimitExceeded, LocalTableAdapter
from .metadata import IngestError
from .normalization import (
    add_measurement,
    catalogue,
    column,
    coordinate,
    measurement,
    number,
    object_record,
    slug,
    text,
)
from .sources import SOURCES


def _rows(adapter: LocalTableAdapter, rows: Any) -> list[dict[str, Any]]:
    if not isinstance(rows, list):
        raise IngestError("normalizer expects a list of row objects")
    if len(rows) > adapter.metadata.max_rows:
        raise LimitExceeded(f"table exceeds max_rows={adapter.metadata.max_rows}")
    if any(not isinstance(row, dict) for row in rows):
        raise IngestError("every table row must be an object")
    return rows


def _value(
    row: Mapping[str, Any], role: str, aliases: Mapping[str, Sequence[str]],
    columns: Mapping[str, str] | None,
) -> Any:
    return column(row, (columns or {}).get(role, aliases.get(role)))


def _finish(
    adapter: LocalTableAdapter,
    objects: list[dict[str, Any]],
    *,
    mock: bool,
    retrieved_at: str | None,
    source_files: Sequence[str | Path],
) -> dict[str, Any]:
    return catalogue(
        adapter.metadata, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files,
        note="Synthetic table-schema fixture; not archive data and no download claimed." if mock else None,
    )


class CosmicflowsAdapter(LocalTableAdapter):
    aliases = {
        "id": ("pgc", "PGC", "pgc_id"),
        "name": ("name", "Name"),
        "ra": ("ra", "RA", "raglon"),
        "dec": ("dec", "DEC", "raglat"),
        "distance": ("dist", "Dist", "distance"),
        "distance_sigma": ("edist", "e_dist", "dist_err", "distance_err", "distance_sigma"),
        "velocity": ("vcmb", "Vcmb", "v_cmb", "velocity"),
        "velocity_sigma": ("evcmb", "e_vcmb", "vcmb_err", "velocity_sigma"),
    }

    def normalize(
        self, rows: Any, *, columns: Mapping[str, str] | None = None,
        mock: bool = False, retrieved_at: str | None = None,
        source_files: Sequence[str | Path] = (), **_: Any,
    ) -> dict[str, Any]:
        objects = []
        for index, row in enumerate(_rows(self, rows), 1):
            identifier = text(_value(row, "id", self.aliases, columns), f"row {index}.id")
            name = text(_value(row, "name", self.aliases, columns), f"row {index}.name")
            suffix = identifier or name
            if not suffix:
                raise IngestError(f"row {index}: Cosmicflows requires PGC id or name")
            obj = object_record(
                self.metadata, suffix=suffix, name=name or f"PGC {identifier}", object_type="galaxy",
                mock=mock,
                ra_deg=_value(row, "ra", self.aliases, columns),
                dec_deg=_value(row, "dec", self.aliases, columns),
                pgc_identifier=identifier,
            )
            distance = number(_value(row, "distance", self.aliases, columns), "distance", required=False)
            if distance is not None:
                sigma = number(_value(row, "distance_sigma", self.aliases, columns), "distance_sigma", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata, quantity="distance", value=distance, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "distance uncertainty not quoted in source row; sigma left null",
                    unit="Mpc", method="Cosmicflows-4 compiled distance, EDD Table 2 (kallcf4)", mock=mock,
                ))
            velocity = number(_value(row, "velocity", self.aliases, columns), "velocity", required=False)
            if velocity is not None:
                sigma = number(_value(row, "velocity_sigma", self.aliases, columns), "velocity_sigma", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata, quantity="cmb_velocity", value=velocity, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "velocity uncertainty not quoted in source row; sigma left null",
                    unit="km/s", method="Cosmicflows-4 CMB-frame velocity, EDD Table 2 (kallcf4)", mock=mock,
                ))
            objects.append(obj)
        return _finish(self, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files)


class McConnachieAdapter(LocalTableAdapter):
    aliases = {
        "id": ("Name", "name"),
        "ra": ("RA", "ra", "RAdeg"),
        "dec": ("DEC", "dec", "DEdeg"),
        "distance_modulus": ("DM", "dm", "dM", "Distance_Modulus"),
        "distance_modulus_sigma": ("eDM", "e_dm", "DM_err", "distance_modulus_sigma"),
        "distance": ("distance", "Dist", "dist"),
        "distance_sigma": ("distance_sigma", "dist_err", "eDist"),
        "velocity": ("Vhel", "vhel", "Vlos", "velocity"),
        "velocity_sigma": ("eVhel", "e_vhel", "velocity_sigma"),
        "reference": ("Ref", "ref", "reference", "literature_source"),
    }

    def normalize(
        self, rows: Any, *, columns: Mapping[str, str] | None = None,
        mock: bool = False, retrieved_at: str | None = None,
        source_files: Sequence[str | Path] = (), **_: Any,
    ) -> dict[str, Any]:
        objects = []
        for index, row in enumerate(_rows(self, rows), 1):
            name = text(_value(row, "id", self.aliases, columns), f"row {index}.Name", required=True)
            reference = text(_value(row, "reference", self.aliases, columns), f"row {index}.reference")
            obj = object_record(
                self.metadata, suffix=name, name=name, object_type="galaxy", mock=mock,
                ra_deg=_value(row, "ra", self.aliases, columns),
                dec_deg=_value(row, "dec", self.aliases, columns),
                literature_source=reference,
            )
            dm = number(_value(row, "distance_modulus", self.aliases, columns), "DM", required=False)
            if dm is not None:
                dm_sigma = number(_value(row, "distance_modulus_sigma", self.aliases, columns), "eDM", required=False, minimum=0)
                distance = 10 ** ((dm - 25) / 5)
                sigma = math.log(10) / 5 * distance * dm_sigma if dm_sigma is not None else None
                add_measurement(obj, measurement(
                    self.metadata, quantity="distance", value=distance, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "distance-modulus uncertainty not quoted; sigma left null",
                    unit="Mpc", method="distance modulus converted to Mpc; first-order error propagation", mock=mock,
                    original={"distance_modulus_mag": dm, "distance_modulus_sigma_mag": dm_sigma},
                    mass_definition=None,
                    **({"source_detail": reference} if reference else {}),
                ))
            else:
                distance = number(_value(row, "distance", self.aliases, columns), "distance", required=False)
                if distance is not None:
                    sigma = number(_value(row, "distance_sigma", self.aliases, columns), "distance_sigma", required=False, minimum=0)
                    add_measurement(obj, measurement(
                        self.metadata, quantity="distance", value=distance, sigma=sigma,
                        uncertainty_note=None if sigma is not None else "distance uncertainty not quoted; sigma left null",
                        unit="Mpc", method="compiled Local Group distance", mock=mock,
                        **({"source_detail": reference} if reference else {}),
                    ))
            velocity = number(_value(row, "velocity", self.aliases, columns), "velocity", required=False)
            if velocity is not None:
                sigma = number(_value(row, "velocity_sigma", self.aliases, columns), "velocity_sigma", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata, quantity="heliocentric_velocity", value=velocity, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "velocity uncertainty not quoted; sigma left null",
                    unit="km/s", method="McConnachie 2012 compilation (retain row literature source)", mock=mock,
                    **({"source_detail": reference} if reference else {}),
                ))
            objects.append(obj)
        return _finish(self, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files)


class DESIAdapter(LocalTableAdapter):
    aliases = {
        "id": ("TARGETID", "targetid", "target_id"),
        "name": ("NAME", "name"),
        "ra": ("RA", "ra", "TARGET_RA", "target_ra"),
        "dec": ("DEC", "dec", "TARGET_DEC", "target_dec"),
        "redshift": ("Z", "z", "redshift"),
        "redshift_sigma": ("ZERR", "zerr", "redshift_error", "redshift_sigma"),
        "object_type": ("SPECTYPE", "spectype", "OBJTYPE", "objtype"),
    }

    def normalize(
        self, rows: Any, *, columns: Mapping[str, str] | None = None,
        mock: bool = False, retrieved_at: str | None = None,
        source_files: Sequence[str | Path] = (), **_: Any,
    ) -> dict[str, Any]:
        objects = []
        for index, row in enumerate(_rows(self, rows), 1):
            identifier = text(_value(row, "id", self.aliases, columns), f"row {index}.TARGETID", required=True)
            raw_kind = text(_value(row, "object_type", self.aliases, columns), "SPECTYPE")
            kind = (raw_kind or "").upper()
            mapped = {"GALAXY": "galaxy", "QSO": "quasar", "STAR": "star"}.get(kind, "spectroscopic-source")
            obj = object_record(
                self.metadata, suffix=identifier, name=text(_value(row, "name", self.aliases, columns), "name") or f"DESI {identifier}",
                object_type=mapped, mock=mock,
                ra_deg=_value(row, "ra", self.aliases, columns), dec_deg=_value(row, "dec", self.aliases, columns),
                target_identifier=identifier,
            )
            redshift = number(_value(row, "redshift", self.aliases, columns), "redshift", required=False)
            if redshift is not None:
                sigma = number(_value(row, "redshift_sigma", self.aliases, columns), "redshift_sigma", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata, quantity="redshift", value=redshift, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "redshift uncertainty not quoted; sigma left null",
                    unit="1", method="DESI spectroscopic redshift (DR1 row)", mock=mock,
                ))
            objects.append(obj)
        return _finish(self, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files)


class EuclidAdapter(LocalTableAdapter):
    aliases = {
        "id": ("object_id", "objectid", "source_id", "ID"),
        "name": ("name", "object_name"),
        "ra": ("ra", "RA", "right_ascension", "mer_ra"),
        "dec": ("dec", "DEC", "declination", "mer_dec"),
        "redshift": ("photoz", "photometric_redshift", "z_phot"),
        "redshift_sigma": ("photoz_err", "photometric_redshift_error", "z_phot_err"),
        "extendedness": ("extendedness", "is_extended"),
        "magnitude": ("mag_vis", "vis_mag", "VIS_MAG"),
        "magnitude_sigma": ("mag_vis_err", "vis_mag_err", "VIS_MAG_ERR"),
    }

    def normalize(
        self, rows: Any, *, columns: Mapping[str, str] | None = None,
        mock: bool = False, retrieved_at: str | None = None,
        source_files: Sequence[str | Path] = (), **_: Any,
    ) -> dict[str, Any]:
        objects = []
        for index, row in enumerate(_rows(self, rows), 1):
            identifier = text(_value(row, "id", self.aliases, columns), f"row {index}.object_id", required=True)
            extended = _value(row, "extendedness", self.aliases, columns)
            object_type = "extragalactic-source"
            if extended is not None and str(extended).strip().lower() in {"0", "1", "true", "false"}:
                object_type = "galaxy" if str(extended).strip().lower() in {"1", "true"} else "point-source"
            obj = object_record(
                self.metadata, suffix=identifier, name=text(_value(row, "name", self.aliases, columns), "name") or f"Euclid {identifier}",
                object_type=object_type, mock=mock,
                ra_deg=_value(row, "ra", self.aliases, columns), dec_deg=_value(row, "dec", self.aliases, columns),
                source_identifier=identifier,
            )
            redshift = number(_value(row, "redshift", self.aliases, columns), "photoz", required=False)
            if redshift is not None:
                sigma = number(_value(row, "redshift_sigma", self.aliases, columns), "photoz_err", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata, quantity="photometric_redshift", value=redshift, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "photometric-redshift uncertainty not quoted; sigma left null",
                    unit="1", method="Euclid DR1-Foundation catalogue photometric redshift", mock=mock,
                ))
            magnitude = number(_value(row, "magnitude", self.aliases, columns), "magnitude", required=False)
            if magnitude is not None:
                sigma = number(_value(row, "magnitude_sigma", self.aliases, columns), "magnitude_sigma", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata, quantity="apparent_magnitude_vis", value=magnitude, sigma=sigma,
                    uncertainty_note=None if sigma is not None else "magnitude uncertainty not quoted; sigma left null",
                    unit="mag", method="Euclid VIS-band catalogue magnitude", mock=mock,
                ))
            objects.append(obj)
        return _finish(self, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files)


class PlanckAdapter(LocalTableAdapter):
    aliases = {
        "parameter": ("parameter", "name", "Parameter"),
        "value": ("value", "best_fit", "bestfit", "median"),
        "sigma": ("sigma", "error", "sym_error"),
        "lower": ("lower", "minus", "lower_error", "lower_bound"),
        "upper": ("upper", "plus", "upper_error", "upper_bound"),
        "bounds_kind": ("bounds_kind", "interval_kind"),
        "interval_level": ("interval_level", "credible_level"),
        "unit": ("unit", "units"),
        "model": ("model", "Model"),
        "data_combination": ("data_combination", "data", "Data", "dataset"),
    }

    def normalize(
        self, rows: Any, *, columns: Mapping[str, str] | None = None,
        mock: bool = False, retrieved_at: str | None = None,
        source_files: Sequence[str | Path] = (), **_: Any,
    ) -> dict[str, Any]:
        rows = _rows(self, rows)
        obj = object_record(
            self.metadata, suffix="parameters", name="Planck 2018 cosmological parameter table",
            object_type="cosmological-model", boundary_kind="model-dependent", mock=mock,
        )
        for index, row in enumerate(rows, 1):
            parameter = text(_value(row, "parameter", self.aliases, columns), f"row {index}.parameter", required=True)
            model = text(_value(row, "model", self.aliases, columns), f"row {index}.model", required=True)
            data_combination = text(
                _value(row, "data_combination", self.aliases, columns),
                f"row {index}.data_combination", required=True,
            )
            value = number(_value(row, "value", self.aliases, columns), f"{parameter}.value")
            sigma = number(_value(row, "sigma", self.aliases, columns), f"{parameter}.sigma", required=False, minimum=0)
            lower = number(_value(row, "lower", self.aliases, columns), f"{parameter}.lower", required=False)
            upper = number(_value(row, "upper", self.aliases, columns), f"{parameter}.upper", required=False)
            if (lower is None) != (upper is None):
                raise IngestError(f"{parameter}: both lower and upper interval bounds are required")
            if sigma is not None and (lower is not None or upper is not None):
                raise IngestError(f"{parameter}: ambiguous table has both sigma and interval bounds")
            extra: dict[str, Any] = {"model": model, "data_combination": data_combination}
            interval_level = text(_value(row, "interval_level", self.aliases, columns), "interval_level")
            if interval_level:
                extra["interval_level"] = interval_level
            note = None
            if sigma is None and lower is not None and upper is not None:
                bounds_kind = text(_value(row, "bounds_kind", self.aliases, columns), "bounds_kind")
                if bounds_kind is None:
                    lower_name = (columns or {}).get("lower") or next(
                        (name for name in self.aliases["lower"] if name in row), ""
                    )
                    upper_name = (columns or {}).get("upper") or next(
                        (name for name in self.aliases["upper"] if name in row), ""
                    )
                    if lower_name.endswith("_error") or upper_name.endswith("_error"):
                        bounds_kind = "signed-offset" if lower <= 0 <= upper else "magnitude"
                    else:
                        bounds_kind = "absolute"
                if bounds_kind == "absolute":
                    interval_lower, interval_upper = lower, upper
                elif bounds_kind == "signed-offset":
                    if lower > 0 or upper < 0:
                        raise IngestError(f"{parameter}: signed offsets require lower<=0 and upper>=0")
                    interval_lower, interval_upper = value + lower, value + upper
                elif bounds_kind == "magnitude":
                    if lower < 0 or upper < 0:
                        raise IngestError(f"{parameter}: error magnitudes must be non-negative")
                    interval_lower, interval_upper = value - lower, value + upper
                else:
                    raise IngestError(f"{parameter}: unknown bounds_kind {bounds_kind!r}")
                if interval_lower > interval_upper:
                    raise IngestError(f"{parameter}: lower bound exceeds upper bound")
                extra["interval"] = {
                    "lower": interval_lower, "upper": interval_upper,
                    "kind": f"source-{bounds_kind}-bounds",
                }
                note = "asymmetric source interval retained; it is not a symmetric sigma"
            elif sigma is None:
                note = "parameter uncertainty not quoted in source table; sigma left null"
            add_measurement(obj, measurement(
                self.metadata,
                quantity=f"planck_{slug(parameter)}",
                value=value,
                sigma=sigma,
                uncertainty_note=note,
                unit=text(_value(row, "unit", self.aliases, columns), f"{parameter}.unit") or "1",
                method="Planck 2018 parameter-table best fit (model/data combination must be supplied in source file)",
                mock=mock,
                original={"parameter": parameter, "lower": lower, "upper": upper},
                **extra,
            ))
        return _finish(self, [obj], mock=mock, retrieved_at=retrieved_at, source_files=source_files)
