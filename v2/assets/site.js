/* Cee.girbling — phương án 2 (demo). Album data lives in assets/data.js. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = matchMedia("(max-width: 760px)");
  const CG = window.CG || { albums: [], media: {} };
  const bySlug = Object.fromEntries(CG.albums.map((a) => [a.slug, a]));
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

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

  /* ---------- [data-media] images from CG.media ---------- */
  $$("img[data-media]").forEach((el) => {
    const im = CG.media[el.dataset.media];
    if (!im) return;
    Object.assign(el, { srcset: im.srcset, src: im.src, width: im.w, height: im.h });
  });

  /* ---------- [data-album-img="slug:n"] images: photo n (1-based) of an album ---------- */
  $$("img[data-album-img]").forEach((el) => {
    const [slug, n] = el.dataset.albumImg.split(":");
    const im = bySlug[slug] && bySlug[slug].images[Number(n) - 1];
    if (!im) return;
    Object.assign(el, { srcset: im.srcset, src: im.src, width: im.w, height: im.h });
  });

  /* ---------- Muted ambient loops (hero reels): only on screen, never with reduced motion ---------- */
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

  /* ---------- Album-driven lists (home reel, about works) ---------- */
  for (const list of $$("[data-albums]")) {
    const kind = list.dataset.kind;
    for (const slug of list.dataset.albums.split(/\s+/)) {
      const a = bySlug[slug];
      if (!a) continue;
      const li = h("li", {},
        h("a", { href: `cong-viec.html#${a.slug}` },
          img(a.images[0], { alt: `${a.title}, ${a.category}`, sizes: kind === "works" ? "(max-width: 760px) 50vw, 34vw" : "(max-width: 760px) 80vw, 40vw" }),
          h("h3", { className: "title", textContent: a.title }),
          h("p", { className: "meta", textContent: `${a.category}, ${countLabel(a.images.length)}` })));
      if (kind === "works") li.dataset.progress = "view";
      list.append(li);
    }
  }

  /* ---------- Bio: wrap words so they light up as the paragraph scrolls by ---------- */
  for (const bio of $$(".bio")) {
    const words = bio.textContent.trim().split(/\s+/);
    bio.textContent = "";
    words.forEach((w, i) => bio.append(h("span", { className: "w", textContent: w }), i < words.length - 1 ? " " : ""));
    bio.dataset.progress = "view";
  }

  /* ---------- Scroll engine: sets --p (0..1) on [data-progress] while visible ---------- */
  const hooks = {
    hero(el, p) {
      const t = clamp(p / 0.8);
      el.style.setProperty("--e", (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2).toFixed(4));
    },
    works(el, p) {
      el.style.setProperty("--c", clamp(1 - Math.abs(p - 0.5) * 2.8).toFixed(3));
    },
    bio(el, p) {
      const words = el._words || (el._words = $$(".w", el));
      const lit = Math.round(clamp((p - 0.12) / 0.45) * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    },
  };
  const hookFor = (el) =>
    el.classList.contains("hero-pin") ? hooks.hero :
    el.closest(".works") ? hooks.works :
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
  if (tracked.length && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      measure();
    }, { rootMargin: "25% 0px" });
    tracked.forEach((el) => io.observe(el));
    let queued = false;
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; measure(); });
    }, { passive: true });
    addEventListener("resize", measure);
  } else if (reduceMotion) {
    $$(".bio .w").forEach((w) => w.classList.add("lit"));
  }

  /* ---------- Pinned horizontal reel: section height = horizontal distance ---------- */
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

  /* ---------- Lightbox ---------- */
  const lb = $("#lightbox");
  let lbAlbum = null;
  let lbIndex = 0;
  const lbShow = (i) => {
    const n = lbAlbum.images.length;
    lbIndex = (i + n) % n;
    const im = lbAlbum.images[lbIndex];
    Object.assign($(".lb-stage img", lb), { src: im.src, width: im.w, height: im.h, alt: `${lbAlbum.title}, ảnh ${lbIndex + 1} trên ${n}` });
    $(".lb-count", lb).textContent = `${lbIndex + 1} / ${n}`;
    for (const d of [1, -1]) new Image().src = lbAlbum.images[(lbIndex + d + n) % n].src;
  };
  const lbOpen = (album, i, opener) => {
    lbAlbum = album;
    $(".lb-bar .title", lb).firstChild.textContent = album.title;
    lbShow(i);
    lb.returnFocus = opener;
    lb.showModal();
  };
  if (lb) {
    $(".lb-close", lb).addEventListener("click", () => lb.close());
    $(".lb-prev", lb).addEventListener("click", () => lbShow(lbIndex - 1));
    $(".lb-next", lb).addEventListener("click", () => lbShow(lbIndex + 1));
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
      if (e.key === "ArrowRight") lbShow(lbIndex + 1);
    });
    lb.addEventListener("close", () => lb.returnFocus && lb.returnFocus.focus());
    let x0 = null;
    lb.addEventListener("pointerdown", (e) => (x0 = e.clientX));
    lb.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    });
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
          b.addEventListener("click", () => lbOpen(a, i, b));
          row.append(b);
        });
        screen.replaceChildren(row);
      } else {
        mountFilm(screen, { src: d.src, poster: d.poster, wide: "wide" in d, label: d.label }, fromClick);
      }
      if (fromClick) {
        const r = stage.getBoundingClientRect();
        if (r.top > innerHeight * 0.6 || r.bottom < 0) stage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
    };
    $$("button", board).forEach((b) => b.addEventListener("click", () => select(b, true)));
    const first = $("button", board);
    if (first) select(first, false);
  }

  /* ---------- Gallery: albums as contact strips ---------- */
  const albumsRoot = $("#albums");
  if (albumsRoot) {
    for (const a of CG.albums) {
      const strip = h("ol", { className: "strip", tabIndex: 0, ariaLabel: `Ảnh trong album ${a.title}` });
      a.images.forEach((im, i) => {
        const btn = h("button", { type: "button", ariaLabel: `Xem lớn ảnh ${i + 1} của ${a.title}` },
          img(im, { sizes: `calc(${(im.w / im.h).toFixed(3)} * 60vh)` }));
        btn.addEventListener("click", () => lbOpen(a, i, btn));
        strip.append(h("li", {}, btn, h("span", { className: "frame-no", textContent: String(i + 1).padStart(2, "0") })));
      });
      const prev = h("button", { type: "button", ariaLabel: "Lùi ảnh", textContent: "‹" });
      const next = h("button", { type: "button", ariaLabel: "Xem tiếp", textContent: "›" });
      const step = (dir) => strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
      prev.addEventListener("click", () => step(-1));
      next.addEventListener("click", () => step(1));
      const syncNav = () => {
        prev.disabled = strip.scrollLeft < 4;
        next.disabled = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 4;
      };
      strip.addEventListener("scroll", syncNav, { passive: true });
      addEventListener("resize", syncNav);
      requestAnimationFrame(syncNav);
      const sec = h("section", { className: "album", id: a.slug, ariaLabel: a.title },
        h("div", { className: "wrap album-head" },
          h("div", {},
            h("h2", { className: "display", textContent: a.title }),
            h("p", { className: "meta", textContent: `${a.category}, ${countLabel(a.images.length)}` })),
          h("div", { className: "strip-nav" }, prev, next)),
        strip);
      sec.dataset.category = a.category;
      albumsRoot.append(sec);
    }

    const filters = $("#filters");
    const cats = ["Tất cả", ...new Set(CG.albums.map((a) => a.category))];
    for (const c of cats) {
      const n = c === "Tất cả" ? CG.albums.length : CG.albums.filter((a) => a.category === c).length;
      const b = h("button", { type: "button", className: "filter" }, c + " ", h("span", { textContent: n }));
      b.setAttribute("aria-pressed", String(c === "Tất cả"));
      b.addEventListener("click", () => {
        $$(".filter", filters).forEach((f) => f.setAttribute("aria-pressed", String(f === b)));
        $$(".album", albumsRoot).forEach((s) => (s.hidden = c !== "Tất cả" && s.dataset.category !== c));
      });
      filters.append(b);
    }

    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
})();
