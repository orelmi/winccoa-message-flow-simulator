#!/usr/bin/env python3
"""Build script: assembles src/ files into a single self-contained HTML."""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT = ROOT / "winccoa-message-flow.html"
PROJECT_ROOT = ROOT.parent

# Logo path
LOGO_PATH = ROOT / "assets" / "logo_VisuelConcept_couleurs.png"

# Core JS files in load order
CORE_FILES = [
    "core/i18n.js",
    "core/managers.js",
    "core/state.js",
    "core/renderer.js",
    "core/engine.js",
    "core/ui.js",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def logo_base64() -> str:
    """Encode logo as base64 data URI."""
    if not LOGO_PATH.exists():
        print(f"  Warning: logo not found at {LOGO_PATH}, keeping relative path")
        return ""
    data = LOGO_PATH.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:image/png;base64,{b64}"


def collect_app_js() -> str:
    """Concatenate core files then scenario files into a single JS string."""
    parts = []

    # Core files (fixed order)
    for relpath in CORE_FILES:
        path = SRC / relpath
        if not path.exists():
            print(f"  ERROR: core file not found: {path}")
            sys.exit(1)
        parts.append(f"// === {relpath} ===")
        parts.append(read_text(path))

    # Scenario files (alphabetical order)
    scenarios_dir = SRC / "scenarios"
    if scenarios_dir.exists():
        scenario_files = sorted(scenarios_dir.glob("*.js"))
        for path in scenario_files:
            relpath = path.relative_to(SRC)
            parts.append(f"// === {relpath} ===")
            parts.append(read_text(path))

    return "\n".join(parts)


def build():
    print("Building winccoa-message-flow.html ...")

    html = read_text(SRC / "index.html")
    css = read_text(SRC / "style.css")
    app_js = collect_app_js()

    # Optional: 3D renderer
    renderer3d_path = SRC / "renderer3d.js"
    renderer3d_js = read_text(renderer3d_path) if renderer3d_path.exists() else ""

    # 1. Inline CSS: replace <!-- __CSS__ --> + <link> with <style>
    css_pattern = r"<!-- __CSS__ -->\s*\n\s*<link[^>]*>"
    html = re.sub(css_pattern, lambda _: f"<style>\n{css}\n</style>", html)

    # 2. Inline app.js: replace <!-- __JS_APP__ --> + <script src="app.js">
    js_app_pattern = r"<!-- __JS_APP__ -->\s*\n\s*<script[^>]*app\.js[^>]*></script>"
    html = re.sub(js_app_pattern, lambda _: f"<script>\n{app_js}\n</script>", html)

    # 3. Inline renderer3d.js: replace <!-- __JS_3D__ --> + <script src="renderer3d.js">
    js_3d_pattern = r"<!-- __JS_3D__ -->\s*\n\s*<script[^>]*renderer3d\.js[^>]*></script>"
    if renderer3d_js:
        html = re.sub(js_3d_pattern, lambda _: f"<script>\n{renderer3d_js}\n</script>", html)
    else:
        html = re.sub(js_3d_pattern, "<!-- 3D renderer not yet available -->", html)

    # 4. Embed logo as base64
    b64 = logo_base64()
    if b64:
        html = html.replace(
            '../assets/logo_VisuelConcept_couleurs.png',
            b64
        )

    # Write output
    OUTPUT.write_text(html, encoding="utf-8")
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"  Output: {OUTPUT.name} ({size_kb:.0f} KB)")

    # GitHub Pages: copy to docs/index.html
    DOCS = ROOT / "docs"
    DOCS.mkdir(exist_ok=True)
    docs_output = DOCS / "index.html"
    docs_output.write_text(html, encoding="utf-8")
    print(f"  GitHub Pages: {docs_output.relative_to(ROOT)}")

    print("  Done.")


if __name__ == "__main__":
    build()
