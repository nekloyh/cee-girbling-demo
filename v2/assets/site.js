/* Cee.girbling — phương án 2 (demo). Album data lives in assets/data.js. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = matchMedia("(max-width: 760px)");
  const CG = window.CG || { albums: [], media: {} };
  const bySlug = Object.fromEntries(CG.albums.map((a) => [a.slug, a]));

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

  /* ---------- Autoplay reels (muted loops, only what the screen shows) ---------- */
  const videos = $$("video[data-src]");
  if (videos.length && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
      }
    });
    videos.forEach((v, i) => {
      if (narrow.matches && v.closest(".reels") && i > 0) return;
      v.muted = true;
      v.addEventListener("playing", () => v.classList.add("is-playing"), { once: true });
      v.src = v.dataset.src;
      io.observe(v);
    });
  }

  /* ---------- Image helpers ---------- */
  const img = (im, { alt = "", sizes = "100vw", lazy = true, cls = "" } = {}) => {
    const el = document.createElement("img");
    el.src = im.src;
    el.srcset = im.srcset;
    el.sizes = sizes;
    el.width = im.w;
    el.height = im.h;
    el.alt = alt;
    el.decoding = "async";
    if (lazy) el.loading = "lazy";
    if (cls) el.className = cls;
    return el;
  };
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "ariaLabel") el.setAttribute("aria-label", v);
      else el[k] = v;
    }
    el.append(...kids.filter((k) => k != null));
    return el;
  };
  const countLabel = (n) => `${n} ảnh`;

  /* ---------- Fill [data-media] images from CG.media ---------- */
  $$("img[data-media]").forEach((el) => {
    const im = CG.media[el.dataset.media];
    if (!im) return;
    el.srcset = im.srcset;
    el.src = im.src;
    el.width = im.w;
    el.height = im.h;
  });

  /* ---------- Home: selected album covers ---------- */
  const covers = $("#covers");
  if (covers) {
    for (const slug of covers.dataset.albums.split(/\s+/)) {
      const a = bySlug[slug];
      if (!a) continue;
      covers.append(
        h("li", {},
          h("a", { href: `cong-viec.html#${a.slug}` },
            img(a.images[0], { alt: `${a.title}, ${a.category}`, sizes: "(max-width: 760px) 50vw, 45vw" }),
            h("h3", { className: "title", textContent: a.title }),
            h("p", { className: "meta", textContent: `${a.category}, ${countLabel(a.images.length)}` })))
      );
    }
  }

  /* ---------- Lightbox ---------- */
  const lb = $("#lightbox");
  let lbAlbum = null;
  let lbIndex = 0;
  const lbShow = (i) => {
    const n = lbAlbum.images.length;
    lbIndex = (i + n) % n;
    const im = lbAlbum.images[lbIndex];
    const pic = $(".lb-stage img", lb);
    pic.src = im.src;
    pic.width = im.w;
    pic.height = im.h;
    pic.alt = `${lbAlbum.title}, ảnh ${lbIndex + 1} trên ${n}`;
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

  /* ---------- Gallery: albums as contact strips ---------- */
  const albumsRoot = $("#albums");
  if (albumsRoot) {
    for (const a of CG.albums) {
      const strip = h("ol", { className: "strip", tabIndex: 0, ariaLabel: `Ảnh trong album ${a.title}` });
      a.images.forEach((im, i) => {
        const btn = h("button", { type: "button", ariaLabel: `Xem lớn ảnh ${i + 1} của ${a.title}` },
          img(im, { alt: "", sizes: `calc(${(im.w / im.h).toFixed(3)} * 60vh)` }));
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
      albumsRoot.append(
        h("section", { className: "album", id: a.slug, ariaLabel: a.title },
          h("div", { className: "wrap album-head" },
            h("div", {},
              h("h2", { className: "display", textContent: a.title }),
              h("p", { className: "meta", textContent: `${a.category}, ${countLabel(a.images.length)}` })),
            h("div", { className: "strip-nav" }, prev, next)),
          strip)
      );
      albumsRoot.lastElementChild.dataset.category = a.category;
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

  /* ---------- Course: online / offline switch ---------- */
  const tablist = $('[role="tablist"]');
  if (tablist) {
    const tabs = $$('[role="tab"]', tablist);
    const buyName = $(".buybar [data-name]");
    const buyPrice = $(".buybar [data-price]");
    const select = (tab, focus) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      }
      if (focus) tab.focus();
      if (buyName) buyName.textContent = tab.dataset.name;
      if (buyPrice) buyPrice.textContent = tab.dataset.price;
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
    if (location.hash === "#offline") select(tabs[1]);
  }
})();
