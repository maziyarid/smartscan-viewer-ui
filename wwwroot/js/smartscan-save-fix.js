/*!
 * SmartScan save fix v1.0.0 \u2014 2026-11-27
 *
 * Add-on for the LIVE viewer (smartscan-viewer.js 2.4.0 + professional
 * toolbar skin loaded by bootstrap.js ?v=2.5.2). Load it AFTER the viewer:
 *   <script src="/js/smartscan-save-fix.js?v=1.0.0" defer></script>
 * It does not replace or edit smartscan-viewer.js, so it cannot undo any
 * live-only change made after the GitHub copy (2.3.1).
 *
 * Problem (Maziyar, 26 Nov): the save icon downloads only the bare OPG;
 * patient name/date/ID are missing; the button misbehaves on phones.
 * Root cause: the 2.5.x professional skin keeps only ONE visible save
 * button (\u00ab\u0630\u062e\u06cc\u0631\u0647\u00bb, action "save" = bare image). The details save
 * ("save-details") became a hidden aria-hidden placeholder, so nobody can
 * reach it. On phones, <a download> with a big data: URL is ignored by
 * many in-app browsers (Telegram, WhatsApp, Instagram) and by iOS Safari.
 *
 * What this add-on changes:
 *  1. Tapping \u00ab\u0630\u062e\u06cc\u0631\u0647\u00bb opens a small two-choice sheet:
 *       \u00ab\u0630\u062e\u06cc\u0631\u0647 \u0628\u0627 \u0645\u0634\u062e\u0635\u0627\u062a \u0628\u06cc\u0645\u0627\u0631\u00bb (default, first)  and  \u00ab\u0641\u0642\u0637 \u062a\u0635\u0648\u06cc\u0631\u00bb.
 *  2. The details version puts name | date on line 1 and clinic | ID on
 *     line 2 in a dark band ABOVE the radiograph. The OPG pixels are never
 *     covered. The current rotation / flip / filters are kept.
 *  3. Quality 0.95 for both saves (doctors need to read the image).
 *  4. Persian text uses the site's own font (Vazir / IRANSans) after
 *     document.fonts is ready; falls back to sans-serif.
 *  5. Download uses a Blob URL. If the browser cannot download files
 *     (in-app browsers, iOS), it uses the phone's share sheet with the
 *     file; if that is unavailable too, it opens the image in a new tab
 *     with a Persian hint to long-press and save.
 * Everything else in the viewer is untouched.
 */
