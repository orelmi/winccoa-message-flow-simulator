#!/usr/bin/env python3
"""Build script for mobile version: assembles src/ files into mobile.html."""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT = ROOT / "mobile.html"

LOGO_PATH = ROOT / "assets" / "logo_VisuelConcept_couleurs.png"

# Core JS files in load order (no ui.js — replaced by mobile-specific files)
CORE_FILES = [
    "core/i18n.js",
    "core/managers.js",
    "core/state.js",
    "core/renderer.js",
    "core/engine.js",
]

# Mobile-specific JS files (loaded after scenarios)
MOBILE_FILES = [
    "mobile-viewport.js",
    "mobile-ui.js",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def logo_base64() -> str:
    if not LOGO_PATH.exists():
        print(f"  Warning: logo not found at {LOGO_PATH}")
        return ""
    data = LOGO_PATH.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:image/png;base64,{b64}"


def collect_app_js() -> str:
    """Concatenate core + scenarios + mobile JS into a single string."""
    parts = []

    # Core files
    for relpath in CORE_FILES:
        path = SRC / relpath
        if not path.exists():
            print(f"  ERROR: core file not found: {path}")
            sys.exit(1)
        parts.append(f"// === {relpath} ===")
        parts.append(read_text(path))

    # Scenario files (alphabetical)
    scenarios_dir = SRC / "scenarios"
    if scenarios_dir.exists():
        for path in sorted(scenarios_dir.glob("*.js")):
            relpath = path.relative_to(SRC)
            parts.append(f"// === {relpath} ===")
            parts.append(read_text(path))

    # Mobile-specific files (must load after scenarios)
    for relpath in MOBILE_FILES:
        path = SRC / relpath
        if not path.exists():
            print(f"  ERROR: mobile file not found: {path}")
            sys.exit(1)
        parts.append(f"// === {relpath} ===")
        parts.append(read_text(path))

    return "\n".join(parts)


def build():
    print("Building mobile.html ...")

    html = read_text(SRC / "mobile.html")
    css = read_text(SRC / "mobile.css")
    app_js = collect_app_js()

    # 1. Inline CSS
    css_pattern = r"<!-- __CSS__ -->\s*\n\s*<link[^>]*>"
    html = re.sub(css_pattern, lambda _: f"<style>\n{css}\n</style>", html)

    # 2. Inline app.js (core + scenarios)
    js_app_pattern = r"<!-- __JS_APP__ -->\s*\n\s*<script[^>]*app\.js[^>]*></script>"
    html = re.sub(js_app_pattern, lambda _: f"<script>\n{app_js}\n</script>", html)

    # 3. Remove mobile-viewport.js and mobile-ui.js script tags (already inlined via app_js)
    js_mobile_pattern = r"<!-- __JS_MOBILE__ -->\s*\n\s*<script[^>]*mobile-viewport\.js[^>]*></script>\s*\n\s*<script[^>]*mobile-ui\.js[^>]*></script>"
    html = re.sub(js_mobile_pattern, "", html)

    # 4. Embed logo as base64
    b64 = logo_base64()
    if b64:
        html = html.replace("../assets/logo_VisuelConcept_couleurs.png", b64)

    # Write output
    OUTPUT.write_text(html, encoding="utf-8")
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"  Output: {OUTPUT.name} ({size_kb:.0f} KB)")

    # GitHub Pages
    DOCS = ROOT / "docs"
    DOCS.mkdir(exist_ok=True)
    docs_output = DOCS / "mobile.html"
    docs_output.write_text(html, encoding="utf-8")
    print(f"  GitHub Pages: {docs_output.relative_to(ROOT)}")

    print("  Done.")


if __name__ == "__main__":
    build()
