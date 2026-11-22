/*!
 * smartscan-viewer.js  v2.1.0
 * SmartScan dental-image viewer.
 *
 * Replaces the inline viewer script that used to be rendered inside the
 * NewPatientProfileForm component. No dependencies, no CDN.
 *
 * v2.0.0 is the FULL-SCREEN REDESIGN Maziyar chose ~20:43 2026-11-08
 * ("Full-screen viewer"), after v1.0.4's pinch fix left two faults:
 *   1. the picture sat LOW in a tall stage (624px stage, 207px image,
 *      vertically centred) with a big dark gap above it — and
 *   2. it "cannot be moved up": pan was gated on _isZoomed(), so at fit
 *      scale dragging did nothing at all.
 * On small screens (<=768px) the viewer now re-skins the live page into a
 * full-screen viewer, using ONLY the existing markup (the page source is
 * lost; the deployable surface is still just this file + the loader block):
 *   S1 - full-screen stage: #preview-container becomes position:fixed,
 *        top:0, full viewport height, so the picture fills the screen.
 *   S2 - slim top bar: the EXISTING .navbar (clinic name, patient name,
 *        date) is restyled in place — restyled/moved, never invented or
 *        duplicated. The image top-anchors just under it (navbar height +
 *        mobileTopGap, ~56px), so there is no big dark gap above it.
 *   S3 - floating bottom bar: the EXISTING .tools-container moves to the
 *        bottom of the viewport as a fixed overlay bar (>=44px buttons,
 *        wrapping OK). Every action keeps working: zoom in/out, rotate
 *        L/R, flip H/V, invert, reset, save, fit, fullscreen.
 *   S4 - sliders in a collapsible panel: the EXISTING brightness/contrast
 *        sliders (and their filter wiring) move into a panel above the
 *        bottom bar, opened/closed by a new sun button in the toolbar.
 *   S5 - thumbnail strip: kept clickable, as a small strip just above
 *        the bottom bar. Footer credit ("تهیه و تولید نرم افزار اسمارت"):
 *        kept, as a tiny caption row inside the bottom bar.
 *   S6 - pan ALWAYS (small screens): the _isZoomed() gate is removed for
 *        panning on the skinned layout — dragging moves the image at fit
 *        scale too. _constrain() no longer force-centres a fitting image;
 *        it clamps the image CENTRE inside the stage, so the image can be
 *        dragged freely but never fully out of view. Desktop keeps the
 *        v1.0.4 gate (pan only when zoomed) byte-for-byte.
 *   S7 - Blazor survival: the skin (injected class-gated CSS + moved
 *        nodes + re-mapped toolbar actions) re-applies after every
 *        re-render, through the same MutationObserver that rebinds the
 *        viewer. The CSS is gated on <html class="ssv-fullscreen">, which
 *        the skin adds once on small screens and keeps (sticky): a phone
 *        rotated to landscape keeps the full-screen layout, and a fresh
 *        desktop load never gets the class, so desktop geometry stays
 *        identical to v1.0.4. The skin is sticky, not breakpoint-scoped —
 *        that is deliberate: un-applying on resize would need to restore
 *        original parents that a Blazor re-render may already have
 *        replaced. A desktop window narrowed past 768px gains the skin;
 *        widening it again keeps the phone layout for that page lifetime.
 *   S8 - swipe trade-off: with pan-always-on, a horizontal drag at fit
 *        scale pans the image, so swipe-between-images can no longer also
 *        fire on the same gesture (it would both pan AND switch). The
 *        swipe is suppressed when the drag actually panned the image.
 *        The live page has ONE thumbnail, so nothing is lost there; on
 *        desktop (pan still gated on zoom) swipe works exactly as before.
 *   R1 - rotation returns to fit: the resize handler re-fits whenever the
 *        user was AT fit before the resize (tracked by _atFit, set by
 *        fit() and by any zoom that lands at-or-below fit scale). v1.0.4
 *        only re-fit when the new fit scale was LARGER than the current
 *        scale, so portrait -> landscape -> portrait left the picture
 *        zoomed at 66% with only 59% of its width visible. Now a rotation
 *        back to portrait returns the picture to fit (38%). A user who was
 *        deliberately zoomed stays zoomed (the old rule still applies when
 *        _atFit is false).
 * v2.1.0 is the FINALISATION round Maziyar ordered ~21:26 2026-11-08
 * ("much better, can be moved by touch and zoomed in and out" — but the
 * header, the double "خطا" notice and a horizontal-rotation option remained):
 *   N1 - the notice: the loader (not this file) intercepts Swal.fire and
 *        shows the privacy notice ONCE per session as a slim dismissible
 *        banner titled "توجه" with the clinic text verbatim. This file only
 *        re-ensures the banner after a Blazor re-render, re-positions it
 *        under the top bar, and top-anchors the picture BELOW it while it
 *        is showing, so it never covers the image.
 *   N2 - header (small screens): two lines — clinic name (still linked to
 *        /TajDentalClinic) on line 1, patient + date (plain text, never a
 *        link) on line 2; the neon chartreuse/blueviolet inline colours are
 *        overridden with one readable light colour. Date stays verbatim.
 *   N3 - filter panel labels in Persian: "روشنایی" / "کنتراست".
 *   R1 - horizontal rotation: a new bottom-bar toggle ("افقی") switches
 *        the image 0° <-> 90° (from 180°/270° it returns to 0°) and re-fits;
 *        fitScale() is rotation-aware, so a horizontal image still fills
 *        the screen. The bar holds all 11 buttons in a scrollable row.
 *   The Swal warning modal is gone as a modal (see N1); the banner's
 *   z-index (1200, set by the loader) sits above the navbar (1111).
 *   Double-tap fit<->zoom is unchanged and now covered by a test.
 *   Pinch/pan always win over layout: if any of this ever fought them,
 *   pinch/pan win.
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
 * v1.0.4 fixes the MOBILE FIT failure Maziyar reported live ~19:36
 * 2026-11-08 (pinch worked after v1.0.3, but the picture rendered small,
 * ~half the stage width, with a big empty dark area under it):
 *   M1 - viewport stage: on small screens the fallback stage no longer
 *        pins to the in-flow img height (the old 50%-wide img with
 *        margin-top:100px pinned the stage to ~300px, so fit() was
 *        height-limited). The stage now takes the viewport height minus
 *        the header/toolbar above it and a small reserve below. Desktop
 *        keeps the v1.0.2/v1.0.3 pin exactly.
 *   M2 - fit by width: on small screens a landscape (panoramic) image
 *        fits by WIDTH only — the height of the tall phone stage must
 *        never shrink the picture. With the small fit pad (8px instead
 *        of 32px) the image fills >=95% of the stage width at default
 *        fit. Portrait images still fit by min(width, height) so they
 *        are never cropped top/bottom. Pinch, pan, wheel and buttons
 *        are untouched; if any of this ever fought pinch, pinch wins.
 *   M3 - touch toolbar: a <style> block injected at init gives the
 *        toolbar >=44px tap targets on small screens and lets it wrap
 *        to two rows instead of clipping (the live <=460px CSS sets
 *        2rem/32px buttons and a fixed 76px toolbar height). Scoped
 *        to the mobile breakpoint; desktop CSS is untouched.
 *   NOTE: the live picture is a screenshot of the clinic's CS Imaging
 *   desktop program — the X-ray is only the middle band of the JPEG.
 *   No viewer code can add image that is not in the file; v1.0.4 makes
 *   the picture as large as the phone screen allows. Clean X-ray
 *   exports (not desktop screenshots) are the real fix for the teeth
 *   looking small, and that is a clinic-upload question, not code.
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
        swipeThreshold: 60,       // px before a swipe counts
        // v1.0.4 (M1–M3): phone layout. mobileBreakpoint is the viewport
        // width (CSS px) at/below which the phone rules apply; mobileFitPad
        // is the total horizontal padding subtracted at fit on phones (8px
        // keeps a 390px-wide panorama at >=95% of the stage width, where
        // the 32px desktop pad would leave it at ~92%); mobileStageReserve
        // is the space kept below the viewport-sized stage for the
        // thumbnails/footer to peek into view.
        mobileBreakpoint: 768,
        mobileFitPad: 8,
        mobileStageReserve: 12,
        // v2.0.0 (S2): gap between the slim top bar's bottom edge and the
        // image top at fit on the skinned layout — the picture sits just
        // under the bar, with no big dark gap above it. The top anchor is
        // measured live (navbar height + this gap), never hardcoded.
        mobileTopGap: 8
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

    // v1.0.4 (M1–M3): the phone rules apply at/below this viewport width
    // (CSS px). A desktop window narrowed past it gets the phone layout too
    // — that is the point of a responsive breakpoint, not a device check.
    function isSmallScreen() {
        return (window.innerWidth || 0) <= CONFIG.mobileBreakpoint;
    }

    // v2.0.0 (S7): the full-screen skin is active once _applySkin() has run
    // (it adds the class to <html>). Sticky by design: a phone rotated to
    // landscape keeps the full-screen layout, and a fresh desktop load never
    // gets the class. Every v2 layout behaviour (pan-always-on, centre
    // clamp, top-anchor fit, full-viewport stage pin) is gated on this, NOT
    // on isSmallScreen() — except fitScale(), which keeps the v1.0.4
    // viewport rule so a landscape phone still fits by min(width, height)
    // instead of cropping a panorama vertically.
    function isSkinActive() {
        return document.documentElement.classList.contains('ssv-fullscreen');
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
        this.panned = false;                  // v2.0.0 (S8): this drag actually panned the image
        this._atFit = false;                  // v2.0.0 (R1): the scale is at (or below) fit scale
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

        // v1.0.4 (M3): touch-friendly toolbar on small screens (injected
        // once per page; the id guard keeps re-inits from stacking it).
        this._injectMobileCss();

        // v2.0.0 (S1–S7): full-screen skin — restyles the header into a
        // slim top bar, moves the toolbar to the bottom, the sliders into a
        // collapsible panel, the footer into the toolbar. Idempotent and
        // sticky; MUST run before the stage pin, because the pin and the
        // fit placement read the skinned geometry.
        this._applySkin();

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
    // v1.0.4 (M1): on SMALL screens the fallback stage takes the viewport
    // height minus the header/toolbar above it and a small reserve below,
    // instead of pinning to the in-flow img height. The old pin measured the
    // in-flow img (inline width:50%, margin-top:100px — and on live the
    // <=460px CSS makes it 100% wide, ~195px tall + 100px margin, so the
    // stage pinned to ~300px); fit() was then height-limited and the picture
    // rendered at ~0.32 of natural size — small, with a big empty dark area
    // under it. A tall stage lets fit() be width-limited (M2) and gives
    // pinch-zoom room to pan in. Desktop keeps the v1.0.2/v1.0.3 pin exactly.
    // The stage top is viewport-relative: if the page has scrolled so the
    // top is above the viewport, the height is capped at one viewport; the
    // 200px floor keeps the stage from ever collapsing.
    Viewer.prototype._pinFallbackStage = function () {
        if (!this.root.hasAttribute('data-viewer-fallback')) { return; }
        if (isSkinActive()) {
            // v2.0.0 (S1): the skinned stage is position:fixed, top:0, and
            // covers ~100% of the viewport height — the top bar and bottom
            // bar are fixed overlays, not flow, so there is no header to
            // subtract and no reserve to keep. Do NOT touch position here:
            // the class-gated CSS owns it (the v1.0.4 desktop branch below
            // sets position:relative, which must never run on a skinned
            // stage). The 200px floor keeps the stage from ever collapsing.
            var vh = window.innerHeight || 0;
            this.root.style.height = Math.max(200, vh) + 'px';
            return;
        }
        if (isSmallScreen()) {
            var vh = window.innerHeight || 0;
            var top = this.root.getBoundingClientRect().top;
            var avail = vh - top - CONFIG.mobileStageReserve;
            avail = Math.max(200, Math.min(avail, vh - CONFIG.mobileStageReserve));
            this.root.style.position = 'relative';
            this.root.style.height = Math.round(avail) + 'px';
            return;
        }
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

    // v2.0.0 (S1–S7): full-screen skin CSS. Gated on <html class=
    // "ssv-fullscreen"> — NOT on a media query — because the skin is sticky
    // once applied (a phone rotated to landscape keeps the full-screen
    // layout) and a fresh desktop load never gets the class (desktop
    // geometry stays identical to v1.0.4). The class is added by
    // _applySkin() on small screens only. The !important flags are
    // load-bearing: the page's own stylesheet sets explicit sizes and
    // absolute positions for these elements, and an injected rule without
    // them would lose. Guarded by id: init() runs after every Blazor
    // re-render, but the style element is added once.
    //   .navbar            -> slim fixed top bar, existing header content
    //   .tools-container   -> fixed bottom overlay bar (moved there by JS)
    //   #ww-wc-container  -> static, lives inside the filters panel
    //   .thumbnail-container -> small strip above the bottom bar (bottom
    //                          set by JS, after measuring the toolbar)
    //   .footer            -> tiny caption row inside the bottom bar
    //   #preview-container -> fixed, full viewport (height pinned by JS)
    //   #smartscan-filters-panel -> collapsible panel, hidden by default
    Viewer.prototype._injectMobileCss = function () {
        if (document.getElementById('smartscan-viewer-mobile-css')) { return; }
        var css =
            'html.ssv-fullscreen .navbar{' +
            'position:fixed !important;top:0 !important;left:0 !important;right:0 !important;' +
            'width:100% !important;height:auto !important;min-height:48px !important;max-height:76px !important;' +
            'z-index:1111 !important;display:flex !important;align-items:center !important;justify-content:center !important;' +
            'overflow:hidden !important;background:#242526 !important;' +
            'padding:calc(4px + env(safe-area-inset-top,0px)) 8px 4px !important;box-sizing:border-box !important;}' +
            'html.ssv-fullscreen .navbar .brand{width:100% !important;height:auto !important;' +
            'display:flex !important;align-items:center !important;justify-content:center !important;}' +
            'html.ssv-fullscreen .navbar .brand div{font-size:13px !important;line-height:1.35 !important;text-align:center !important;}' +
            'html.ssv-fullscreen #ww-wc-container{' +
            'position:static !important;top:auto !important;width:auto !important;height:auto !important;' +
            'display:flex !important;align-items:center !important;justify-content:center !important;}' +
            'html.ssv-fullscreen .tools-container{' +
            'position:fixed !important;left:0 !important;right:0 !important;bottom:0 !important;top:auto !important;' +
            'width:100% !important;height:auto !important;z-index:1100 !important;' +
            'display:flex !important;flex-wrap:wrap !important;align-items:center !important;justify-content:center !important;' +
            'background:rgba(36,37,38,0.96) !important;' +
            'padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px)) !important;box-sizing:border-box !important;}' +
            'html.ssv-fullscreen .tools-container .btn,html.ssv-fullscreen .tools-container button{' +
            'min-width:44px !important;min-height:44px !important;' +
            'box-sizing:border-box !important;display:inline-flex !important;' +
            'align-items:center !important;justify-content:center !important;' +
            'padding:6px !important;}' +
            'html.ssv-fullscreen .tools-container .btn i,html.ssv-fullscreen .tools-container button i{font-size:22px !important;}' +
            'html.ssv-fullscreen .tools-container button span{font-size:22px !important;line-height:1 !important;}' +
            'html.ssv-fullscreen .tools-container .footer{' +
            'position:static !important;width:100% !important;height:auto !important;background:transparent !important;' +
            'display:flex !important;justify-content:center !important;order:99 !important;}' +
            'html.ssv-fullscreen .tools-container .footer .footer-text{' +
            'font-size:10px !important;line-height:1.2 !important;opacity:0.65 !important;}' +
            'html.ssv-fullscreen .tools-container .footer .footer-text a{color:#9db3d6 !important;}' +
            'html.ssv-fullscreen #preview-container{' +
            'position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:auto !important;' +
            'width:auto !important;z-index:1 !important;overflow:hidden !important;}' +
            'html.ssv-fullscreen .thumbnail-container{' +
            'position:fixed !important;left:0 !important;right:0 !important;top:auto !important;bottom:100px;' +
            'width:100% !important;height:48px !important;' +
            'display:flex !important;align-items:center !important;justify-content:center !important;' +
            'background:transparent !important;overflow-x:auto !important;overflow-y:hidden !important;' +
            'z-index:1095 !important;padding:0 8px !important;box-sizing:border-box !important;}' +
            'html.ssv-fullscreen .thumbnail-container .parent-container{margin:0 !important;}' +
            'html.ssv-fullscreen .thumbnail-container img,html.ssv-fullscreen .thumbnail-container .thumbnail{' +
            'width:40px !important;height:40px !important;object-fit:cover !important;margin:0 4px !important;border-radius:4px !important;}' +
            'html.ssv-fullscreen #smartscan-filters-panel{' +
            'position:fixed !important;left:0 !important;right:0 !important;z-index:1105 !important;' +
            'background:#242526 !important;border-top:1px solid #444 !important;' +
            'padding:10px 12px !important;box-sizing:border-box !important;display:none;}' +
            'html.ssv-fullscreen #smartscan-filters-panel.ssv-open{display:block !important;}' +
            'html.ssv-fullscreen #smartscan-filters-panel #ww-wc-container{gap:16px !important;}' +
            'html.ssv-fullscreen #ww-wc-container input[type=range]{min-height:44px !important;}' +
            'html.ssv-fullscreen #reset-brightness{' +
            'min-width:44px !important;min-height:44px !important;' +
            'display:inline-flex !important;align-items:center !important;' +
            'justify-content:center !important;}' +
            // v2.1.0 (N2): header — one readable light colour, never the
            // neon chartreuse/blueviolet inline colours; two lines, centred.
            'html.ssv-fullscreen .navbar label{color:#f2f2f2 !important;}' +
            'html.ssv-fullscreen .navbar .brand .ssv-header-lines{width:100% !important;}' +
            'html.ssv-fullscreen .navbar .brand .ssv-header-line1,html.ssv-fullscreen .navbar .brand .ssv-header-line2{' +
            'display:block !important;width:100% !important;text-align:center !important;}' +
            'html.ssv-fullscreen .navbar .brand .ssv-header-line1{font-size:14px !important;font-weight:600 !important;color:#f2f2f2 !important;}' +
            'html.ssv-fullscreen .navbar .brand .ssv-header-line1 a{color:#f2f2f2 !important;text-decoration:none !important;}' +
            'html.ssv-fullscreen .navbar .brand .ssv-header-line2{font-size:12px !important;color:#d8d8d8 !important;}' +
            'html.ssv-fullscreen .navbar .brand .ssv-header-line2 .ssv-header-sep{margin:0 6px !important;color:#9a9a9a !important;}' +
            // v2.1.0 (R1): the 11 buttons live in ONE horizontally
            // scrollable row (the footer caption stays a direct toolbar
            // child on its own line). Scrollbar hidden — it scrolls by
            // touch, not by a visible bar.
            'html.ssv-fullscreen .tools-container .ssv-toolbar-row{display:flex !important;' +
            'flex-wrap:nowrap !important;overflow-x:auto !important;width:100% !important;' +
            'align-items:center !important;gap:2px !important;scrollbar-width:none !important;' +
            '-webkit-overflow-scrolling:touch !important;}' +
            'html.ssv-fullscreen .tools-container .ssv-toolbar-row::-webkit-scrollbar{display:none !important;}' +
            'html.ssv-fullscreen .tools-container .ssv-toolbar-row .btn{flex:0 0 auto !important;}' +
            'html.ssv-fullscreen .tools-container .ssv-toolbar-row .btn .ssv-btn-label{font-size:12px !important;}' +
            'html.ssv-fullscreen .tools-container .ssv-toolbar-row .btn[aria-pressed="true"]{background:#3a5a75 !important;}';
        var st = document.createElement('style');
        st.id = 'smartscan-viewer-mobile-css';
        st.type = 'text/css';
        if (st.styleSheet) { st.styleSheet.cssText = css; }
        else { st.appendChild(document.createTextNode(css)); }
        (document.head || document.documentElement).appendChild(st);
    };

    // v2.0.0 (S1–S7): apply the full-screen skin. Idempotent — every check
    // is "is this node already where it belongs", so calling it on every
    // re-render, resize and observer fire is safe, and a second pass after
    // a Blazor re-render re-applies exactly what the re-render undid.
    // Runs only when the viewport is small OR the skin is already active
    // (sticky: a phone rotated to landscape keeps it; a fresh desktop load
    // never activates it). Moves are DOM moves, so event listeners travel
    // with the nodes; the toolbar action mapping and the filter-input
    // wiring are re-run here too, because a re-render can replace those
    // nodes with fresh ones that have neither.
    Viewer.prototype._applySkin = function () {
        if (!isSmallScreen() && !isSkinActive()) { return; }
        var de = document.documentElement;
        if (!de.classList.contains('ssv-fullscreen')) { de.classList.add('ssv-fullscreen'); }

        var body = document.body;
        if (!body) { return; }

        // Bottom bar: the existing toolbar, moved out of the navbar to the
        // end of <body> (its CSS makes it a fixed overlay at the bottom).
        var tb = document.querySelector('.tools-container');
        if (tb && tb.parentNode !== body) { body.appendChild(tb); }

        // v2.1.0 (R1): scrollable button row, created BEFORE the toggles so
        // the new buttons land inside it. The footer caption stays a direct
        // toolbar child, on its own line below the row.
        var row = this._ensureToolbarRow();
        var rowTarget = row || tb;

        // Filters toggle: one sun button in the toolbar, created once.
        if (tb && !tb.querySelector('[data-viewer-action="toggle-filters"]')) {
            var tgl = document.createElement('button');
            tgl.type = 'button';
            tgl.className = 'btn';
            tgl.setAttribute('data-viewer-action', 'toggle-filters');
            tgl.setAttribute('aria-label', 'Brightness and contrast');
            tgl.title = 'Brightness and contrast';
            var sp = document.createElement('span');
            sp.setAttribute('aria-hidden', 'true');
            sp.textContent = '☀';
            tgl.appendChild(sp);
            rowTarget.appendChild(tgl);
        }

        // v2.1.0 (R1): horizontal-rotation toggle — icon + "افقی" label,
        // created once, inside the scrollable row.
        if (tb && !tb.querySelector('[data-viewer-action="toggle-horizontal"]')) {
            var hz = document.createElement('button');
            hz.type = 'button';
            hz.className = 'btn';
            hz.setAttribute('data-viewer-action', 'toggle-horizontal');
            hz.setAttribute('aria-label', 'چرخش افقی');
            hz.setAttribute('aria-pressed', 'false');
            hz.title = 'چرخش افقی';
            var hzi = document.createElement('span');
            hzi.setAttribute('aria-hidden', 'true');
            hzi.textContent = '↻';
            var hzl = document.createElement('span');
            hzl.className = 'ssv-btn-label';
            hzl.textContent = 'افقی';
            hz.appendChild(hzi);
            hz.appendChild(hzl);
            rowTarget.appendChild(hz);
        }

        // Footer credit: kept, as a tiny caption row inside the bottom bar.
        var ft = document.querySelector('.footer');
        if (ft && tb && ft.parentNode !== tb) { tb.appendChild(ft); }

        // Filters panel: created once at the end of <body>; the existing
        // sliders move into it. The panel is display:none until the sun
        // button opens it, so the sliders never eat screen space.
        var panel = document.getElementById('smartscan-filters-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'smartscan-filters-panel';
            body.appendChild(panel);
        }
        var wc = document.getElementById('ww-wc-container');
        if (wc && wc.parentNode !== panel) { panel.appendChild(wc); }

        // v2.1.0 (N2/N3): clean two-line header, Persian filter labels.
        // Both are idempotent and re-run after a Blazor re-render replaces
        // the header or the sliders with fresh nodes.
        this._restructureHeader();
        this._relabelPanel();

        // Fresh nodes from a re-render have no data-viewer-action and no
        // filter listeners — re-map / re-bind (both skip already-done nodes).
        this._mapToolbarActions();
        this._bindFilterInputs();

        // v2.1.0 (N1): put the privacy banner back if a re-render removed
        // it (unless the user dismissed it). The loader owns the state.
        this._ensureNoticeBanner();

        // Position the floating chrome from the measured toolbar height:
        // thumbnail strip just above the bottom bar, filters panel just
        // above the thumbnail strip. Re-measured on every call, so a
        // rotation (which re-wraps the toolbar) re-positions them.
        this._positionSkinChrome();
    };

    // v2.0.0 (S5/S4): measure the bottom bar and place the thumbnail strip
    // and the (closed) filters panel above it. The strip's CSS bottom is a
    // plain fallback (100px, no !important) so these inline values win.
    Viewer.prototype._positionSkinChrome = function () {
        // v2.1.0 (N1): the banner sits directly under the top bar. Its
        // height is measured live (the navbar can wrap to two lines), and
        // the picture's top anchor (see _topAnchor) moves below it.
        var banner = document.getElementById('ssv-privacy-banner');
        if (banner) {
            var nb = document.querySelector('.navbar');
            var nbH = nb ? Math.round(nb.getBoundingClientRect().height) : 48;
            banner.style.top = nbH + 'px';
        }
        var tb = document.querySelector('.tools-container');
        var tbH = tb ? Math.round(tb.getBoundingClientRect().height) : 0;
        var thumb = document.querySelector('.thumbnail-container');
        var panel = document.getElementById('smartscan-filters-panel');
        if (thumb) {
            thumb.style.bottom = (tbH + 4) + 'px';
            var thH = Math.round(thumb.getBoundingClientRect().height) || 48;
            if (panel) { panel.style.bottom = (tbH + thH + 8) + 'px'; }
        } else if (panel) {
            panel.style.bottom = (tbH + 8) + 'px';
        }
    };

    // v2.1.0 (R1): the bottom bar holds 11 buttons at >=44px — too wide
    // for one 390px row, so the buttons live in a horizontally scrollable
    // row (the footer caption stays a direct toolbar child on its own
    // line). Idempotent: a fresh toolbar from a re-render has no row, so
    // one is created and its buttons moved in; an existing row is reused.
    Viewer.prototype._ensureToolbarRow = function () {
        var tb = document.querySelector('.tools-container');
        if (!tb) { return null; }
        var row = tb.querySelector('.ssv-toolbar-row');
        if (!row) {
            row = document.createElement('div');
            row.className = 'ssv-toolbar-row';
            tb.insertBefore(row, tb.firstChild);
        }
        var kids = Array.prototype.slice.call(tb.children);
        for (var i = 0; i < kids.length; i++) {
            if (kids[i].tagName === 'BUTTON') { row.appendChild(kids[i]); }
        }
        return row;
    };

    // v2.1.0 (N2): clean two-line header on the skinned layout — line 1
    // the clinic name (still linked to /TajDentalClinic), line 2 patient +
    // date (plain text, never a link). Reuses ONLY the existing header
    // text: the three labels' text, with the en-space/pipe separators
    // stripped. The date stays verbatim ("8/10/2025"). Idempotent — it
    // runs only while no .ssv-header-lines exist, so a Blazor re-render
    // that replaces the header gets restructured again on the next pass.
    Viewer.prototype._restructureHeader = function () {
        var nb = document.querySelector('.navbar');
        if (!nb || nb.querySelector('.ssv-header-lines')) { return; }
        var anchor = nb.querySelector('a.noLink');
        if (!anchor) { return; }
        var labels = anchor.querySelectorAll('label');
        if (labels.length < 3) { return; }
        function clean(t) {
            return (t || '').replace(/\|/g, '').replace(/[\u2000-\u200A\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        var clinic = clean(labels[0].textContent);
        var patient = clean(labels[1].textContent);
        var date = clean(labels[2].textContent);
        if (!clinic || !patient || !date) { return; }
        var lines = document.createElement('div');
        lines.className = 'ssv-header-lines';
        var l1 = document.createElement('div');
        l1.className = 'ssv-header-line1';
        var a = document.createElement('a');
        a.href = anchor.getAttribute('href') || '/TajDentalClinic';
        a.target = '_blank';
        a.textContent = clinic;
        l1.appendChild(a);
        var l2 = document.createElement('div');
        l2.className = 'ssv-header-line2';
        var s1 = document.createElement('span');
        s1.className = 'ssv-header-patient';
        s1.textContent = patient;
        var sep = document.createElement('span');
        sep.className = 'ssv-header-sep';
        sep.textContent = '•';
        var s2 = document.createElement('span');
        s2.className = 'ssv-header-date';
        s2.textContent = date;
        l2.appendChild(s1);
        l2.appendChild(sep);
        l2.appendChild(s2);
        lines.appendChild(l1);
        lines.appendChild(l2);
        anchor.parentNode.replaceChild(lines, anchor);
    };

    // v2.1.0 (N3): Persian filter labels — "Brightness" -> "روشنایی",
    // "Contrast" -> "کنتراست". UI labels only; the inputs and wiring are
    // untouched. Only LEAF divs with exactly that text are replaced, so a
    // parent div that merely contains a label is never wiped. Idempotent:
    // a re-render that restores the English labels gets relabelled again.
    Viewer.prototype._relabelPanel = function () {
        var wc = document.getElementById('ww-wc-container');
        if (!wc) { return; }
        var divs = wc.querySelectorAll('div');
        for (var i = 0; i < divs.length; i++) {
            if (divs[i].children.length) { continue; }
            var t = (divs[i].textContent || '').trim();
            if (t === 'Brightness') { divs[i].textContent = 'روشنایی'; }
            else if (t === 'Contrast') { divs[i].textContent = 'کنتراست'; }
        }
    };

    // v2.1.0 (N1): the privacy banner is created by the loader when the
    // notice first fires. A Blazor re-render can remove it from the DOM —
    // put it back (unless the user dismissed it). The loader owns the
    // state (window.__ssvNotice); this only re-ensures it.
    Viewer.prototype._ensureNoticeBanner = function () {
        var n = window.__ssvNotice;
        if (!n || typeof n.ensureBanner !== 'function') { return; }
        try { n.ensureBanner(); } catch (e) { /* loader owns the fallback */ }
    };

    // v2.0.0 (S2): the Y (stage coordinates) where a fitting image's top
    // edge sits at fit — just under the slim top bar. Measured live from
    // the navbar's real height (it can wrap to two lines), never hardcoded.
    Viewer.prototype._topAnchor = function () {
        var nb = document.querySelector('.navbar');
        var h = nb ? nb.getBoundingClientRect().height : 48;
        var anchor = Math.round(h) + CONFIG.mobileTopGap;
        // v2.1.0 (N1): while the privacy banner is showing, the picture
        // top-anchors BELOW it — the banner must never cover the image.
        var banner = document.getElementById('ssv-privacy-banner');
        if (banner && banner.parentNode) {
            anchor += Math.round(banner.getBoundingClientRect().height);
        }
        return anchor;
    };

    // v2.0.0 (S4): open/close the brightness/contrast panel.
    Viewer.prototype._toggleFilterPanel = function () {
        var p = document.getElementById('smartscan-filters-panel');
        if (!p) { return this; }
        if (p.classList.contains('ssv-open')) { p.classList.remove('ssv-open'); }
        else { p.classList.add('ssv-open'); }
        return this;
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
            self._applySkin();                    // v2.0.0 (S7): a new image can arrive with a re-render
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

        this._mapToolbarActions();
    };

    // Map the legacy ids / icon classes / `iid` typo onto the action
    // vocabulary. Idempotent: buttons that already carry an action are
    // skipped, so _applySkin() can re-run it after a Blazor re-render
    // replaces the toolbar with fresh, unmapped buttons.
    Viewer.prototype._mapToolbarActions = function () {
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
            case 'toggle-filters': this._toggleFilterPanel(); break;   // v2.0.0 (S4): sun button in the bottom bar
            case 'toggle-horizontal': this.toggleHorizontal(); break; // v2.1.0 (R1): افقی button in the bottom bar
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
        // v2.1.0 (R1): the افقی toggle shows its state — pressed exactly
        // while the image is horizontal (90°). Updated here so every path
        // that changes rotation (buttons, keyboard, reset) stays in step.
        var hz = document.querySelector('[data-viewer-action="toggle-horizontal"]');
        if (hz) { hz.setAttribute('aria-pressed', s.rotate === 90 ? 'true' : 'false'); }
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
        // v2.1.0 (R1): a 90°/270° rotation swaps the rendered axes — fit by
        // the ROTATED dimensions, or a horizontal image would fit at half
        // width (its un-rotated width is ~2x its rendered width).
        var effW = m.natW, effH = m.natH;
        if (this.state.rotate % 180 !== 0) { effW = m.natH; effH = m.natW; }
        // v1.0.4 (M2): on small screens a LANDSCAPE image (a panoramic
        // X-ray is ~2:1) fits by WIDTH only — the tall phone stage must
        // never shrink the picture. The pad is small on phones (8px total)
        // so the image fills >=95% of the stage width at default fit.
        // Portrait images keep min(width, height): width-only fitting would
        // make them taller than the stage and crop top/bottom at fit.
        var pad = isSmallScreen() ? CONFIG.mobileFitPad : 32;
        var r;
        if (isSmallScreen() && effW >= effH) {
            r = (m.w - pad) / effW;
        } else {
            r = Math.min((m.w - pad) / effW, (m.h - pad) / effH);
        }
        // v2.1.0 (landscape fit): with the skin active the picture sits
        // BETWEEN the fixed top bar (+ banner, via _topAnchor) and the
        // fixed bottom bar, so the height budget is the space between
        // them — not the full stage height. Without this, a landscape
        // phone fit at 66% and the picture's bottom 24px ran past the
        // viewport, hidden under the bottom bar (93% visible). Portrait
        // is width-limited, so this changes nothing there; desktop never
        // has the skin, so its geometry is untouched.
        if (isSkinActive()) {
            var tb = document.querySelector('.tools-container');
            var tbH = tb ? Math.round(tb.getBoundingClientRect().height) : 0;
            var availH = m.h - this._topAnchor() - tbH - 8;
            var rH = availH / effH;
            if (isFinite(rH) && rH > 0 && rH < r) { r = rH; }
        }
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
        this._atFit = true;   // v2.0.0 (R1): remember we are at fit
        if (isSkinActive()) {
            // v2.0.0 (S2): place the rendered box — horizontally centred,
            // and vertically top-anchored just under the slim top bar when
            // it fits there without clipping (the panoramic case: the old
            // vertical centring is what left the picture floating low in
            // the tall stage with dark space above it). When the box is too
            // tall to top-anchor (a landscape phone, or a portrait image),
            // centre it — but never let its top hide under the top bar.
            // _constrain() below only clamps on the skin; the placement
            // above is already inside the centre-clamp bounds.
            var rb = this._renderedBox();
            this.state.x = (rb.w - rb.boxW) / 2 - rb.uMin;
            var anchor = this._topAnchor();
            if (rb.boxH <= rb.h - anchor - 8) {
                this.state.y = anchor - rb.vMin;
            } else {
                this.state.y = Math.max(anchor, (rb.h - rb.boxH) / 2) - rb.vMin;
            }
        }
        // Let _constrain() place it on desktop: it accounts for any rotation /
        // mirror already applied, which a plain (m.w - natW*s)/2 would not.
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
        // v2.0.0 (R1): a zoom that lands at-or-below fit scale leaves the
        // user at fit (e.g. pinching back in), so a later rotation re-fits.
        this._atFit = (newScale <= this.fitScale() * 1.001);

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

    // The real rendered bounding box of the image under the current
    // transform (translate/rotate/scale/flip), in stage coordinates, as
    // [uMin, uMax] x [vMin, vMax] before the translate is applied. The old
    // code assumed the un-mirrored, un-rotated box, so after a flip it
    // centred on a box that no longer existed and pushed the image off
    // screen. Compute the real box instead: the four local corners
    // (0,0) (natW,0) (natW,natH) (0,natH) map to u = A*px + B*py,
    // v = C*px + D*py, and the extremes are the sums of the per-axis
    // extremes, which avoids enumerating the corners.
    Viewer.prototype._renderedBox = function () {
        var m = this._metrics();
        var s = this.state;
        var rad = s.rotate * Math.PI / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);

        // Signed scale factors, exactly as _apply() writes them.
        var sx = s.scale * s.flipH;
        var sy = s.scale * s.flipV;

        var A = cos * sx, B = -sin * sy;
        var C = sin * sx, D = cos * sy;

        var uMin = Math.min(0, A * m.natW) + Math.min(0, B * m.natH);
        var uMax = Math.max(0, A * m.natW) + Math.max(0, B * m.natH);
        var vMin = Math.min(0, C * m.natW) + Math.min(0, D * m.natH);
        var vMax = Math.max(0, C * m.natW) + Math.max(0, D * m.natH);

        return { uMin: uMin, uMax: uMax, vMin: vMin, vMax: vMax,
                 boxW: uMax - uMin, boxH: vMax - vMin, w: m.w, h: m.h };
    };

    // Keep the image from being dragged entirely out of its box.
    //
    // The transform is `translate(x,y) rotate(r) scale(s*fh, s*fv)` with
    // transform-origin 0 0, so the rendered box is NOT simply [x, x+w]: a
    // mirror (fh = -1) makes the image extend to the LEFT of x, and a rotation
    // mixes the axes. _renderedBox() computes the real box.
    //
    // v2.0.0 (S6): on the skinned layout a FITTING image is NOT force-centred
    // any more — that is what pinned the picture in the middle of the tall
    // stage and made fit() fight every drag. Instead its CENTRE is clamped
    // inside the stage, so the image can be panned freely (including at fit
    // scale) but never dragged fully out of view: at least half of it is
    // always visible. An image LARGER than the stage keeps the old
    // cover-clamp. Desktop (no skin) keeps the v1.0.4 centre-when-fitting
    // behaviour byte-for-byte.
    Viewer.prototype._constrain = function () {
        var rb = this._renderedBox();
        var s = this.state;

        if (rb.boxW <= rb.w) {
            if (isSkinActive()) {
                var cx = s.x + (rb.uMin + rb.uMax) / 2;
                cx = clamp(cx, 0, rb.w);
                s.x = cx - (rb.uMin + rb.uMax) / 2;
            } else {
                s.x = (rb.w - rb.boxW) / 2 - rb.uMin;
            }
        } else { s.x = clamp(s.x, rb.w - rb.uMax, -rb.uMin); }

        if (rb.boxH <= rb.h) {
            if (isSkinActive()) {
                var cy = s.y + (rb.vMin + rb.vMax) / 2;
                cy = clamp(cy, 0, rb.h);
                s.y = cy - (rb.vMin + rb.vMax) / 2;
            } else {
                s.y = (rb.h - rb.boxH) / 2 - rb.vMin;
            }
        } else { s.y = clamp(s.y, rb.h - rb.vMax, -rb.vMin); }
    };

    /* ---------------------------- rotation ---------------------------- */
    Viewer.prototype.rotate = function (deg) {
        // Rotation must NOT reset the zoom (the old code did).
        this.state.rotate = ((this.state.rotate + deg) % 360 + 360) % 360;
        this._constrain();
        this._apply();
        return this;
    };

    // v2.1.0 (R1): one-tap horizontal view — 0° -> 90°, 90° -> 0°; from
    // 180°/270° (reached with the rotate buttons) it returns to 0°.
    // Re-fits, so the rotated image fills the screen (fitScale() is
    // rotation-aware); a plain rotate at the old scale would leave a
    // horizontal image at half width.
    Viewer.prototype.toggleHorizontal = function () {
        this.state.rotate = (this.state.rotate === 90) ? 0 : (this.state.rotate === 0 ? 90 : 0);
        this.fit();
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
    // Idempotent (v2.0.0): _applySkin() re-runs this after a Blazor
    // re-render replaces the sliders with fresh nodes. Bound inputs are
    // marked data-ssv-bound and skipped, so a second call never stacks a
    // duplicate listener on the same node.
    Viewer.prototype._bindFilterInputs = function () {
        var self = this;
        ['brightness', 'contrast', 'invert'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || el.getAttribute('data-ssv-bound')) { return; }
            var handler = function () { self.syncFiltersFromInputs(); };
            self.disposers.push(on(el, 'input', handler));
            self.disposers.push(on(el, 'change', handler));
            el.setAttribute('data-ssv-bound', '1');
        });

        // The reset links in the OLD markup carry no handler of their own, so
        // bind them here. In the NEW markup `reset-contrast` is the invert
        // toggle and already carries data-viewer-action, so skip anything the
        // delegated toolbar listener owns — otherwise one click would both
        // toggle invert and reset contrast.
        var rb = document.getElementById('reset-brightness');
        if (rb && !rb.getAttribute('data-viewer-action') && !rb.getAttribute('data-ssv-bound')) {
            self.disposers.push(on(rb, 'click', function (e) {
                e.preventDefault();
                self.setFilter('brightness', 100);
                self._syncLegacyFilterInputs();
            }));
            rb.setAttribute('data-ssv-bound', '1');
        }
        var rc = document.getElementById('reset-contrast');
        if (rc && !rc.getAttribute('data-viewer-action') && !rc.getAttribute('data-ssv-bound')) {
            self.disposers.push(on(rc, 'click', function (e) {
                e.preventDefault();
                self.setFilter('contrast', 100);
                self._syncLegacyFilterInputs();
            }));
            rc.setAttribute('data-ssv-bound', '1');
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
            this.panned = false;   // v2.0.0 (S8): reset per gesture
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

        // v2.0.0 (S6): on the skinned layout pan works ALWAYS — at fit scale
        // too, not only when zoomed. The old gate (this._isZoomed()) is what
        // made the picture "cannot be moved up" at fit scale. _constrain()
        // keeps the image in view (centre-clamp), so dragging can never lose
        // it. Desktop keeps the v1.0.4 gate: pan only when zoomed.
        if (CONFIG.pan && (isSkinActive() || this._isZoomed())) {
            this.state.x = this.panStart.sx + dx;
            this.state.y = this.panStart.sy + dy;
            this.panned = true;   // v2.0.0 (S8): this drag moved the image
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
        // v2.0.0 (S8): never when the drag actually panned the image — with
        // pan-always-on, a horizontal drag at fit scale would otherwise both
        // pan AND switch images. (Desktop is unaffected: there pan only runs
        // when zoomed, and swipe already requires !zoomed.)
        if (CONFIG.swipeBetweenImages && !zoomed && moved && !this.panned &&
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
        version: '2.1.0',
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
                    // Re-apply the skin first (v2.0.0, S7: a re-render can
                    // have replaced the toolbar/sliders/footer with fresh
                    // nodes that sit in their original positions), then
                    // re-fit, because the layout may have changed.
                    if (inst.bound) { inst._applySkin(); inst.fit(); } else { inst.init(); }
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
        // v2.0.0 (S7): re-apply the full-screen skin (idempotent no-op when
        // the skin is not active). Called by the MutationObserver on every
        // DOM change, so a re-render that only replaced the toolbar or the
        // sliders — not the image — still gets its skin back.
        applySkin: function () { var i = this.get(); if (i) { i._applySkin(); } return this; },
        rotate: function (d) { var i = this.get(); if (i) { i.rotate(d); } return this; },
        toggleHorizontal: function () { var i = this.get(); if (i) { i.toggleHorizontal(); } return this; },
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
        if (!i) { return; }
        // v2.0.0 (S7): re-apply the skin first — a rotation re-wraps the
        // bottom bar, so the thumbnail strip and filters panel must be
        // re-measured. No-op on desktop (no skin, not small).
        i._applySkin();
        // v1.0.4 (M1): rotating the phone (or the mobile URL bar showing /
        // hiding) changes the viewport, so the stage height is re-pinned
        // before any re-fit. Desktop is untouched: the old pin is only
        // recomputed at init / image load there, exactly as in v1.0.3.
        // v2.0.0: also re-pin when the skin is active — a phone rotated to
        // landscape is wider than the breakpoint but the skinned stage is
        // still full-viewport, so its height must follow innerHeight.
        if (isSmallScreen() || isSkinActive()) { i._pinFallbackStage(); }
        // v1.0.4 (rotation fix): ALWAYS re-constrain on resize, not only
        // when at fit scale. A stage that shrank (phone rotated landscape
        // -> portrait) leaves a previously centred image shifted sideways
        // — e.g. fit at 81% in landscape keeps translate x=+16, which in
        // a 390px portrait stage puts the image centre off-screen and
        // pinch then touches empty page. _constrain() re-centres a fitting
        // image and clamps a zoomed one; it never changes the scale, so
        // the user's zoom level is preserved. (Pre-existing v1.0.3 gap:
        // its resize handler only re-fit at-or-below fit scale, so a
        // zoomed image was never re-constrained on any resize.)
        i._constrain();
        i._apply();
        // v2.0.0 (R1): re-fit when the user was AT fit before the resize,
        // not only when the new fit scale is larger. Without this,
        // portrait -> landscape -> portrait left the picture zoomed at the
        // landscape fit (66%) with only 59% of its width visible.
        if (i._atFit || i.state.scale <= i.fitScale() * 1.001) { i.fit(); }
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
                // v2.0.0 (S7): also re-apply the skin on EVERY DOM change,
                // unconditionally — a re-render can replace the toolbar, the
                // sliders or the footer without touching the image, and the
                // skin must come back. _applySkin() is idempotent, so a
                // no-op pass costs one querySelector round and no mutations.
                SmartScanViewer.applySkin();
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Leaving the page: drop every listener so the browser can collect the DOM.
    window.addEventListener('pagehide', function () { SmartScanViewer.dispose(); });

    window.SmartScanViewer = SmartScanViewer;

})(window, document);
