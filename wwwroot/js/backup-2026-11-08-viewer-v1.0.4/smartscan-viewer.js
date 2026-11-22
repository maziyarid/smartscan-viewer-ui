/*!
 * smartscan-viewer.js  v1.0.3
 * SmartScan dental-image viewer.
 *
 * Replaces the inline viewer script that used to be rendered inside the
 * NewPatientProfileForm component. No dependencies, no CDN.
 *
 * WHY THIS FILE EXISTS (mapped to the five reported bugs)
 *   1. Pinch / touch / pan     - the old code only listened for `wheel`.
 *   2. Zoom-out button         - the old button shipped with id="" so nothing
 *                                was ever bound to it.
 *   3. Three `let scale` copies - now exactly ONE state object owns the
 *                                transform.
 *   4. rotate/flip vs zoom     - one composed transform string; filters live in
 *                                style.filter and never touch the transform.
 *   5. viewer.min.js           - nothing here needs Viewer.js; pure DOM + CSS.
 *
 * v1.0.1 fixes two regressions found in review of v1.0.0:
 *   R1 - the brightness/contrast sliders were inert: the applyFilters()
 *        bridge only re-applied the EXISTING filter state and never read the
 *        input values, so moving a slider changed nothing.
 *   R2 - a horizontal flip pushed the image off screen: _constrain() assumed
 *        an un-mirrored, un-rotated box, and flip() never re-constrained.
 *
 * v1.0.2 works with the LIVE v1.0.0 Blazor markup (the v1.0.1 file was never
 * loaded by the live page — no script tag, no [data-viewer-root] — so touch
 * zoom never worked there). Targeted upgrade, not a rewrite:
 *
 * v1.0.3 fixes the REAL live-page failure (found 2026-11-08 after the
 * fresh-browser re-test still failed with v1.0.2 live and byte-perfect):
 * Blazor Server re-renders REPLACE #preview-img with a fresh DOM node after
 * the viewer has initialised. The old instance's listeners stay on the
 * detached node, so pinch is dead on the new node — and nothing re-bound it:
 *   (a) SmartScanViewer.init() cached the instance per stage and, when bound,
 *       only called fit() — never noticing the canvas had been swapped.
 *   (b) the MutationObserver only re-initialised for [data-viewer-root],
 *       which never exists on the live page (it uses the #preview-container
 *       fallback), so a re-render never triggered a re-init at all.
 * Proven locally: pinch 36% -> 131% on the static page, but 36% -> 36% after
 * replacing #preview-img with a clone. The loader race was EXONERATED by a
 * delayed-load probe (pinch still 36% -> 131% when viewer.js arrives 3s late,
 * after window load) — boot() self-initialises correctly. The phone-cache
 * theory was wrong too: the fresh-browser test failed with the files live.
 * v1.0.3: init() drops a stale instance whose canvas is detached or no
 * longer the live img, and the observer re-inits whenever the live img is
 * not the bound canvas.
 *   F1 - fallback root: if no [data-viewer-root] exists, use
 *        #preview-container / #preview-img (marked data-viewer-fallback).
 *   F2 - forced overrides: the legacy window globals (applyFilters,
 *        NewapplyFilters, updatePreview, zoomImage, rotateImage, flipImage,
 *        resetFilters, saveImage, initImageFilterControls) are assigned
 *        UNCONDITIONALLY at load time. The v1.0.1 `||` shims never took
 *        effect because the inline script had already defined them.
 *   F3 - capture-phase wheel on the stage + stopPropagation(), so the old
 *        bubble-phase wheel listener on #preview-img (and the one on the
 *        container) never fires, whichever order the scripts loaded in.
 *   F4 - toolbar mapping by icon class and by `iid` for buttons with no
 *        usable id; #btn-reset maps to a new 'reset-all' action (filters
 *        AND rotate/flip, like the old resetFilters()).
 *   F5 - fallback stage pin: #preview-container has NO CSS height (verified
 *        in the live imageviewer.css — only overflow:hidden / touch-action);
 *        its height comes from the in-flow <img>. _sizeToNatural() takes the
 *        img out of flow (position:absolute), which would collapse the stage
 *        to 0px and clip the image. The stage is pinned to its rendered
 *        height and made the positioning context, at init and on image load.
 *   F6 - invert sync fix: _syncLegacyFilterInputs wrote 1/0 to #invert, but
 *        the live markup uses 0/100, so a later filter sync would silently
 *        turn invert off. Now writes 100/0.
 *
 * Public API (window.SmartScanViewer):
 *   init(root?)        idempotent, safe to call after every Blazor render
 *   dispose(root?)     removes every listener this instance added
 *   config             runtime feature flags (see DEFAULTS below)
 *   state(root?)       read-only snapshot of the transform state
 *   setScale / zoomIn / zoomOut / reset / fit / rotate / flip / setFilter
 */
