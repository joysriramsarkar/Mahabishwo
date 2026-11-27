"""Executable detection and typed capabilities for external production solvers.

No external solver is executed or claimed available merely because this module
is installed.  Each adapter exposes a command template and a safe, injectable
``--version`` probe; missing executables produce ``UNAVAILABLE`` and an
``invoke`` call always raises ``SolverUnavailable``.  A real adapter must also
implement the actual run contract (generated inputs/outputs and scientific
validation), which is separate from executable detection.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
import os
from pathlib import Path
import shutil
import subprocess
from typing import Iterable, Mapping, Sequence


UNAVAILABLE = "UNAVAILABLE"


class SolverUnavailable(RuntimeError):
    """Raised instead of fabricating an output when an external solver is absent."""


@dataclass(frozen=True)
class SolverStatus:
    name: str
    status: str
    role: str
    executable: str | None
    detection: str
    reason: str | None = None
    version: str | None = None

    @property
    def available(self) -> bool:
        return self.status == "AVAILABLE"

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class SolverAdapter:
    """Executable detection and invocation contract for one production solver.

    ``executable`` may be an absolute path or a command on PATH.  Candidate
    names allow common installation layouts without pretending they are all
    required.  ``version_args`` and ``run_args`` are command-line *templates*;
    {input} and {output} in run_args are replaced by the supplied paths.
    """

    name: str
    role: str
    executables: Sequence[str]
    run_args: tuple[str, ...] = ()
    version_args: tuple[str, ...] = ("--version",)
    env: Mapping[str, str] = field(default_factory=dict)
    notes: str = ""

    def resolve_executable(self, search_paths: Iterable[str | os.PathLike] | None = None,
                           environ: Mapping[str, str] | None = None) -> str | None:
        """Resolve the first executable, using Windows PATHEXT as well as PATH."""
        environ = os.environ if environ is None else environ
        candidates: list[Path] = []
        for root in search_paths or ():
            candidates.append(Path(root))
        for name in self.executables:
            path = Path(name).expanduser()
            if path.is_absolute() or path.parent != Path("."):
                if path.is_file():
                    return str(path.resolve())
                continue
            found = shutil.which(name, path=environ.get("PATH")) if environ.get("PATH") else None
            if found:
                return found
            # PATH lookup is enough on POSIX; explicit Windows suffix checks
            # make the probe deterministic in a stripped-down test environment.
            if os.name == "nt":
                extensions = environ.get("PATHEXT", ".COM;.EXE;.BAT;.CMD").split(";")
                roots = [Path(p) for p in environ.get("PATH", "").split(os.pathsep) if p]
                roots.extend(candidates)
                for root in roots:
                    for suffix in extensions:
                        candidate = root / (name + suffix)
                        if candidate.is_file():
                            return str(candidate.resolve())
        return None

    def detect(self, *, search_paths: Iterable[str | os.PathLike] | None = None,
               environ: Mapping[str, str] | None = None,
               version_probe: bool = True,
               timeout: float = 10.0) -> SolverStatus:
        """Return AVAILABLE only if an executable exists and its probe exits 0.

        A probe failure is still an *executable found* detection, not proof of
        a scientific integration.  ``status`` intentionally does not mean
        phase-5/7 validation passed; the ``role`` and ``notes`` retain that
        distinction.
        """
        executable = self.resolve_executable(search_paths=search_paths, environ=environ)
        if executable is None:
            return SolverStatus(self.name, UNAVAILABLE, self.role, None,
                                "no candidate executable on configured search paths",
                                f"{self.name} executable not found; no run or pass claimed")
        version = None
        if version_probe:
            try:
                completed = subprocess.run([executable, *self.version_args], capture_output=True,
                                           text=True, timeout=timeout, check=False,
                                           env=dict(os.environ if environ is None else environ))
            except (OSError, subprocess.TimeoutExpired) as exc:
                return SolverStatus(self.name, UNAVAILABLE, self.role, executable,
                                    "executable version probe failed", str(exc))
            if completed.returncode != 0:
                return SolverStatus(self.name, UNAVAILABLE, self.role, executable,
                                    f"version probe exited {completed.returncode}",
                                    completed.stderr.strip() or completed.stdout.strip())
            output = (completed.stdout or completed.stderr).strip()
            version = output.splitlines()[0] if output else "version probe succeeded (no output)"
        return SolverStatus(self.name, "AVAILABLE", self.role, executable,
                            "executable found" + (" and version probe succeeded" if version_probe else ""),
                            version=version)

    def command(self, input_path: str | os.PathLike, output_path: str | os.PathLike,
                *, executable: str | None = None) -> list[str]:
        """Render an explicit run command; templates do not imply compatibility."""
        executable = executable or self.resolve_executable()
        if executable is None:
            raise SolverUnavailable(f"{self.name} is {UNAVAILABLE}; no command can be built")
        return [executable, *(str(arg).format(input=str(input_path), output=str(output_path))
                              for arg in self.run_args)]

    def invoke(self, input_path: str | os.PathLike, output_path: str | os.PathLike, *,
               extra_args: Sequence[str] = (), timeout: float | None = None) -> SolverStatus:
        """Execute a solver command, returning explicit failure on nonzero exit.

        The adapter deliberately requires ``run_args``.  The shipped templates
        are placeholders for project-specific generated inputs, so the default
        invocation reports UNAVAILABLE rather than pretending a bare executable
        is a usable integration.  A validated integration can subclass/provide
        the concrete command template.
        """
        if not self.run_args:
            return SolverStatus(self.name, UNAVAILABLE, self.role, self.resolve_executable(),
                                "executable detection only; no validated run command template",
                                f"{self.name} execution adapter is not implemented")
        executable = self.resolve_executable()
        if executable is None:
            return SolverStatus(self.name, UNAVAILABLE, self.role, None,
                                "executable not found", f"{self.name} is {UNAVAILABLE}")
        try:
            completed = subprocess.run(self.command(input_path, output_path, executable=executable)
                                       + list(extra_args), capture_output=True, text=True,
                                       timeout=timeout, check=False,
                                       env={**os.environ, **self.env})
        except (OSError, subprocess.TimeoutExpired) as exc:
            return SolverStatus(self.name, "FAILED", self.role, executable,
                                "solver invocation failed", str(exc))
        if completed.returncode != 0:
            return SolverStatus(self.name, "FAILED", self.role, executable,
                                f"solver exited {completed.returncode}",
                                completed.stderr.strip() or completed.stdout.strip())
        return SolverStatus(self.name, "COMPLETED", self.role, executable,
                            "process completed; scientific output validation still required",
                            version=(completed.stdout or completed.stderr).strip()[:500] or None)


_SOLVERS = {
    "CLASS": SolverAdapter("CLASS", "Boltzmann transfer / CMB", ("class", "class.exe")),
    "CAMB": SolverAdapter("CAMB", "alternative Boltzmann transfer", ("camb", "camb.exe")),
    "MUSIC": SolverAdapter("MUSIC", "Gaussian initial conditions", ("MUSIC", "music", "music.exe")),
    "COLA": SolverAdapter("COLA", "perturbed-particle gravity", ("cola", "cola.exe")),
    "FASTPM": SolverAdapter("FASTPM", "fast particle-mesh gravity", ("fastpm", "fastpm.exe")),
    "GADGET": SolverAdapter("GADGET", "TreePM / gravity", ("Gadget2", "Gadget4", "gadget.exe")),
    "AREPO": SolverAdapter("AREPO", "moving-mesh hydro/MHD", ("Arepo", "arepo.exe")),
    "GIZMO": SolverAdapter("GIZMO", "meshless hydro/MHD", ("GIZMO", "gizmo.exe")),
    "ROCKSTAR": SolverAdapter("ROCKSTAR", "halo finding", ("rockstar", "rockstar.exe")),
    "BORG": SolverAdapter("BORG", "constrained cosmic reconstruction", ("borg", "borg.exe")),
}
SUPPORTED_SOLVERS = tuple(_SOLVERS)


def get_adapter(name: str) -> SolverAdapter:
    try:
        return _SOLVERS[name.upper()]
    except KeyError:
        raise ValueError(f"unknown solver {name!r}; supported: {SUPPORTED_SOLVERS}") from None


def detect_solver(name: str, **kwargs) -> SolverStatus:
    return get_adapter(name).detect(**kwargs)


def detect_all_solvers(**kwargs) -> dict[str, dict]:
    """JSON-safe report.  Detection is not a scientific pass/fail decision."""
    return {name: get_adapter(name).detect(**kwargs).as_dict()
            for name in SUPPORTED_SOLVERS}


def unavailable_gates() -> dict[str, str]:
    """Explicitly name the gates executable detection cannot satisfy."""
    return {
        "phase_5_power_spectrum": UNAVAILABLE,
        "phase_5_hmf": UNAVAILABLE,
        "phase_5_cola_vs_full_nbody": UNAVAILABLE,
        "phase_5_resolution_convergence_2_4_8": UNAVAILABLE,
        "phase_7_hydrodynamics": UNAVAILABLE,
        "phase_7_subgrid": UNAVAILABLE,
        "phase_7_borg_constraints": UNAVAILABLE,
        "phase_7_astrophysical_reproduction": UNAVAILABLE,
    }