(function (window, document) {
    'use strict';

    var VERSION = '1.0.0';
    var SHEET_ID = 'ssv-save-sheet';
    var QUALITY = 0.95;

    function waitForViewer(cb, tries) {
        tries = tries || 0;
        var api = window.SmartScanViewer;
        var inst = api && typeof api.get === 'function' ? api.get() : null;
        if (api && inst) { return cb(api, inst); }
        if (tries > 200) { return; } // ~40s, then give up quietly
        window.setTimeout(function () { waitForViewer(cb, tries + 1); }, 200);
    }

    function pickFont() {
        var families = ['Vazir', 'IRANSansWeb', 'IRANSans', 'iran-sans'];
        try {
            if (document.fonts && document.fonts.check) {
                for (var i = 0; i < families.length; i++) {
                    if (document.fonts.check('16px "' + families[i] + '"')) {
                        return '"' + families[i] + '", sans-serif';
                    }
                }
            }
        } catch (e) { /* ignore */ }
        return 'sans-serif';
    }

    function fontsReady() {
        try {
            if (document.fonts && document.fonts.ready) { return document.fonts.ready; }
        } catch (e) { /* ignore */ }
        return Promise.resolve();
    }

    // Render the current view (rotation, flip, filters) exactly like the
    // viewer's own save(), at native resolution.
    function renderView(inst) {
        var c = inst.canvas;
        var s = inst.state || { rotate: 0, flipH: 1, flipV: 1 };
        var f = inst.filters || { brightness: 100, contrast: 100, saturate: 100, invert: 0, grayscale: 0 };
        var rad = (s.rotate || 0) * Math.PI / 180;
        var w = c.naturalWidth, h = c.naturalHeight;
        var bw = Math.ceil(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)));
        var bh = Math.ceil(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)));
        var view = document.createElement('canvas');
        view.width = bw;
        view.height = bh;
        var ctx = view.getContext('2d');
        ctx.filter = 'brightness(' + f.brightness + '%) contrast(' + f.contrast + '%) ' +
            'saturate(' + f.saturate + '%) invert(' + f.invert + '%) grayscale(' + f.grayscale + '%)';
        ctx.translate(bw / 2, bh / 2);
        ctx.rotate(rad);
        ctx.scale(s.flipH || 1, s.flipV || 1);
        ctx.drawImage(c, -w / 2, -h / 2, w, h);
        return view;
    }

    function fitText(ctx, text, size, weight, family, maxW, minSize) {
        ctx.font = weight + size + 'px ' + family;
        while (size > minSize && ctx.measureText(text).width > maxW) {
            size -= 2;
            ctx.font = weight + size + 'px ' + family;
        }
    }

    // Band ABOVE the image; the radiograph is drawn below it, uncovered.
    function addDetailsBand(view, d) {
        var bw = view.width;
        var bandH = Math.max(56, Math.min(120, Math.round(bw * 0.05)));
        var out = document.createElement('canvas');
        out.width = bw;
        out.height = view.height + bandH;
        var ctx = out.getContext('2d');
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, bw, bandH);
        ctx.drawImage(view, 0, bandH);

        var family = pickFont();
        var pad = Math.max(12, Math.round(bw * 0.02));
        var maxW = bw - pad * 2;
        var line1 = [d.patient, d.date].filter(Boolean).join('  |  ');
        var line2 = [d.clinic, d.id ? '\u0634\u0646\u0627\u0633\u0647: ' + d.id : ''].filter(Boolean).join('  |  ');

        ctx.fillStyle = '#ffffff';
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        if (line1) {
            fitText(ctx, line1, Math.round(bandH * 0.34), 'bold ', family, maxW, 12);
            ctx.fillText(line1, bw - pad, bandH * (line2 ? 0.32 : 0.5));
        }
        if (line2) {
            fitText(ctx, line2, Math.round(bandH * 0.27), '', family, maxW, 11);
            ctx.fillText(line2, bw - pad, bandH * 0.72);
        }
        return out;
    }

    function fileName(inst, suffix) {
        var c = inst.canvas;
        var base = (c.currentSrc || c.src || 'image').split('/').pop().split('?')[0] || 'image';
        return base.replace(/\.[^.]+$/, '') + suffix + '.jpg';
    }

    function canDownloadAttr() {
        var ua = navigator.userAgent || '';
        var inApp = /Telegram|WhatsApp|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(ua);
        var iOS = /iPhone|iPad|iPod/i.test(ua);
        return !inApp && !iOS && ('download' in document.createElement('a'));
    }

    function openFallback(url) {
        var w = window.open('', '_blank');
        if (!w) { window.location.href = url; return; }
        w.document.write('<!doctype html><html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="margin:0;background:#000;color:#fff;font-family:sans-serif;text-align:center">' +
            '<p style="padding:10px;margin:0">\u0628\u0631\u0627\u06cc \u0630\u062e\u06cc\u0631\u0647\u060c \u0627\u0646\u06af\u0634\u062a \u0631\u0627 \u0631\u0648\u06cc \u062a\u0635\u0648\u06cc\u0631 \u0646\u06af\u0647 \u062f\u0627\u0631\u06cc\u062f \u0648 \u00ab\u0630\u062e\u06cc\u0631\u0647 \u062a\u0635\u0648\u06cc\u0631\u00bb \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f.</p>' +
            '<img src="' + url + '" style="max-width:100%;height:auto"></body></html>');
        w.document.close();
    }

    function deliver(canvas, name) {
        return new Promise(function (resolve) {
            canvas.toBlob(function (blob) {
                if (!blob) { resolve('failed'); return; }
                var url = URL.createObjectURL(blob);
                window.__ssvLastSave = { kind: name.indexOf('-details') > 0 ? 'details' : 'plain', width: canvas.width, height: canvas.height, fix: VERSION };
                window.__ssvLastSaveCanvas = canvas;

                if (canDownloadAttr()) {
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
                    resolve('download');
                    return;
                }
                var file = null;
                try { file = new File([blob], name, { type: 'image/jpeg' }); } catch (e) { file = null; }
                if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({ files: [file], title: name }).then(function () { resolve('share'); },
                        function () { openFallback(url); resolve('tab'); });
                    return;
                }
                openFallback(url);
                resolve('tab');
            }, 'image/jpeg', QUALITY);
        });
    }

    function save(inst, withDetails) {
        var c = inst.canvas;
        if (!c || !c.naturalWidth) { return Promise.resolve('no-image'); }
        return fontsReady().then(function () {
            var view = renderView(inst);
            var d = (withDetails && typeof inst._patientDetails === 'function') ? inst._patientDetails() : null;
            var hasDetails = d && (d.patient || d.date || d.clinic || d.id);
            var out = hasDetails ? addDetailsBand(view, d) : view;
            return deliver(out, fileName(inst, hasDetails ? '-smartscan-details' : '-smartscan'));
        });
    }

    function closeSheet() {
        var s = document.getElementById(SHEET_ID);
        if (s) { s.parentNode.removeChild(s); }
    }

    function openSheet(inst) {
        closeSheet();
        var wrap = document.createElement('div');
        wrap.id = SHEET_ID;
        wrap.setAttribute('dir', 'rtl');
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-label', '\u0630\u062e\u06cc\u0631\u0647 \u062a\u0635\u0648\u06cc\u0631');
        wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);' +
            'display:flex;align-items:flex-end;justify-content:center;';
        var box = document.createElement('div');
        box.style.cssText = 'width:100%;max-width:420px;background:#1b1f24;color:#fff;border-radius:14px 14px 0 0;' +
            'padding:14px 14px calc(14px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:' + pickFont() + ';';
        var title = document.createElement('div');
        title.textContent = '\u0630\u062e\u06cc\u0631\u0647 \u062a\u0635\u0648\u06cc\u0631';
        title.style.cssText = 'font-weight:bold;margin:0 4px 10px;font-size:15px;';
        box.appendChild(title);

        function addBtn(label, hint, primary, onClick) {
            var b = document.createElement('button');
            b.type = 'button';
            b.style.cssText = 'display:block;width:100%;min-height:48px;margin:0 0 8px;border:0;border-radius:10px;' +
                'padding:10px 12px;text-align:right;font:inherit;font-size:15px;cursor:pointer;' +
                (primary ? 'background:#0ea5ff;color:#001018;' : 'background:#2b323a;color:#fff;');
            b.innerHTML = '';
            var l = document.createElement('div'); l.textContent = label; l.style.fontWeight = 'bold';
            var h = document.createElement('div'); h.textContent = hint; h.style.cssText = 'font-size:12px;opacity:.8;margin-top:2px;';
            b.appendChild(l); b.appendChild(h);
            b.addEventListener('click', function () {
                b.disabled = true;
                onClick().then(closeSheet, closeSheet);
            });
            box.appendChild(b);
            return b;
        }
        var first = addBtn('\u0630\u062e\u06cc\u0631\u0647 \u0628\u0627 \u0645\u0634\u062e\u0635\u0627\u062a \u0628\u06cc\u0645\u0627\u0631', '\u0646\u0627\u0645\u060c \u062a\u0627\u0631\u06cc\u062e \u0648 \u0634\u0646\u0627\u0633\u0647 \u0628\u0627\u0644\u0627\u06cc \u062a\u0635\u0648\u06cc\u0631\u061b \u062e\u0648\u062f \u062a\u0635\u0648\u06cc\u0631 \u067e\u0648\u0634\u0627\u0646\u062f\u0647 \u0646\u0645\u06cc \u0634\u0648\u062f', true,
            function () { return save(inst, true); });
        addBtn('\u0641\u0642\u0637 \u062a\u0635\u0648\u06cc\u0631', '\u0628\u062f\u0648\u0646 \u0645\u0634\u062e\u0635\u0627\u062a', false, function () { return save(inst, false); });
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = '\u0627\u0646\u0635\u0631\u0627\u0641';
        cancel.style.cssText = 'display:block;width:100%;min-height:44px;border:0;background:transparent;color:#cbd5e1;font:inherit;cursor:pointer;';
        cancel.addEventListener('click', closeSheet);
        box.appendChild(cancel);

        wrap.addEventListener('click', function (e) { if (e.target === wrap) { closeSheet(); } });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { closeSheet(); document.removeEventListener('keydown', esc); }
        });
        wrap.appendChild(box);
        document.body.appendChild(wrap);
        try { first.focus(); } catch (e) { /* ignore */ }
    }

    waitForViewer(function (api) {
        if (api.__saveFix) { return; }
        api.__saveFix = VERSION;
        var original = api.action;
        // The skin's buttons call SmartScanViewer.action(name).
        api.action = function (name) {
            var inst = api.get();
            if (inst && name === 'save') { openSheet(inst); return api; }
            if (inst && name === 'save-details') { save(inst, true); return api; }
            return original.apply(api, arguments);
        };
        // Also cover callers that use the instance directly (toolbar code
        // inside the viewer, keyboard shortcuts).
        try {
            var proto = Object.getPrototypeOf(api.get());
            if (proto && !proto.__saveFixPatched) {
                proto.__saveFixPatched = true;
                proto.save = function () { openSheet(this); };
                proto.saveWithDetails = function () { return save(this, true); };
            }
        } catch (e) { /* ignore */ }
        // Legacy global used by the old markup.
        window.saveImage = function () { api.action('save'); };
        window.SmartScanSaveFix = { version: VERSION, save: function (withDetails) { var i = api.get(); return i ? save(i, !!withDetails) : Promise.resolve('no-viewer'); } };
    });
})(window, document);