(function (window, document) {
    'use strict';

    /* ------------------------------------------------------------------ *
     * Configuration. Each polish item can be switched off independently at
     * runtime without redeploying the DLL, e.g. from the browser console:
     *
     *   SmartScanViewer.config.zoomIndicator = false;
     *   SmartScanViewer.init();
     *
     * The defaults keep every feature on.
     * ------------------------------------------------------------------ */
    var DEFAULTS = {
        pinchZoom: true,          // two-finger pinch, zoomed around the midpoint
        pan: true,                // one-finger / mouse drag while zoomed in
        doubleTapZoom: true,      // double-tap / double-click toggles zoom
        wheelZoom: true,          // wheel / trackpad zoom at the cursor
        buttons: true,            // toolbar buttons
        keyboard: true,           // + - 0 R arrows on desktop
        swipeBetweenImages: true, // swipe left/right between images when not zoomed
        zoomIndicator: true,      // the small "100%" badge
        loadingSpinner: true,     // spinner while an image loads
        errorRetry: true,         // Persian error + retry if an image fails
        lazyThumbnails: true,     // loading="lazy" on the thumbnails
        fullscreen: true,         // Fullscreen API with a CSS fallback
        reducedMotion: true,      // honour prefers-reduced-motion
        minScale: 0.5,
        maxScale: 8,
        // A large image on a small phone needs a scale BELOW minScale to fit
        // (a 1200px-wide X-ray in a 390px viewport fits at ~0.30). Without
        // this, "fit" would be impossible on phones and the image would always
        // be cropped. When true, the effective floor becomes
        // min(minScale, fitScale) — the documented 0.5 floor still applies
        // whenever the image can actually fit at or above it.
        allowFitBelowMin: true,
        doubleTapScale: 2.5,
        wheelStep: 0.0015,        // per wheel deltaY unit
        buttonStep: 1.5,          // zoom-in / zoom-out multiplier
        swipeThreshold: 60        // px before a swipe counts
    };

    var CONFIG = {};
    for (var k in DEFAULTS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) { CONFIG[k] = DEFAULTS[k]; }
    }

    var INSTANCES = new WeakMap();   // root element -> instance

    /* ------------------------------------------------------------------ *
     * Small helpers
     * ------------------------------------------------------------------ */
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    function prefersReducedMotion() {
        if (!CONFIG.reducedMotion) { return false; }
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
        catch (e) { return false; }
    }

    function on(el, type, fn, opts) {
        if (!el) { return function () {}; }
        el.addEventListener(type, fn, opts || false);
        return function () { el.removeEventListener(type, fn, opts || false); };
    }

    /* ------------------------------------------------------------------ *
     * Viewer instance
     * ------------------------------------------------------------------ */
    function Viewer(root) {
        this.root = root;
        this.canvas = root.querySelector('[data-viewer-canvas]') || root.querySelector('img');
        this.stage = root;                    // the clipping box
        this.spinner = root.querySelector('[data-viewer-spinner]');
        this.errorBox = root.querySelector('[data-viewer-error]');
        this.zoomBadge = root.querySelector('[data-viewer-zoom-indicator]');
        this.disposers = [];
        this.pointers = new Map();            // pointerId -> {x, y}
        this.pinchStart = null;
        this.panStart = null;
        this.lastTapAt = 0;
        this.lastTapPos = null;
        this.index = 0;
        this.bound = false;

        // ONE source of truth for geometry. Nothing else may write .transform.
        this.state = { scale: 1, x: 0, y: 0, rotate: 0, flipH: 1, flipV: 1 };

        // Filters are a separate channel (style.filter), never the transform.
        this.filters = { brightness: 100, contrast: 100, saturate: 100, invert: 0, grayscale: 0 };
    }

    Viewer.prototype.init = function () {
        if (this.bound) { return this; }      // guard: never bind twice
        var self = this;
        var c = this.canvas;
        if (!c) { return this; }

        // Touch-action only on the canvas, so the rest of the page still scrolls.
        c.style.touchAction = 'none';
        c.style.transformOrigin = '0 0';
        c.style.willChange = 'transform';
        c.style.maxWidth = 'none';
        c.style.cursor = 'grab';
        c.draggable = false;

        // The old markup pinned width:50% / height:80% / margin-top:100px inline,
        // and site.css/bootstrap cap images with `max-width: 100%`. Either one
        // makes the image's LAYOUT box smaller than its natural size, which
        // would break the fit maths (it works in natural pixels). Pin the
        // layout box to the natural size and let the transform do all scaling.
        // v1.0.2 (F5): pin the fallback stage BEFORE the img leaves the flow.
        this._pinFallbackStage();
        this._sizeToNatural();

        this._bindImageLifecycle();

        // Pointer events: mouse, pen and touch share one code path.
        this.disposers.push(on(c, 'pointerdown', function (e) { self._onPointerDown(e); }, { passive: false }));
        this.disposers.push(on(window, 'pointermove', function (e) { self._onPointerMove(e); }, { passive: false }));
        this.disposers.push(on(window, 'pointerup', function (e) { self._onPointerUp(e); }, { passive: true }));
        this.disposers.push(on(window, 'pointercancel', function (e) { self._onPointerUp(e); }, { passive: true }));

        if (CONFIG.wheelZoom) {
            // v1.0.2 (F3): capture phase, so this runs before the old
            // bubble-phase wheel listener on #preview-img (and the one on the
            // container) and stopPropagation() in _onWheel keeps the event
            // from ever reaching them.
            this.disposers.push(on(this.stage, 'wheel', function (e) { self._onWheel(e); }, { passive: false, capture: true }));
        }
        if (CONFIG.buttons) { this._bindToolbar(); }
        this._bindFilterInputs();
        if (CONFIG.keyboard) {
            this.disposers.push(on(document, 'keydown', function (e) { self._onKey(e); }));
        }

        this._bindThumbnails();

        // iOS legacy gesture events: stop the page zooming under the image.
        this.disposers.push(on(document, 'gesturestart', function (e) {
            if (self.stage.contains(e.target)) { e.preventDefault(); }
        }, { passive: false }));

        this.bound = true;
        this.index = this._indexOfInList(c.getAttribute('src'));
        this.fit();
        this._updateZoomBadge();
        return this;
    };

    Viewer.prototype.dispose = function () {
        for (var i = 0; i < this.disposers.length; i++) {
            try { this.disposers[i](); } catch (e) { /* already gone */ }
        }
        this.disposers = [];
        this.pointers.clear();
        this.pinchStart = null;
        this.panStart = null;
        this.bound = false;
        return this;
    };

    /* ------------------------- image lifecycle ------------------------ */
    // v1.0.2 (F5): the fallback root (#preview-container) has no CSS height —
    // its height comes from the in-flow <img>. _sizeToNatural() takes the img
    // out of flow (position:absolute), which would collapse the stage to 0px
    // and clip the image (the container is overflow:hidden). Pin the stage to
    // its current rendered height first, and make it the positioning context
    // for the absolute img. Only applies to the fallback root; the
    // [data-viewer-root] markup has its own CSS height and is left alone.
    // Called at init and again on image load, because the in-flow height is
    // only known once the image has decoded. If the img is already out of
    // flow (e.g. a later image change re-fires load after _sizeToNatural ran),
    // the measured height is ~0 — keep the previous pin instead of collapsing
    // the stage.
    Viewer.prototype._pinFallbackStage = function () {
        if (!this.root.hasAttribute('data-viewer-fallback')) { return; }
        var prev = this.root.style.height;   // the current pin, if any
        // Drop any earlier pin so we measure the in-flow height, not the pin.
        this.root.style.height = '';
        var box = this.root.getBoundingClientRect();
        if (!box.height || box.height < 50) {
            this.root.style.height = prev;   // keep the old pin; do not collapse
            return;
        }
        this.root.style.position = 'relative';
        this.root.style.height = box.height + 'px';
    };

    // Pin the <img> layout box to its natural pixel size. The transform then
    // scales it visually, so the fit maths (which works in natural pixels) and
    // the rendered result agree. Without this, `max-width:100%` from the
    // stylesheet silently shrinks the layout box and the image renders at the
    // wrong size and off-centre.
    Viewer.prototype._sizeToNatural = function () {
        var c = this.canvas;
        if (!c) { return; }
        var w = c.naturalWidth, h = c.naturalHeight;
        if (!w || !h) { return; }          // not decoded yet; the load handler retries
        // Take the canvas OUT of flow first: a 1200px-wide layout box would
        // otherwise stretch its parent (the stage) and the fit maths would then
        // measure the wrong box. Absolute positioning inside the relatively
        // positioned stage keeps the stage's size purely CSS-driven.
        c.style.position = 'absolute';
        c.style.top = '0';
        c.style.left = '0';
        c.style.margin = '0';
        // The shipped stylesheet contains `#preview-img { width: 100% !important }`
        // (imageviewer.css, max-width 460px) and `max-width: 100%` from
        // bootstrap. A plain inline style LOSES to `!important`, so the layout
        // box would stay viewport-sized and the image would render at the wrong
        // size and off-centre. An inline `!important` outranks any author
        // stylesheet `!important`, which is exactly what is needed here.
        c.style.setProperty('width', w + 'px', 'important');
        c.style.setProperty('height', h + 'px', 'important');
        c.style.setProperty('max-width', 'none', 'important');
        c.style.setProperty('max-height', 'none', 'important');
    };

    Viewer.prototype._bindImageLifecycle = function () {
        var self = this;
        var c = this.canvas;

        function hideSpinner() {
            if (!self.spinner) { return; }
            self.spinner.setAttribute('hidden', '');
            self.spinner.setAttribute('aria-hidden', 'true');
        }

        this.disposers.push(on(c, 'load', function () {
            hideSpinner();
            if (self.errorBox) { self.errorBox.setAttribute('hidden', ''); }
            self._pinFallbackStage();         // v1.0.2 (F5): re-pin now the in-flow height is known
            self._sizeToNatural();            // the natural size is known now
            self.fit();                       // a new image re-fits; filters survive
        }));
        this.disposers.push(on(c, 'error', function () {
            hideSpinner();
            if (!CONFIG.errorRetry) { return; }
            if (self.errorBox) { self.errorBox.removeAttribute('hidden'); }
        }));

        if (c.complete && c.naturalWidth) {
            hideSpinner();
        } else if (this.spinner && CONFIG.loadingSpinner) {
            this.spinner.removeAttribute('hidden');
            this.spinner.removeAttribute('aria-hidden');
        }
    };

    /* ----------------------------- toolbar ---------------------------- */
    Viewer.prototype._bindToolbar = function () {
        var self = this;

        // One delegated listener for the whole document: no per-button
        // handlers, so re-initialising can never stack duplicates.
        this.disposers.push(on(document, 'click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-viewer-action]') : null;
            if (!btn) { return; }
            e.preventDefault();
            self._runAction(btn.getAttribute('data-viewer-action'));
        }));

        // The old markup shipped bare ids and one `iid="right"` typo. Map them
        // onto the action vocabulary so a rolling deploy cannot lose a button.
        // v1.0.2: 'btn-reset' maps to 'reset-all' (filters AND rotate/flip,
        // like the old resetFilters()), not 'reset-filters'.
        var legacy = {
            'btn-zoomIn': 'zoom-in',
            'btn-zoomOut': 'zoom-out',
            'btn-reset': 'reset-all',
            'reset-contrast': 'invert',
            'left': 'rotate-left',
            'right': 'rotate-right',
            'horizontal': 'flip-horizontal',
            'btn-eraser': 'flip-vertical',
            'btn-fit': 'fit',
            'btn-fullscreen': 'fullscreen'
        };
        Object.keys(legacy).forEach(function (id) {
            var el = document.getElementById(id);
            if (el && !el.getAttribute('data-viewer-action')) {
                el.setAttribute('data-viewer-action', legacy[id]);
            }
        });

        // v1.0.2 (F4): the v1.0.0 markup has buttons with no usable id — one
        // with id="" (zoom-out), one with no id at all (save) — and one whose
        // id is spelled `iid` (rotate-right). Map those by the <i> icon class
        // inside the button, then by the `iid` attribute. Buttons that already
        // got an action from the id map above are skipped.
        var iconActions = {
            'bx-zoom-out': 'zoom-out',
            'bx-zoom-in': 'zoom-in',
            'bx-save': 'save',
            'bx-adjust': 'invert',
            'fa-rotate-left': 'rotate-left',
            'fa-rotate-right': 'rotate-right',
            'bx-reflect-vertical': 'flip-horizontal',
            'bx-reflect-horizontal': 'flip-vertical',
            'bx-reset': 'reset-all'
        };
        var iidActions = { 'right': 'rotate-right' };
        var toolbarBtns = document.querySelectorAll('.tools-container button');
        if (!toolbarBtns.length) { toolbarBtns = document.querySelectorAll('button'); }
        for (var bi = 0; bi < toolbarBtns.length; bi++) {
            var b = toolbarBtns[bi];
            if (b.getAttribute('data-viewer-action')) { continue; }
            var act = null;
            var icon = b.querySelector('i');
            if (icon && icon.className) {
                var cls = icon.className.split(/\s+/);
                for (var ci = 0; ci < cls.length; ci++) {
                    if (iconActions[cls[ci]]) { act = iconActions[cls[ci]]; break; }
                }
            }
            if (!act) {
                var iid = b.getAttribute('iid');
                if (iid && iidActions[iid]) { act = iidActions[iid]; }
            }
            if (act) { b.setAttribute('data-viewer-action', act); }
        }
    };

    Viewer.prototype._runAction = function (action) {
        switch (action) {
            case 'zoom-in': this.zoomIn(); break;
            case 'zoom-out': this.zoomOut(); break;
            case 'reset': this.reset(); break;
            // v1.0.2 (F4): the old resetFilters() reset filters AND rotate/flip.
            case 'reset-all': this.resetFilters(); this.reset(); break;
            case 'fit': this.fit(); break;
            case 'rotate-left': this.rotate(-90); break;
            case 'rotate-right': this.rotate(90); break;
            case 'flip-horizontal': this.flip('h'); break;
            case 'flip-vertical': this.flip('v'); break;
            case 'invert': this.toggleInvert(); break;
            case 'reset-filters': this.resetFilters(); break;
            case 'save': this.save(); break;
            case 'print': this.print(); break;
            case 'fullscreen': this.toggleFullscreen(); break;
            case 'retry': this.retry(); break;
            case 'next': this.step(1); break;
            case 'prev': this.step(-1); break;
            default: break;
        }
    };

    /* --------------------------- transform ---------------------------- */
    // The ONLY place a transform string is produced (bug 3 + bug 4).
    Viewer.prototype._apply = function () {
        var s = this.state;
        this.canvas.style.transform =
            'translate(' + s.x + 'px,' + s.y + 'px)' +
            ' rotate(' + s.rotate + 'deg)' +
            ' scale(' + (s.scale * s.flipH) + ',' + (s.scale * s.flipV) + ')';
        this._updateZoomBadge();
    };

    // Filters are independent of the transform — this is the bug-4 fix.
    Viewer.prototype._applyFilter = function () {
        var f = this.filters;
        this.canvas.style.filter =
            'brightness(' + f.brightness + '%) ' +
            'contrast(' + f.contrast + '%) ' +
            'saturate(' + f.saturate + '%) ' +
            'invert(' + f.invert + '%) ' +
            'grayscale(' + f.grayscale + '%)';
    };

    Viewer.prototype._updateZoomBadge = function () {
        if (!this.zoomBadge || !CONFIG.zoomIndicator) { return; }
        this.zoomBadge.textContent = Math.round(this.state.scale * 100) + '%';
    };

    /* ----------------------------- fitting ---------------------------- */
    Viewer.prototype._metrics = function () {
        var c = this.canvas, st = this.stage;
        var natW = (c && (c.naturalWidth || c.width)) || 1;
        var natH = (c && (c.naturalHeight || c.height)) || 1;
        var box = st.getBoundingClientRect();
        return {
            natW: natW,
            natH: natH,
            w: box.width || st.clientWidth || natW,
            h: box.height || st.clientHeight || natH
        };
    };

    Viewer.prototype.fitScale = function () {
        var m = this._metrics();
        var pad = 32;
        var r = Math.min((m.w - pad) / m.natW, (m.h - pad) / m.natH);
        return (isFinite(r) && r > 0) ? r : 1;
    };

    // "Zoomed" means zoomed BEYOND the fit scale — not merely above minScale.
    // A large desktop viewport can fit an image at 0.76, which is well above
    // minScale (0.5) yet still un-zoomed; gating on minScale would then block
    // double-tap and swipe on exactly those screens.
    Viewer.prototype._isZoomed = function () {
        return this.state.scale > this.fitScale() * 1.02;
    };

    // The effective lower bound for the scale. Normally CONFIG.minScale, but
    // never above the fit ratio when allowFitBelowMin is on (see DEFAULTS).
    Viewer.prototype._minAllowed = function () {
        if (!CONFIG.allowFitBelowMin) { return CONFIG.minScale; }
        return Math.min(CONFIG.minScale, this.fitScale());
    };

    Viewer.prototype.fit = function () {
        if (!this.canvas || !this.stage) { return this; }
        var m = this._metrics();
        var s = clamp(this.fitScale(), this._minAllowed(), CONFIG.maxScale);
        this.state.scale = s;
        // Let _constrain() place it: it accounts for any rotation / mirror
        // already applied, which a plain (m.w - natW*s)/2 would not.
        this._constrain();
        this._apply();
        return this;
    };

    Viewer.prototype.reset = function () {
        this.state.rotate = 0;
        this.state.flipH = 1;
        this.state.flipV = 1;
        this.fit();
        return this;
    };

    /* ------------------------------ zoom ------------------------------ */
    // Zoom about a point in client coordinates (pinch midpoint, cursor, or
    // the stage centre for the buttons).
    Viewer.prototype.zoomAt = function (factor, clientX, clientY) {
        if (!this.canvas || !this.stage) { return this; }

        var box = this.stage.getBoundingClientRect();
        var px = (clientX == null) ? box.left + box.width / 2 : clientX;
        var py = (clientY == null) ? box.top + box.height / 2 : clientY;
        var lx = px - box.left;
        var ly = py - box.top;

        var oldScale = this.state.scale;
        var newScale = clamp(oldScale * factor, this._minAllowed(), CONFIG.maxScale);
        if (Math.abs(newScale - oldScale) < 1e-6) { return this; }

        // Keep the point under the finger/cursor fixed: local = x + k * p
        var k = newScale / oldScale;
        this.state.x = lx - k * (lx - this.state.x);
        this.state.y = ly - k * (ly - this.state.y);
        this.state.scale = newScale;

        this._constrain();
        this._apply();
        return this;
    };

    Viewer.prototype.zoomIn = function () { return this.zoomAt(CONFIG.buttonStep, null, null); };
    Viewer.prototype.zoomOut = function () { return this.zoomAt(1 / CONFIG.buttonStep, null, null); };

    Viewer.prototype.setScale = function (v) {
        var target = clamp(v, CONFIG.minScale, CONFIG.maxScale);
        return this.zoomAt(target / this.state.scale, null, null);
    };

    // Keep the image from being dragged entirely out of its box.
    //
    // The transform is `translate(x,y) rotate(r) scale(s*fh, s*fv)` with
    // transform-origin 0 0, so the rendered box is NOT simply [x, x+w]: a
    // mirror (fh = -1) makes the image extend to the LEFT of x, and a rotation
    // mixes the axes. The old code assumed the un-mirrored, un-rotated box, so
    // after a flip it centred on a box that no longer existed and pushed the
    // image off screen. Compute the real rendered bounding box instead.
    Viewer.prototype._constrain = function () {
        var m = this._metrics();
        var s = this.state;
        var rad = s.rotate * Math.PI / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);

        // Signed scale factors, exactly as _apply() writes them.
        var sx = s.scale * s.flipH;
        var sy = s.scale * s.flipV;

        // The four local corners (0,0) (natW,0) (natW,natH) (0,natH) map to
        // u = A*px + B*py, v = C*px + D*py. The extremes are the sums of the
        // per-axis extremes, which avoids enumerating the corners.
        var A = cos * sx, B = -sin * sy;
        var C = sin * sx, D = cos * sy;

        var uMin = Math.min(0, A * m.natW) + Math.min(0, B * m.natH);
        var uMax = Math.max(0, A * m.natW) + Math.max(0, B * m.natH);
        var vMin = Math.min(0, C * m.natW) + Math.min(0, D * m.natH);
        var vMax = Math.max(0, C * m.natW) + Math.max(0, D * m.natH);

        var boxW = uMax - uMin;
        var boxH = vMax - vMin;

        // Centre when the image fits; otherwise clamp so it still covers the
        // stage and can never be dragged fully out of view.
        if (boxW <= m.w) { s.x = (m.w - boxW) / 2 - uMin; }
        else { s.x = clamp(s.x, m.w - uMax, -uMin); }

        if (boxH <= m.h) { s.y = (m.h - boxH) / 2 - vMin; }
        else { s.y = clamp(s.y, m.h - vMax, -vMin); }
    };

    /* ---------------------------- rotation ---------------------------- */
    Viewer.prototype.rotate = function (deg) {
        // Rotation must NOT reset the zoom (the old code did).
        this.state.rotate = ((this.state.rotate + deg) % 360 + 360) % 360;
        this._constrain();
        this._apply();
        return this;
    };

    Viewer.prototype.flip = function (axis) {
        if (axis === 'h') { this.state.flipH *= -1; }
        else { this.state.flipV *= -1; }
        // Mirroring changes the rendered footprint, so re-centre / re-clamp
        // exactly as rotate() does. Without this the image kept the offset it
        // had before the mirror and ended up mostly outside the stage.
        this._constrain();
        this._apply();
        return this;
    };

    /* ----------------------------- filters ---------------------------- */
    Viewer.prototype.setFilter = function (name, value) {
        if (!Object.prototype.hasOwnProperty.call(this.filters, name)) { return this; }
        var n = Number(value);
        this.filters[name] = isFinite(n) ? n : value;
        this._applyFilter();
        return this;
    };

    // Read the two range inputs the old markup ships with and push their
    // values into the filter state. This is what the inline
    // `onchange="applyFilters()"` handler on #brightness / #contrast needs:
    // the previous bridge only re-applied the EXISTING state, so moving a
    // slider changed nothing on screen.
    Viewer.prototype.syncFiltersFromInputs = function () {
        var b = document.getElementById('brightness');
        var ct = document.getElementById('contrast');
        var inv = document.getElementById('invert');
        if (b && b.value !== '') { this.setFilter('brightness', b.value); }
        if (ct && ct.value !== '') { this.setFilter('contrast', ct.value); }
        if (inv && inv.value !== '') { this.setFilter('invert', inv.value); }
        return this;
    };

    // Live wiring for the sliders. `input` fires while dragging, `change` on
    // release; both are bound so the preview tracks the handle either way.
    Viewer.prototype._bindFilterInputs = function () {
        var self = this;
        ['brightness', 'contrast', 'invert'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) { return; }
            var handler = function () { self.syncFiltersFromInputs(); };
            self.disposers.push(on(el, 'input', handler));
            self.disposers.push(on(el, 'change', handler));
        });

        // The reset links in the OLD markup carry no handler of their own, so
        // bind them here. In the NEW markup `reset-contrast` is the invert
        // toggle and already carries data-viewer-action, so skip anything the
        // delegated toolbar listener owns — otherwise one click would both
        // toggle invert and reset contrast.
        var rb = document.getElementById('reset-brightness');
        if (rb && !rb.getAttribute('data-viewer-action')) {
            self.disposers.push(on(rb, 'click', function (e) {
                e.preventDefault();
                self.setFilter('brightness', 100);
                self._syncLegacyFilterInputs();
            }));
        }
        var rc = document.getElementById('reset-contrast');
        if (rc && !rc.getAttribute('data-viewer-action')) {
            self.disposers.push(on(rc, 'click', function (e) {
                e.preventDefault();
                self.setFilter('contrast', 100);
                self._syncLegacyFilterInputs();
            }));
        }
    };

    Viewer.prototype.toggleInvert = function () {
        this.filters.invert = this.filters.invert ? 0 : 100;
        this._applyFilter();
        this._syncLegacyFilterInputs();
        return this;
    };

    Viewer.prototype.resetFilters = function () {
        this.filters = { brightness: 100, contrast: 100, saturate: 100, invert: 0, grayscale: 0 };
        this._applyFilter();
        this._syncLegacyFilterInputs();
        return this;
    };

    // Keep the two range inputs the old markup ships with in step with state.
    Viewer.prototype._syncLegacyFilterInputs = function () {
        var b = document.getElementById('brightness');
        var ct = document.getElementById('contrast');
        var inv = document.getElementById('invert');
        if (b) { b.value = this.filters.brightness; }
        if (ct) { ct.value = this.filters.contrast; }
        if (inv) { inv.value = this.filters.invert ? 100 : 0; }   // v1.0.2 (F6): the live markup uses 0/100, not 0/1
    };

    /* --------------------------- pointer input ------------------------ */
    Viewer.prototype._onPointerDown = function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) { return; }
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* older Safari */ }

        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this.pointers.size === 1) {
            this.panStart = {
                id: e.pointerId,
                x: e.clientX, y: e.clientY,
                sx: this.state.x, sy: this.state.y,
                moved: false
            };
            this.canvas.style.cursor = 'grabbing';
        } else if (this.pointers.size === 2 && CONFIG.pinchZoom) {
            // Two fingers: a pinch wins over panning.
            this.panStart = null;
            var pts = Array.from(this.pointers.values());
            this.pinchStart = {
                dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
                scale: this.state.scale,
                mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
            };
        }
        if (e.cancelable) { e.preventDefault(); }
    };

    Viewer.prototype._onPointerMove = function (e) {
        if (!this.pointers.has(e.pointerId)) { return; }
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Pinch takes priority.
        if (this.pinchStart && this.pointers.size >= 2) {
            var pts = Array.from(this.pointers.values());
            var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
            var target = clamp(this.pinchStart.scale * (dist / this.pinchStart.dist),
                               this._minAllowed(), CONFIG.maxScale);
            this.zoomAt(target / this.state.scale, this.pinchStart.mid.x, this.pinchStart.mid.y);
            if (e.cancelable) { e.preventDefault(); }
            return;
        }

        if (!this.panStart || this.panStart.id !== e.pointerId) { return; }

        var dx = e.clientX - this.panStart.x;
        var dy = e.clientY - this.panStart.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { this.panStart.moved = true; }

        if (CONFIG.pan && this._isZoomed()) {
            this.state.x = this.panStart.sx + dx;
            this.state.y = this.panStart.sy + dy;
            this._constrain();
            this._apply();
            if (e.cancelable) { e.preventDefault(); }
        }
    };

    Viewer.prototype._onPointerUp = function (e) {
        this.pointers.delete(e.pointerId);

        if (this.pinchStart && this.pointers.size < 2) {
            this.pinchStart = null;
            return;                       // a lift that ends a pinch is not a tap
        }

        if (!this.panStart || this.panStart.id !== e.pointerId) { return; }

        var dx = e.clientX - this.panStart.x;
        var dy = e.clientY - this.panStart.y;
        var moved = this.panStart.moved;
        var zoomed = this._isZoomed();

        this.panStart = null;
        this.canvas.style.cursor = 'grab';

        // Swipe between images — only when NOT zoomed and mostly horizontal.
        if (CONFIG.swipeBetweenImages && !zoomed && moved &&
            Math.abs(dx) > CONFIG.swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
            // RTL page: swiping right reveals the previous image.
            this.step(dx > 0 ? -1 : 1);
            return;
        }

        // Double-tap / double-click toggles zoom.
        if (CONFIG.doubleTapZoom && !moved) {
            var now = Date.now();
            var close = this.lastTapPos &&
                Math.abs(e.clientX - this.lastTapPos.x) < 30 &&
                Math.abs(e.clientY - this.lastTapPos.y) < 30;
            if (now - this.lastTapAt < 320 && close) {
                this.lastTapAt = 0;
                this.lastTapPos = null;
                if (this._isZoomed()) {
                    this.fit();
                } else {
                    var target = clamp(CONFIG.doubleTapScale * this.fitScale(),
                                       this._minAllowed(), CONFIG.maxScale);
                    this.zoomAt(target / this.state.scale, e.clientX, e.clientY);
                }
                return;
            }
            this.lastTapAt = now;
            this.lastTapPos = { x: e.clientX, y: e.clientY };
        }
    };

    /* ------------------------------ wheel ----------------------------- */
    Viewer.prototype._onWheel = function (e) {
        if (!this.stage.contains(e.target)) { return; }
        e.preventDefault();
        e.stopPropagation();   // v1.0.2 (F3): never reach the old wheel listener
        var delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        this.zoomAt(Math.exp(-delta * CONFIG.wheelStep), e.clientX, e.clientY);
    };

    /* ---------------------------- keyboard ---------------------------- */
    Viewer.prototype._onKey = function (e) {
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) { return; }
        var handled = true;
        switch (e.key) {
            case '+': case '=': this.zoomIn(); break;
            case '-': case '_': this.zoomOut(); break;
            case '0': this.fit(); break;
            case 'r': case 'R': this.rotate(90); break;
            case 'f': case 'F': this.toggleFullscreen(); break;
            case 'ArrowLeft': this.state.x += 40; this._constrain(); this._apply(); break;
            case 'ArrowRight': this.state.x -= 40; this._constrain(); this._apply(); break;
            case 'ArrowUp': this.state.y += 40; this._constrain(); this._apply(); break;
            case 'ArrowDown': this.state.y -= 40; this._constrain(); this._apply(); break;
            default: handled = false;
        }
        if (handled) { e.preventDefault(); }
    };

    /* --------------------------- thumbnails --------------------------- */
    Viewer.prototype._bindThumbnails = function () {
        var self = this;
        if (CONFIG.lazyThumbnails) {
            var thumbs = document.querySelectorAll('[data-viewer-thumb]');
            for (var i = 0; i < thumbs.length; i++) {
                thumbs[i].setAttribute('loading', 'lazy');
                thumbs[i].setAttribute('decoding', 'async');
            }
        }
        // Delegated, so thumbnails rendered later by Blazor also work.
        this.disposers.push(on(document, 'click', function (e) {
            var t = e.target.closest ? e.target.closest('[data-viewer-thumb]') : null;
            if (!t || !t.getAttribute('src')) { return; }
            self.show(t.getAttribute('src'), t);
        }));
    };

    Viewer.prototype.show = function (src, thumbEl) {
        if (!src) { return this; }
        if (CONFIG.loadingSpinner && this.spinner) {
            this.spinner.removeAttribute('hidden');
            this.spinner.removeAttribute('aria-hidden');
        }
        if (this.errorBox) { this.errorBox.setAttribute('hidden', ''); }

        this.canvas.setAttribute('src', src);
        this.index = this._indexOfInList(src);

        if (thumbEl && thumbEl.classList) {
            var all = document.querySelectorAll('[data-viewer-thumb]');
            for (var i = 0; i < all.length; i++) { all[i].classList.remove('selected-thumbnail'); }
            thumbEl.classList.add('selected-thumbnail');
        }
        return this;   // filters and rotation survive an image change on purpose
    };

    Viewer.prototype._indexOfInList = function (src) {
        var all = document.querySelectorAll('[data-viewer-thumb]');
        for (var i = 0; i < all.length; i++) {
            if (all[i].getAttribute('src') === src) { return i; }
        }
        return 0;
    };

    Viewer.prototype.step = function (dir) {
        var all = document.querySelectorAll('[data-viewer-thumb]');
        if (all.length < 2) { return this; }
        var idx = this.index + dir;
        if (idx < 0) { idx = all.length - 1; }
        if (idx >= all.length) { idx = 0; }
        var el = all[idx];
        return this.show(el.getAttribute('src'), el);
    };

    /* --------------------------- fullscreen --------------------------- */
    Viewer.prototype.toggleFullscreen = function () {
        if (!CONFIG.fullscreen) { return this; }
        var el = this.root;
        var isFs = document.fullscreenElement || document.webkitFullscreenElement;

        if (isFs) {
            (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
            el.classList.remove('viewer-fallback-fs');
        } else if (el.requestFullscreen) {
            var self = this;
            el.requestFullscreen().then(function () { self.fit(); })
              .catch(function () { el.classList.add('viewer-fallback-fs'); });
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else {
            // iOS Safari has no element fullscreen — CSS fallback instead.
            el.classList.add('viewer-fallback-fs');
        }
        return this;
    };

    /* ------------------------------ output ---------------------------- */
    // Composite the visible result (rotation, flip and filters) into a canvas
    // and hand the user a download. Mirrors the old saveImage() intent.
    Viewer.prototype.save = function () {
        var c = this.canvas;
        if (!c || !c.naturalWidth) { return this; }

        var s = this.state, f = this.filters;
        var rad = s.rotate * Math.PI / 180;
        var w = c.naturalWidth, h = c.naturalHeight;
        var bw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
        var bh = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));

        var canvas = document.createElement('canvas');
        canvas.width = Math.ceil(bw);
        canvas.height = Math.ceil(bh);
        var ctx = canvas.getContext('2d');
        ctx.filter = 'brightness(' + f.brightness + '%) contrast(' + f.contrast + '%) ' +
                     'saturate(' + f.saturate + '%) invert(' + f.invert + '%) grayscale(' + f.grayscale + '%)';
        ctx.translate(bw / 2, bh / 2);
        ctx.rotate(rad);
        ctx.scale(s.flipH, s.flipV);
        ctx.drawImage(c, -w / 2, -h / 2, w, h);

        var name = (c.currentSrc || c.src || 'image').split('/').pop().split('?')[0] || 'image';
        var link = document.createElement('a');
        link.download = name.replace(/\.[^.]+$/, '') + '-smartscan.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return this;
    };

    Viewer.prototype.print = function () {
        var c = this.canvas;
        if (!c) { return this; }
        var w = window.open('', '_blank');
        if (!w) { return this; }
        var img = w.document.createElement('img');
        img.src = c.src;
        img.style.maxWidth = '100%';
        img.style.filter = c.style.filter || 'none';
        w.document.body.appendChild(img);
        w.document.close();
        img.onload = function () { w.focus(); w.print(); };
        return this;
    };

    Viewer.prototype.retry = function () {
        var c = this.canvas;
        if (!c) { return this; }
        if (this.errorBox) { this.errorBox.setAttribute('hidden', ''); }
        if (this.spinner) { this.spinner.removeAttribute('hidden'); }
        var src = c.getAttribute('src') || '';
        // Cache-bust so the browser really re-requests a failed image.
        c.setAttribute('src', src.split('?')[0] + '?r=' + Date.now());
        return this;
    };

    Viewer.prototype.action = function (name) { this._runAction(name); return this; };

    /* ------------------------------------------------------------------ *
     * Public facade — Blazor-safe
     * ------------------------------------------------------------------ */
    var SmartScanViewer = {
        version: '1.0.3',
        config: CONFIG,
        defaults: DEFAULTS,

        init: function (root) {
            var roots = root ? [root] : document.querySelectorAll('[data-viewer-root]');
            if (!roots.length) {
                // v1.0.2 (F1): the live v1.0.0 markup has no [data-viewer-root].
                // Fall back to the preview container / image. The Viewer
                // constructor resolves the canvas via
                // root.querySelector('[data-viewer-canvas]') ||
                // root.querySelector('img'), which finds #preview-img inside
                // #preview-container. The data-viewer-fallback marker tells
                // _pinFallbackStage() to pin the stage height (F5).
                var fb = document.getElementById('preview-container');
                if (!fb) { return null; }
                fb.setAttribute('data-viewer-fallback', '');
                roots = [fb];
            }
            var first = null;
            for (var i = 0; i < roots.length; i++) {
                var el = roots[i];
                var inst = INSTANCES.get(el);
                if (inst) {
                    // v1.0.3: Blazor re-renders REPLACE the img inside this
                    // stage with a fresh node. The old instance's listeners
                    // stay on the detached node, so "just re-fit" would leave
                    // pinch dead on the new node. If the bound canvas is no
                    // longer the live img in this root, drop the stale
                    // instance so a fresh one binds to the new node below.
                    var liveCanvas = el.querySelector('[data-viewer-canvas]') || el.querySelector('img');
                    if (inst.bound && (!inst.canvas || !document.contains(inst.canvas) || inst.canvas !== liveCanvas)) {
                        inst.dispose();
                        INSTANCES.delete(el);
                        inst = null;
                    }
                }
                if (inst) {
                    // Already initialised by an earlier render: never rebind.
                    // Just re-fit, because the layout may have changed.
                    if (inst.bound) { inst.fit(); } else { inst.init(); }
                } else {
                    inst = new Viewer(el);
                    INSTANCES.set(el, inst);
                    inst.init();
                }
                if (!first) { first = inst; }
            }
            return first;
        },

        dispose: function (root) {
            var roots = root ? [root] : document.querySelectorAll('[data-viewer-root]');
            for (var i = 0; i < roots.length; i++) {
                var inst = INSTANCES.get(roots[i]);
                if (inst) { inst.dispose(); }
            }
        },

        get: function (root) {
            // v1.0.2: also find the fallback root — the live markup has no
            // [data-viewer-root], so a bare get() must resolve #preview-container
            // (marked data-viewer-fallback) or the instance is invisible to the
            // legacy overrides and to state().
            var el = root || document.querySelector('[data-viewer-root]') || document.querySelector('[data-viewer-fallback]') || document.getElementById('preview-container');
            return el ? (INSTANCES.get(el) || null) : null;
        },

        state: function (root) {
            var inst = this.get(root);
            if (!inst) { return null; }
            return {
                scale: inst.state.scale,
                x: inst.state.x,
                y: inst.state.y,
                rotate: inst.state.rotate,
                flipH: inst.state.flipH,
                flipV: inst.state.flipV,
                filters: {
                    brightness: inst.filters.brightness,
                    contrast: inst.filters.contrast,
                    saturate: inst.filters.saturate,
                    invert: inst.filters.invert,
                    grayscale: inst.filters.grayscale
                }
            };
        },

        zoomIn: function () { var i = this.get(); if (i) { i.zoomIn(); } return this; },
        zoomOut: function () { var i = this.get(); if (i) { i.zoomOut(); } return this; },
        reset: function () { var i = this.get(); if (i) { i.reset(); } return this; },
        fit: function () { var i = this.get(); if (i) { i.fit(); } return this; },
        rotate: function (d) { var i = this.get(); if (i) { i.rotate(d); } return this; },
        flip: function (a) { var i = this.get(); if (i) { i.flip(a); } return this; },
        setScale: function (v) { var i = this.get(); if (i) { i.setScale(v); } return this; },
        setFilter: function (n, v) { var i = this.get(); if (i) { i.setFilter(n, v); } return this; },
        syncFiltersFromInputs: function () { var i = this.get(); if (i) { i.syncFiltersFromInputs(); } return this; },
        resetFilters: function () { var i = this.get(); if (i) { i.resetFilters(); } return this; },
        action: function (n) { var i = this.get(); if (i) { i.action(n); } return this; }
    };

    /* ------------------------------------------------------------------ *
     * Legacy global overrides (v1.0.2, F2).
     *
     * The markup still carries inline handlers from the old build
     * (onload="applyFilters()", onclick="updatePreview(this)"). The v1.0.1
     * `||` shims never took effect, because the inline script had already
     * defined these globals by the time viewer.js loaded. Assign
     * UNCONDITIONALLY, so the viewer owns them and the old code paths
     * (the wheel-only listener, the bare-scale zoomImage, the
     * rotate/flip-clobbering applyFilters) can never run again.
     * window.applyFilter / window.updateSlider are left alone — dead code
     * for this markup (they reference .slider / .editor-panel, which the
     * live page does not have).
     * ------------------------------------------------------------------ */
    window.applyFilters = function () {
        var i = SmartScanViewer.get();
        if (i) { i.syncFiltersFromInputs(); }
    };
    window.NewapplyFilters = window.applyFilters;

    // The inline script's window.onload calls initImageFilterControls().
    // Point it at the viewer, so the old wheel-only listener is never added.
    window.initImageFilterControls = function () { SmartScanViewer.init(); };

    window.updatePreview = function (el) {
        var i = SmartScanViewer.get();
        if (i && el) { i.show(el.getAttribute('src'), el); }
    };

    window.zoomImage = function (zoomIn) {
        if (zoomIn) { SmartScanViewer.zoomIn(); } else { SmartScanViewer.zoomOut(); }
    };

    window.rotateImage = function (dir) {
        SmartScanViewer.rotate(dir === 'left' ? -90 : 90);
    };

    window.flipImage = function (axis) {
        SmartScanViewer.flip(axis === 'horizontal' ? 'h' : 'v');
    };

    window.resetFilters = function () { SmartScanViewer.resetFilters(); };
    window.saveImage = function () { SmartScanViewer.action('save'); };
    window.chooseImage = function () {
        var f = document.getElementById('file-input') || document.querySelector('.file-input');
        if (f) { f.click(); }
    };

    /* ------------------------------------------------------------------ *
     * Boot + Blazor integration
     * ------------------------------------------------------------------ */
    function boot() { SmartScanViewer.init(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    // Blazor Server re-renders after the circuit starts, and the prerendered
    // markup can be replaced. Re-init (idempotently) after each such event so
    // the viewer is never wired to a stale DOM node.
    function ensure() { SmartScanViewer.init(); }

    document.addEventListener('enhancedload', ensure);   // .NET 9+ enhanced navigation
    window.addEventListener('popstate', ensure);
    window.addEventListener('resize', function () {
        var i = SmartScanViewer.get();
        if (i && i.state.scale <= i.fitScale() * 1.001) { i.fit(); }
    });

    // Watch for the viewer being replaced by Blazor. Debounced through rAF.
    if (typeof MutationObserver !== 'undefined') {
        var scheduled = false;
        var observer = new MutationObserver(function () {
            if (scheduled) { return; }
            scheduled = true;
            requestAnimationFrame(function () {
                scheduled = false;
                // v1.0.3: the live page has no [data-viewer-root] — it uses
                // the #preview-container fallback. A Blazor re-render replaces
                // #preview-img with a fresh node; the bound instance's listeners
                // stay on the detached node. Re-init whenever the live img is
                // not the bound canvas (init() drops the stale instance).
                var inst = SmartScanViewer.get();
                var liveImg = document.getElementById('preview-img');
                if (liveImg && (!inst || !inst.canvas || !document.contains(inst.canvas) || inst.canvas !== liveImg)) { ensure(); }
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Leaving the page: drop every listener so the browser can collect the DOM.
    window.addEventListener('pagehide', function () { SmartScanViewer.dispose(); });

    window.SmartScanViewer = SmartScanViewer;

})(window, document);
