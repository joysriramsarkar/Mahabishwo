import sys
from pathlib import Path

COSMOS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COSMOS / "engine" / "reference-python" / "src"))
sys.path.insert(0, str(COSMOS / "services" / "api"))
sys.path.insert(0, str(COSMOS))
