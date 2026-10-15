"""The committed config templates must stay loadable.

Settings rejects unknown keys, so a .env copied from .env.example with a key
Settings does not declare fails at boot. This keeps the two in step.
"""

from pathlib import Path

from dotenv import dotenv_values

from app.core.config import Settings

ROOT = Path(__file__).resolve().parents[1]


def test_env_example_keys_are_all_declared_settings():
    keys = {k for k in dotenv_values(ROOT / ".env.example")}
    declared = {name.upper() for name in Settings.model_fields}
    assert keys - declared == set()


def test_env_example_loads_in_development():
    values = {k: v for k, v in dotenv_values(ROOT / ".env.example").items() if v is not None}
    values["SECRET_KEY"] = "x" * 64
    s = Settings(_env_file=None, **values)
    assert s.PAYWALL_ENABLED is False and s.PURCHASES_ENABLED is False


def test_render_blueprint_env_keys_are_declared_settings():
    import yaml

    blueprint = yaml.safe_load((ROOT / "render.yaml").read_text(encoding="utf-8"))
    keys = {e["key"] for s in blueprint["services"] for e in s.get("envVars", [])}
    declared = {name.upper() for name in Settings.model_fields}
    assert keys - declared == set()
    env = {e["key"]: e.get("value") for s in blueprint["services"] for e in s["envVars"]}
    assert env["ENV"] == "production"
    assert env["PAYWALL_ENABLED"] == "false" and env["PURCHASES_ENABLED"] == "false"
