/* Cee.girbling — phương án 2 (demo). Album data lives in assets/data.js. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = matchMedia("(max-width: 760px)");
  const desktop = matchMedia("(min-width: 901px)");
  const CG = window.CG || { albums: [], media: {} };
  const bySlug = Object.fromEntries(CG.albums.map((a) => [a.slug, a]));
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "ariaLabel") el.setAttribute("aria-label", v);
      else el[k] = v;
    }
    el.append(...kids.filter((k) => k != null));
    return el;
  };
  const img = (im, { alt = "", sizes = "100vw", lazy = true } = {}) => {
    const el = h("img", { src: im.src, srcset: im.srcset, sizes, width: im.w, height: im.h, alt, decoding: "async" });
    if (lazy) el.loading = "lazy";
    return el;
  };
  const countLabel = (n) => `${n} ảnh`;

  /* ---------- Mobile menu ---------- */
  const toggle = $(".menu-toggle");
  const nav = $(".nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Đóng" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
  }

  /* ---------- Images by reference: [data-media] and [data-album-img="slug:n"] ---------- */
  $$("img[data-media]").forEach((el) => {
    const im = CG.media[el.dataset.media];
    if (im) Object.assign(el, { srcset: im.srcset, src: im.src, width: im.w, height: im.h });
  });
  $$("img[data-album-img]").forEach((el) => {
    const [slug, n] = el.dataset.albumImg.split(":");
    const im = bySlug[slug] && bySlug[slug].images[Number(n) - 1];
    if (im) Object.assign(el, { srcset: im.srcset, src: im.src, width: im.w, height: im.h });
  });

  /* ---------- Album viewer: big frame + contact sheet, built on first use ---------- */
  let viewer = null;
  let vAlbum = null;
  let vIndex = 0;
  let vOpener = null;
  const buildViewer = () => {
    const title = h("p", { className: "title" });
    const meta = h("p", { className: "viewer-meta" });
    const nextAlbum = h("button", { type: "button", className: "viewer-nextalbum", textContent: "Album tiếp" });
    const close = h("button", { type: "button", textContent: "Đóng" });
    const stage = h("figure", { className: "viewer-stage" });
    const prev = h("button", { type: "button", className: "viewer-step viewer-prev", ariaLabel: "Ảnh trước", textContent: "‹" });
    const next = h("button", { type: "button", className: "viewer-step viewer-next", ariaLabel: "Ảnh sau", textContent: "›" });
    const sheet = h("ol", { className: "viewer-sheet", ariaLabel: "Tất cả ảnh trong album" });
    const dlg = h("dialog", { className: "viewer", ariaLabel: "Xem album" },
      h("div", { className: "viewer-bar" }, h("div", {}, title, meta), h("div", { className: "viewer-actions" }, nextAlbum, close)),
      h("div", { style: "position:relative;min-height:0" }, stage, prev, next),
      sheet);
    Object.assign(dlg, { _title: title, _meta: meta, _stage: stage, _sheet: sheet });
    close.addEventListener("click", () => dlg.close());
    prev.addEventListener("click", () => show(vIndex - 1));
    next.addEventListener("click", () => show(vIndex + 1));
    nextAlbum.addEventListener("click", () => {
      const list = CG.albums;
      load(list[(list.indexOf(vAlbum) + 1) % list.length], 0);
    });
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(vIndex - 1);
      if (e.key === "ArrowRight") show(vIndex + 1);
    });
    dlg.addEventListener("close", () => vOpener && vOpener.focus());
    let x0 = null;
    stage.addEventListener("pointerdown", (e) => (x0 = e.clientX));
    stage.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) show(vIndex + (dx < 0 ? 1 : -1));
    });
    stage.style.cssText = "position:absolute;inset:0;margin:0";
    document.body.append(dlg);
    return dlg;
  };
  const show = (i) => {
    const n = vAlbum.images.length;
    vIndex = (i + n) % n;
    const im = vAlbum.images[vIndex];
    viewer._stage.replaceChildren(h("img", { src: im.src, width: im.w, height: im.h, alt: `${vAlbum.title}, ảnh ${vIndex + 1} trên ${n}` }));
    viewer._meta.textContent = `${vAlbum.category}, ${vIndex + 1} / ${n}`;
    $$("button", viewer._sheet).forEach((b, j) => b.setAttribute("aria-current", String(j === vIndex)));
    const cur = viewer._sheet.children[vIndex];
    if (cur) cur.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
    for (const d of [1, -1]) new Image().src = vAlbum.images[(vIndex + d + n) % n].src;
  };
  const load = (album, i) => {
    vAlbum = album;
    viewer._title.textContent = album.title;
    viewer._sheet.replaceChildren(...album.images.map((im, j) => {
      const b = h("button", { type: "button", ariaLabel: `Ảnh ${j + 1}` }, img(im, { sizes: "120px", lazy: false }));
      b.addEventListener("click", () => show(j));
      return h("li", {}, b);
    }));
    show(i);
  };
  const openAlbum = (slug, i = 0, opener = null) => {
    const album = bySlug[slug];
    if (!album) return;
    viewer = viewer || buildViewer();
    vOpener = opener;
    load(album, i);
    if (!viewer.open) viewer.showModal();
  };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-album]");
    if (!t) return;
    e.preventDefault();
    openAlbum(t.dataset.openAlbum, Number(t.dataset.index || 0), t);
  });

  /* ---------- Muted ambient loops: only on screen, never with reduced motion ---------- */
  const loops = $$("video[data-src]");
  if (loops.length && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
      }
    });
    for (const v of loops) {
      v.muted = true;
      v.src = narrow.matches && v.dataset.srcSmall ? v.dataset.srcSmall : v.dataset.src;
      io.observe(v);
    }
  }

  /* ---------- Home: selected work cards open the viewer ---------- */
  for (const list of $$("[data-albums]")) {
    for (const slug of list.dataset.albums.split(/\s+/)) {
      const a = bySlug[slug];
      if (!a) continue;
      const btn = h("button", { type: "button", ariaLabel: `Xem album ${a.title}` },
        img(a.images[0], { alt: "", sizes: "(max-width: 760px) 80vw, 40vw" }),
        h("h3", { className: "title", textContent: a.title }),
        h("p", { className: "meta", textContent: `${a.category}, ${countLabel(a.images.length)}` }));
      btn.dataset.openAlbum = a.slug;
      list.append(h("li", {}, btn));
    }
  }

  /* ---------- Bio: wrap words so they can light up ---------- */
  for (const bio of $$(".bio")) {
    const words = bio.textContent.trim().split(/\s+/);
    bio.textContent = "";
    words.forEach((w, i) => bio.append(h("span", { className: "w", textContent: w }), i < words.length - 1 ? " " : ""));
    if (!bio.closest(".cover")) bio.dataset.progress = "view";
  }
  const lightWords = (root, t) => {
    const words = root._words || (root._words = $$(".w", root));
    const lit = Math.round(clamp(t) * words.length);
    words.forEach((w, i) => w.classList.toggle("lit", i < lit));
  };

  /* ---------- Scroll engine: --p (0..1) on [data-progress] while near the viewport ---------- */
  const hooks = {
    hero(el, p) {
      el.style.setProperty("--e", ease(clamp(p / 0.8)).toFixed(4));
    },
    cover(el, p) {
      el.style.setProperty("--e", ease(clamp(p / 0.45)).toFixed(4));
      lightWords($(".bio", el), (p - 0.42) / 0.45);
    },
    bio(el, p) {
      lightWords(el, (p - 0.12) / 0.45);
    },
  };
  const hookFor = (el) =>
    el.classList.contains("hero-pin") ? hooks.hero :
    el.classList.contains("cover") ? hooks.cover :
    el.classList.contains("bio") ? hooks.bio : null;

  const tracked = $$("[data-progress]");
  const visible = new Set();
  const measure = () => {
    const vh = innerHeight;
    for (const el of visible) {
      const r = el.getBoundingClientRect();
      const mode = el.dataset.progress;
      const p =
        mode === "pin" ? -r.top / Math.max(1, r.height - vh) :
        mode === "through" ? (vh * 0.6 - r.top) / Math.max(1, r.height) :
        (vh - r.top) / (vh + r.height);
      const v = clamp(p);
      el.style.setProperty("--p", v.toFixed(4));
      const hook = el._hook === undefined ? (el._hook = hookFor(el)) : el._hook;
      if (hook) hook(el, v);
    }
  };
  let queued = false;
  const onScroll = (fn) => addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  }, { passive: true });
  if (tracked.length && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      measure();
    }, { rootMargin: "25% 0px" });
    tracked.forEach((el) => io.observe(el));
    onScroll(measure);
    addEventListener("resize", measure);
  } else if (reduceMotion) {
    $$(".bio .w").forEach((w) => w.classList.add("lit"));
  }

  /* ---------- Home: pinned horizontal reel, section height = horizontal distance ---------- */
  for (const sec of $$(".hscroll")) {
    const track = $(".hscroll-track", sec);
    const layout = () => {
      if (narrow.matches || reduceMotion) {
        sec.style.height = "";
        return;
      }
      const dist = Math.max(0, track.scrollWidth - innerWidth);
      track.style.setProperty("--dist", dist);
      sec.style.height = `${dist + innerHeight}px`;
      measure();
    };
    layout();
    addEventListener("resize", layout);
    addEventListener("load", layout);
    $$("img", track).forEach((i) => i.addEventListener("load", layout, { once: true }));
  }

  /* ---------- One-shot reveals ---------- */
  const reveals = $$("[data-reveal], .board.flip");
  if (reveals.length) {
    const io = new IntersectionObserver((entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        obs.unobserve(e.target);
      }
    }, { threshold: 0.2 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- About: photography index with a pinned preview ---------- */
  const folio = $("#folio-list");
  if (folio) {
    const frame = $(".folio-frame");
    const capTitle = $(".folio-caption .title");
    const capMeta = $(".folio-caption .meta");
    const preview = $(".folio-preview");
    const shown = new Map();
    let active = null;
    let hoverUntil = 0;
    const activate = (row) => {
      if (!row || row === active) return;
      active && active.classList.remove("is-active");
      active = row;
      row.classList.add("is-active");
      folio.classList.add("has-active");
      const a = bySlug[row.dataset.openAlbum];
      if (!desktop.matches) return;
      let pic = shown.get(a.slug);
      if (!pic) {
        pic = img(a.images[0], { alt: "", sizes: "34vw", lazy: false });
        shown.set(a.slug, pic);
        frame.append(pic);
      }
      $$("img", frame).forEach((x) => x.classList.toggle("is-shown", x === pic));
      capTitle.textContent = a.title;
      capMeta.textContent = `Xem ${countLabel(a.images.length)}`;
      preview.dataset.openAlbum = a.slug;
      preview.setAttribute("aria-label", `Xem album ${a.title}`);
    };
    for (const a of CG.albums) {
      const row = h("button", { type: "button", className: "folio-row", ariaLabel: `${a.title}, ${a.category}, ${countLabel(a.images.length)}` },
        img(a.images[0], { alt: "", sizes: "76px" }),
        h("span", { className: "folio-title", textContent: a.title }),
        h("span", { className: "folio-cat", textContent: a.category }),
        h("span", { className: "folio-count", textContent: countLabel(a.images.length) }));
      row.firstChild.className = "folio-thumb";
      row.dataset.openAlbum = a.slug;
      row.addEventListener("pointerenter", () => { hoverUntil = performance.now() + 900; activate(row); });
      row.addEventListener("focus", () => activate(row));
      const li = h("li", {}, row);
      li.dataset.category = a.category;
      folio.append(li);
    }
    // While scrolling (and not hovering), the row nearest the viewport centre drives the preview.
    const syncToScroll = () => {
      if (!desktop.matches || performance.now() < hoverUntil) return;
      const mid = innerHeight * 0.5;
      let best = null;
      let bestD = Infinity;
      for (const r of $$(".folio-row", folio)) {
        if (r.parentElement.hidden) continue;
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - mid);
        if (d < bestD) { bestD = d; best = r; }
      }
      activate(best);
    };
    onScroll(syncToScroll);
    activate($(".folio-row", folio));
    // Warm the preview cache once the page is idle so hovering feels instant.
    (window.requestIdleCallback || setTimeout)(() => CG.albums.forEach((a) => (new Image().src = a.images[0].src.replace("-1000.", "-640.").replace("-1280.", "-640."))), { timeout: 3000 });

    const filters = $("#folio-filters");
    const cats = ["Tất cả", ...new Set(CG.albums.map((a) => a.category))];
    for (const c of cats) {
      const n = c === "Tất cả" ? CG.albums.length : CG.albums.filter((a) => a.category === c).length;
      const b = h("button", { type: "button", className: "filter" }, c + " ", h("span", { textContent: n }));
      b.setAttribute("aria-pressed", String(c === "Tất cả"));
      b.addEventListener("click", () => {
        $$(".filter", filters).forEach((f) => f.setAttribute("aria-pressed", String(f === b)));
        $$("li", folio).forEach((li) => (li.hidden = c !== "Tất cả" && li.dataset.category !== c));
        active = null;
        activate($("li:not([hidden]) .folio-row", folio));
      });
      filters.append(b);
    }
  }

  /* ---------- Films: poster first, play (with sound) only when clicked ---------- */
  const mountFilm = (screen, { src, poster, wide, label }, autoplay = false) => {
    screen.replaceChildren();
    const v = h("video", { preload: "none", poster, playsInline: true, className: wide ? "is-wide" : "" });
    v.src = src;
    const play = h("button", { type: "button", className: "stage-play", ariaLabel: `Phát phim ${label}` }, h("span", { textContent: "Phát" }));
    const start = () => {
      for (const other of $$("video")) if (other !== v && !other.muted) other.pause();
      v.controls = true;
      play.hidden = true;
      v.play().catch(() => (play.hidden = false));
    };
    play.addEventListener("click", start);
    v.addEventListener("ended", () => { v.controls = false; play.hidden = false; });
    screen.append(v, play);
    if (autoplay) start();
  };
  for (const screen of $$(".stage-screen[data-src]")) {
    mountFilm(screen, { src: screen.dataset.src, poster: screen.dataset.poster, wide: "wide" in screen.dataset, label: screen.dataset.label });
  }

  /* ---------- About: brand board drives the stage ---------- */
  const board = $(".board");
  const stage = $(".stage");
  if (board && stage) {
    const screen = $(".stage-screen", stage);
    const name = $(".stage-name", stage);
    const kind = $(".stage-kind", stage);
    const select = (btn, fromClick) => {
      $$("button", board).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const d = btn.dataset;
      name.textContent = d.label;
      kind.textContent = $(".kind", btn).textContent;
      if (d.album) {
        const a = bySlug[d.album];
        const row = h("div", { className: "stage-photos" });
        a.images.forEach((im, i) => {
          const b = h("button", { type: "button", ariaLabel: `Xem lớn ảnh ${i + 1} của ${d.label}` }, img(im, { sizes: "40vw" }));
          b.style.cssText = "padding:0;border:0;background:none;height:100%;flex:none;cursor:zoom-in";
          b.firstChild.style.height = "100%";
          b.dataset.openAlbum = a.slug;
          b.dataset.index = i;
          row.append(b);
        });
        screen.replaceChildren(row);
      } else {
        mountFilm(screen, { src: d.src, poster: d.poster, wide: "wide" in d, label: d.label }, fromClick);
      }
      if (fromClick && !desktop.matches) {
        const r = stage.getBoundingClientRect();
        if (r.top > innerHeight * 0.6 || r.bottom < 0) stage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
    };
    $$("button", board).forEach((b) => b.addEventListener("click", () => select(b, true)));
    const first = $("button", board);
    if (first) select(first, false);
  }
})();
