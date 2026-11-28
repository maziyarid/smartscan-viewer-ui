/* BEGIN SmartScan UX fix v1.0.0 (2026-11-28) - notice close, rotate/flip, touch zoom, layout, Persian date */
(function () {
    'use strict';
    // Fixes for the patient OPG viewer (smartscan-viewer.js pro skin v2.5.2):
    // 1. Privacy notice: the close button removed the banner, but the pro
    //    skin's MutationObserver re-ran enhance() -> ensureNotice() and put
    //    it straight back. Dismissal is now remembered on this device (localStorage) and
    //    the banner is hidden with CSS, so re-creating it does nothing.
    // 2. Rotate re-fits the image (it used to overflow the stage); when the
    //    image is zoomed in, rotate and flip keep the same visual centre
    //    (flip used to throw the image off-screen).
    // 3. Zoom out works at "fit" (down to half of fit); a pinch that ends
    //    below fit springs back to fit.
    // 4. Touch: the whole stage (not only the image) takes pinch and pan, so
    //    pinching the dark area no longer zooms the whole page. Pinch follows
    //    the fingers (zoom + pan together), the remaining finger keeps
    //    panning after a pinch, and pan follows the finger in the rotated
    //    full-screen (landscape) mode.
    // 5. Layout: tablets get the mobile skin; desktop header spans the full
    //    width; laptop header is one row; a single thumbnail is hidden on
    //    wide screens (it covered the image); full-screen button label and
    //    touch hint text fixed; "fit" shows the whole image.
    // All text is ASCII; Persian is written as \u escapes.
    if (window.__ssvUxFix) { return; }
    window.__ssvUxFix = { version: '1.1.0' };

    var KEY = 'ssv-notice-dismissed';
    var doc = document.documentElement;
    var L = {
        fullscreen: '\u062a\u0645\u0627\u0645\u200c\u0635\u0641\u062d\u0647',            // tamam-safhe
        landscape: '\u0646\u0645\u0627\u06cc \u0627\u0641\u0642\u06cc',                  // namaye ofoghi
        hintTouch: '\u0628\u0627 \u062f\u0648 \u0627\u0646\u06af\u0634\u062a \u0628\u0632\u0631\u06af \u06a9\u0646\u06cc\u062f \u2022 \u062f\u0648 \u0628\u0627\u0631 \u0636\u0631\u0628\u0647 \u0628\u0631\u0627\u06cc \u0628\u0632\u0631\u06af\u200c\u0646\u0645\u0627\u06cc\u06cc'
    };

    function store(get, val) {
        try {
            if (get) { return window.localStorage.getItem(KEY) === '1'; }
            window.localStorage.setItem(KEY, val ? '1' : '0');
        } catch (e) { /* storage blocked: fall back to the in-page flag */ }
        return false;
    }

    // ---- styles -------------------------------------------------------
    var CSS = [
        'html.ssv-notice-dismissed #ssv-privacy-banner#ssv-privacy-banner{display:none!important}',
        '#ssv-privacy-banner .ssv-notice-close,#ssv-privacy-banner .ssv-banner-close{min-width:44px!important;min-height:44px!important;cursor:pointer!important;touch-action:manipulation!important}',
        'html.ssv-pro .navbar{left:0!important;right:0!important;width:auto!important;margin:0!important}',
        'html.ssv-pro #preview-container{touch-action:none!important;overscroll-behavior:contain!important}',
        'html.ssv-pro .ssv-pro-toolbar button{touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}',
        'html.ssv-pro .ssv-pro-toolbar button[disabled]{opacity:.38!important;cursor:default!important}',
        '@media (min-width:900px){',
        ' html.ssv-pro.ssv-fullscreen .navbar{display:flex!important;align-items:center!important;height:auto!important;min-height:56px!important;padding:8px 24px!important}',
        ' html.ssv-pro.ssv-fullscreen .navbar .brand{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important}',
        ' html.ssv-pro.ssv-fullscreen .navbar .ssv-header-lines{display:flex!important;flex-wrap:wrap!important;align-items:baseline!important;gap:2px 14px!important;width:auto!important;margin:0!important;text-align:start!important}',
        ' html.ssv-pro.ssv-fullscreen .navbar .ssv-header-lines>*{width:auto!important;margin:0!important}',
        ' html.ssv-pro.ssv-single-image .thumbnail-container{display:none!important}',
        '}',
        'html.ssv-pro.ssv-pro .tools-container .ssv-pro-toolbar.ssv-pro-toolbar .ssv-pro-label{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;white-space:normal!important;text-overflow:clip!important;overflow:hidden!important;line-height:1.05!important}',
        '@media (max-width:899px){html.ssv-pro.ssv-pro .tools-container .ssv-pro-toolbar.ssv-pro-toolbar{grid-template-rows:none!important;grid-auto-rows:auto!important}}',
        '@media (min-width:1200px){html.ssv-pro.ssv-pro .tools-container .ssv-pro-toolbar.ssv-pro-toolbar button:not(.ssv-pro-compat){flex:0 0 auto!important;width:auto!important;min-width:58px!important;padding-left:9px!important;padding-right:9px!important}html.ssv-pro.ssv-pro .tools-container .ssv-pro-toolbar.ssv-pro-toolbar .ssv-pro-label{white-space:nowrap!important;font-size:10px!important}}'
    ].join('\n');

    function injectCss() {
        if (document.getElementById('ssv-ux-fix-css')) { return; }
        var st = document.createElement('style');
        st.id = 'ssv-ux-fix-css';
        st.appendChild(document.createTextNode(CSS));
        (document.head || doc).appendChild(st);
    }

    // ---- 1. privacy notice -------------------------------------------
    function refit() {
        window.setTimeout(function () {
            try { window.dispatchEvent(new Event('resize')); } catch (e) { /* old browser */ }
        }, 30);
    }
    function dismissNotice() {
        store(false, true);
        if (!doc.classList.contains('ssv-notice-dismissed')) {
            doc.classList.add('ssv-notice-dismissed');
            refit();
        }
    }
    if (store(true)) { doc.classList.add('ssv-notice-dismissed'); }
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('#ssv-privacy-banner .ssv-notice-close, #ssv-privacy-banner .ssv-banner-close')) {
            dismissNotice();
        }
    }, true);

    // ---- 2-4. viewer behaviour ---------------------------------------
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function centre(inst) {
        var b = inst._renderedBox(), s = inst.state;
        return { x: s.x + (b.uMin + b.uMax) / 2, y: s.y + (b.vMin + b.vMax) / 2 };
    }
    function setCentre(inst, c) {
        var b = inst._renderedBox(), s = inst.state;
        s.x = c.x - (b.uMin + b.uMax) / 2;
        s.y = c.y - (b.vMin + b.vMax) / 2;
    }
    function skinOn() {
        return doc.classList.contains('ssv-fullscreen') || doc.classList.contains('ssv-immersive');
    }

    function patch(api, inst) {
        var proto = Object.getPrototypeOf(inst);
        if (!proto || proto.__ssvUxPatched) { return; }
        proto.__ssvUxPatched = true;
        var cfg = api.config || {};
        var origRotate = proto.rotate, origFlip = proto.flip, origUp = proto._onPointerUp;

        var origDetails = proto._patientDetails;
        if (typeof origDetails === 'function') {
            proto._patientDetails = function () {
                var r = origDetails.apply(this, arguments);
                if (r && r.date) { var j = toJalali(r.date); if (j) { r.date = j; } }
                return r;
            };
        }

        proto._minAllowed = function () {
            var f = this.fitScale();
            return Math.min(cfg.minScale || 0.5, f * 0.5);
        };

        proto.rotate = function (deg) {
            var zoomed = this._isZoomed();
            var c = centre(this);
            origRotate.call(this, deg);
            if (zoomed) {
                setCentre(this, c);
                this._constrain();
                this._apply();
            } else {
                this.fit();
            }
            return this;
        };

        proto.flip = function (axis) {
            var c = centre(this);
            origFlip.call(this, axis);
            setCentre(this, c);
            this._constrain();
            this._apply();
            return this;
        };

        proto._onPointerMove = function (e) {
            if (!this.pointers || !this.pointers.has(e.pointerId)) { return; }
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            var s = this.state;
            if (this.pinchStart && this.pointers.size >= 2) {
                var pts = Array.from(this.pointers.values());
                var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
                var mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
                var ps = this.pinchStart;
                var last = ps.lastMid || ps.mid;
                var a = this._toLocalPoint(last.x, last.y), b = this._toLocalPoint(mid.x, mid.y);
                s.x += b.x - a.x;
                s.y += b.y - a.y;
                ps.lastMid = mid;
                var target = clamp(ps.scale * (dist / ps.dist), this._minAllowed(), cfg.maxScale || 8);
                var k = target / s.scale;
                s.x = b.x - k * (b.x - s.x);
                s.y = b.y - k * (b.y - s.y);
                s.scale = target;
                this._atFit = target <= this.fitScale() * 1.001;
                this._constrain();
                this._apply();
                if (e.cancelable) { e.preventDefault(); }
                return;
            }
            var p = this.panStart;
            if (!p || p.id !== e.pointerId) { return; }
            var dx = e.clientX - p.x, dy = e.clientY - p.y;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { p.moved = true; }
            if (cfg.pan === false || !(skinOn() || this._isZoomed())) { return; }
            var p0 = this._toLocalPoint(p.x, p.y), p1 = this._toLocalPoint(e.clientX, e.clientY);
            s.x = p.sx + (p1.x - p0.x);
            s.y = p.sy + (p1.y - p0.y);
            this.panned = true;
            this._constrain();
            this._apply();
            if (e.cancelable) { e.preventDefault(); }
        };

        proto._onPointerUp = function (e) {
            var wasPinch = !!this.pinchStart;
            if (wasPinch) { this.__ssvPinched = true; }
            origUp.call(this, e);
            if (!this.pointers) { return; }
            if (this.pointers.size === 0 && this.__ssvPinched) {
                this.__ssvPinched = false;
                if (this.state.scale < this.fitScale() * 0.98) { this.fit(); }
                return;
            }
            if (!wasPinch) { return; }
            if (this.pointers.size === 1) {
                // keep panning with the finger that is still down
                var id = Array.from(this.pointers.keys())[0];
                var pt = this.pointers.get(id);
                this.panStart = { id: id, x: pt.x, y: pt.y, sx: this.state.x, sy: this.state.y, moved: true };
                this.panned = true;
                this.lastTapAt = 0;
            }
        };
    }

    // "Fit" must show the whole radiograph: the pro skin's fit enlarged
    // the image 8% on portrait phones and let it run 15% past the stage,
    // which cut off the edges (third molars). Cap it at a true contain-fit.
    function capFit(inst) {
        if (!inst || inst.__ssvUxFitCap || typeof inst.fitScale !== 'function') { return; }
        inst.__ssvUxFitCap = true;
        var orig = inst.fitScale;
        inst.fitScale = function () {
            var r = orig.call(this);
            var m = this._metrics();
            var turned = this.state.rotate % 180 !== 0;
            var iw = turned ? m.natH : m.natW, ih = turned ? m.natW : m.natH;
            var pad = doc.classList.contains('ssv-immersive') ? 0 : ((window.innerWidth || 0) < 900 ? 4 : 24);
            var contain = Math.min(Math.max(1, m.w - pad) / iw, Math.max(1, m.h - pad) / ih);
            return (isFinite(contain) && contain > 0 && contain < r) ? contain : r;
        };
    }

    // Gestures that start on the dark stage area go to the viewer too.
    document.addEventListener('pointerdown', function (e) {
        var api = window.SmartScanViewer, inst = api && api.get && api.get();
        if (!inst || !inst.stage || !inst.canvas || e.target === inst.canvas) { return; }
        var t = e.target;
        if (!t || !t.closest || !inst.stage.contains(t)) { return; }
        if (t.closest('button, a, input, select, textarea, label, [role="button"]')) { return; }
        inst._onPointerDown(e);
    }, { passive: false });
    document.addEventListener('gesturestart', function (e) {
        var st = document.getElementById('preview-container');
        if (st && e.target && st.contains(e.target) && e.cancelable) { e.preventDefault(); }
    }, { passive: false });


    // ---- 6. Persian (Jalali) date ------------------------------------
    // The page prints the scan date as Gregorian M/D/YYYY (en-US server
    // culture), e.g. 8/10/2025. Show it like the DrB dashboard does:
    // weekday, day, month name and year in the Persian calendar with
    // Persian digits. If the first number is above 12 the order is D/M.
    var DATE_RE = /(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/;
    function toJalali(txt) {
        var m = DATE_RE.exec(txt);
        if (!m) { return null; }
        var a = +m[1], b = +m[2], c = +m[3], y, mo, d;
        if (m[1].length === 4) { y = a; mo = b; d = c; }
        else { y = c < 100 ? 2000 + c : c; if (a > 12) { d = a; mo = b; } else { mo = a; d = b; } }
        if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) { return null; }
        var dt = new Date(Date.UTC(y, mo - 1, d, 12));
        if (dt.getUTCMonth() !== mo - 1) { return null; }
        try {
            var parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(dt);
            var P = {};
            for (var k = 0; k < parts.length; k++) { P[parts[k].type] = parts[k].value; }
            if (!P.day || !P.month || !P.year) { return null; }
            var s = (P.weekday ? P.weekday + ' ' : '') + P.day + ' ' + P.month + ' ' + P.year;
            return txt.replace(m[0], s);
        } catch (e) { return null; }
    }
    function persianDates() {
        var els = document.querySelectorAll('.ssv-header-date, .navbar a.noLink label');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.children.length) { continue; }
            var out = toJalali(el.textContent || '');
            if (out && out !== el.textContent) {
                el.setAttribute('data-ssv-gregorian', el.textContent);
                el.textContent = out;
            }
        }
    }
    window.__ssvUxFix.toJalali = toJalali;

    // ---- 5. layout decorations (idempotent) -------------------------
    function isTouch() {
        return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    }
    function setText(el, text) { if (el && el.textContent !== text) { el.textContent = text; } }
    function setAttr(el, name, val) { if (el && el.getAttribute(name) !== val) { el.setAttribute(name, val); } }

    function decorate() {
        // The page can re-create the viewer instance (Blazor re-render), and
        // the pro skin re-installs its own fit on the new instance: cap it again.
        var api = window.SmartScanViewer, inst = api && typeof api.get === 'function' ? api.get() : null;
        if (inst && inst.__ssvProfessionalFit && !inst.__ssvUxFitCap) {
            capFit(inst);
            try { inst.fit(); } catch (e) { /* not ready */ }
        }
        persianDates();
        var wide = (window.innerWidth || 0) >= 900;
        var phone = !wide && isTouch();
        var fs = document.querySelector('.ssv-pro-toolbar [data-viewer-action="fullscreen"]:not(.ssv-pro-compat)');
        if (fs) {
            var label = phone ? L.landscape : L.fullscreen;
            setText(fs.querySelector('.ssv-pro-label'), label);
            setAttr(fs, 'aria-label', label);
            setAttr(fs, 'title', label);
        }
        if (isTouch()) { setText(document.querySelector('#preview-container .ssv-pro-hint'), L.hintTouch); }
        var thumbs = document.querySelectorAll('.thumbnail-container .thumbnail, .thumbnail-container img');
        doc.classList.toggle('ssv-single-image', thumbs.length <= 1);
        if (store(true) && !doc.classList.contains('ssv-notice-dismissed')) { doc.classList.add('ssv-notice-dismissed'); }
    }

    var queued = false;
    function schedule() {
        if (queued) { return; }
        queued = true;
        (window.requestAnimationFrame || window.setTimeout)(function () { queued = false; decorate(); });
    }

    var tries = 0;
    function boot() {
        injectCss();
        var api = window.SmartScanViewer;
        var inst = api && typeof api.get === 'function' ? api.get() : null;
        if (!inst || !inst.__ssvProfessionalFit) {
            if (++tries < 150) { window.setTimeout(boot, 200); }
            return;
        }
        if (api.config && api.config.mobileBreakpoint < 1024) {
            api.config.mobileBreakpoint = 1024;   // tablets get the mobile skin
            try { inst._applySkin(); } catch (e) { /* skin not ready */ }
        }
        patch(api, inst);
        capFit(inst);
        decorate();
        if (typeof MutationObserver !== 'undefined' && document.body) {
            new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
        }
        window.addEventListener('resize', schedule);
        refit();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
/* END SmartScan UX fix v1.0.0 (2026-11-28) */
