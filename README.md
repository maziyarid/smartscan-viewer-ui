# SmartScan Viewer UI

Viewer UI files for the SmartScan patient imaging viewer (`wwwroot`) plus the compiled Gallery assembly, extracted from the live SmartScan deployment on 2026-11-22.

Contents:
- `wwwroot/` — viewer JavaScript (including smartscan-viewer.js v2.3.1, the Cornerstone image viewer, and bootstrap.js), CSS, fonts, and toolbar images.
- `Gallery.dll` / `Gallery.pdb` — compiled viewer assembly and symbols.

Notes:
- Patient X-ray images were removed before publishing; this repository contains UI assets only, no patient data.
- The live viewer serves patient images from opg.smarteb.ir (see bootstrap.js).
