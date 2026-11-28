"""Build bootstrap.js with the UX fix: python3 make_bootstrap.py IN OUT ADDON"""
import sys
src, out, addon = sys.argv[1:4]
t = open(src, encoding="utf-8").read()
OLD = "        if (el.tagName && el.tagName.toLowerCase() === 'img') { return; }\n"
NEW = OLD + ("        // 2026-11-28: the viewer owns pinch and pan on its stage (UX fix v1.0.0)\n"
             "        if (el.id === 'preview-container') {\n"
             "            if (el.style.getPropertyValue('touch-action') !== 'none' ||\n"
             "                el.style.getPropertyPriority('touch-action') !== 'important') {\n"
             "                el.style.setProperty('touch-action', 'none', 'important');\n"
             "            }\n"
             "            return;\n"
             "        }\n")
assert t.count(OLD) == 1, t.count(OLD)
assert "UX fix v1.0.0" not in t
t = t.replace(OLD, NEW)
a = open(addon, encoding="utf-8").read()
assert all(ord(c) < 128 for c in a), "addon must be ASCII"
t = t.rstrip("\n") + "\n" + a
open(out, "w", encoding="utf-8", newline="").write(t)
print(len(t))
