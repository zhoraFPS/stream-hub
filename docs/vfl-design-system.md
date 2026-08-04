# VfL Bochum 1848 — Design System (reverse-engineered)

Quelle: `https://vfl-bochum.de` (Nuxt/Vue, BEM-Prefix `b-`), ausgelesen am 04.08.2026.
Messwerte bei Viewport **1280px**, `html { font-size: 16px }`.
Vergleichsobjekt: `https://vfl1848.tv` (das abzulösende Portal).

---

## 1. Design-Prinzipien (das, was den Look ausmacht)

| Prinzip | Konkret |
|---|---|
| **Null Radius** | `border-radius: 0` auf Buttons, Cards, Medien, Inputs. Einzige Ausnahme: Chips (`9.7px`). Harte Kanten sind das Markenzeichen. |
| **Kein Glas, kein Schatten** | `box-shadow: none` durchgängig. Keine `backdrop-filter`. Flächen stehen durch Farbe, nicht durch Elevation. |
| **Cards sind unsichtbar** | News-/Match-Cards haben `background: transparent`, keinen Border, kein Padding. Struktur entsteht durch Bild + Typo + Whitespace. |
| **Uppercase-Hierarchie** | H1/H2 `uppercase` + `font-weight: 900`. H3 (Card-Titel) mixed case + `700`. Kicker & Meta `uppercase`. |
| **Fluid Everything** | Type und Spacing komplett über `clamp()`-Scales. Keine Breakpoint-Sprünge in der Typo. |
| **Weiß ist der Primär-Akzent** | Primary Button = weißer Block, dunkler Text. Nicht Blau. Blau ist Fläche, nicht Akzent. |
| **12-Spalten-Raster** | Content-Container max. `1265px` @1280vw, 12 Spalten, Column-Gap `--space-s`, Row-Gap `--space-xl`. |
| **Scroll-Reveal** | Blöcke tragen `data-reveal` → Einblenden beim Scrollen. |

> **Delta zum aktuellen stream-hub:** Wir nutzen aktuell Inter, `#0055b8` als Akzent, `border-radius: 9999px` Pills, Liquid-Glass (`backdrop-filter: blur(32px)`) und starke Schatten. Das ist stilistisch das Gegenteil des Club-Designs. Der Redesign-Kern ist: Radius raus, Glas raus, Schatten raus, Weiß als Primäraktion, VisbyCF-Typo, `#041825` Surface.

---

## 2. Farben

### Rohpalette

```
/* Blau dunkel — Flächen */
--color-blue-dark-100: #054b7b   /* 5,75,123    */
--color-blue-dark-200: #003863   /* 0,56,99     */
--color-blue-dark-300: #003259   /* 0,50,89     */
--color-blue-dark-400: #07283d   /* 7,40,61     */  → Overlay-BG
--color-blue-dark-500: #062031   /* 6,32,49     */  → Surface Alternate / Media-BG
--color-blue-dark-600: #041825   /* 4,24,37     */  → Surface (Body-BG)

/* Blau royal — Interaktion auf hell */
--color-blue-royal-300: #226bad
--color-blue-royal-400: #095ba4  → Highlight-Text
--color-blue-royal-500: #085294
--color-blue-royal-600: #074983

/* Blau hell */
--color-blue-light-400: #2799d6
--color-sail:           #b0def9
--color-ceil:           #8d9ed0

/* Weiß-Blau — Typo */
--color-white-400:      #fff     /* 255,255,255 */
--color-white-blue-400: #e6eaec  /* 230,234,236 */  → Front/Display (Standard-Textfarbe)
--color-white-blue-500: #cdd4d8
--color-white-blue-600: #b5bfc5  → Copy
--color-white-blue-700: #9ca9b1
--color-white-blue-800: #83949e

--color-black-400:      #121212

/* Status */
--color-flame:        #e84e1a   → error
--color-fern:         #6dbd84   → success
--color-my-sin:       #f8a940   → warning
--color-yellow:       #f2c94c
--color-cornell-red:  #be1521
--color-faded-yellow: #fff481
--color-tapestry:     #be6086
--color-cape-palliser:#9d6749
```

### Semantische Ebene (Dark-Mode = Default)

```
--color-surface           = blue-dark-600  #041825
--color-surface-alternate = blue-dark-500  #062031
--color-front             = white-blue-400 #e6eaec
--color-display           = white-blue-400 #e6eaec
--color-copy              = white-blue-600 #b5bfc5
--color-accent            = white-blue-400 #e6eaec
--color-accent-dark       = white-blue-500 #cdd4d8
--color-accent-light      = white-400      #ffffff
--color-accent-negative   = blue-dark-600  #041825   ← Text auf Accent-Fläche
--color-highlight         = #ffffff
--color-highlight-text    = blue-royal-400 #095ba4
--color-line              = alpha-200 (rgba(255,255,255,.2))
--color-overlay-background= blue-dark-400  #07283d
--color-media-background  = blue-dark-500  #062031
--color-stadium-vector-fill    = blue-dark-500
--color-stadium-vector-outline = blue-dark-400
```

### Alpha-Leitern

`--color-light-alpha-{50,100..900}` = `rgba(255,255,255, .05 / .1 … .9)`
`--color-dark-alpha-{50,100..900}`  = `rgba(18,18,18,  .05 / .1 … .9)`
Im Dark-Mode ist `--color-alpha-*` auf die *light*-Leiter gemappt.

---

## 3. Typografie

### Schrift

- **VisbyCF** (Connary Fagen) — Weights 400 / 600 / 700 / 900, jeweils normal + italic, ausgeliefert als `.woff2`.
- **VisbyCFSlab** — gleiche Weights, ist geladen aber auf der Startseite nicht in Benutzung.
- Alle Rollen (`--font-display`, `--font-text`, `--font-subline`, `--font-data`) zeigen auf VisbyCF. **Eine Schrift, vier Rollen.**
- Fallback-Stack:
  `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

> ⚠️ **Lizenz:** VisbyCF ist eine kommerzielle Schrift. Die Webfont-Dateien von vfl-bochum.de dürfen nicht einfach kopiert werden. Zwei Wege: (a) der Verein hat die Lizenz — Dateien über die Agentur / Marketing anfordern, das ist bei einem offiziellen Vereinsprojekt der saubere Weg; (b) bis dahin freie geometrische Alternative als Platzhalter: **Outfit**, **Poppins** oder **Figtree** (alle Google Fonts, Weights bis 900 verfügbar). Outfit kommt den Proportionen am nächsten.

### Fluid Type Scale

```
--step--2: clamp(.7813rem, .7773rem + .0198vw, .809rem)     → 12.7px @1280
--step--1: clamp(.9375rem, .9174rem + .1006vw, 1.0784rem)   → 15.97px
--step-0:  clamp(1.125rem, 1.0804rem + .2232vw, 1.4375rem)  → 20.14px  (Body)
--step-1:  clamp(1.35rem,  1.2691rem + .4044vw, 1.9162rem)  → 25.48px
--step-2:  clamp(1.62rem,  1.4865rem + .6673vw, 2.5543rem)  → 32.30px
--step-3:  clamp(1.944rem, 1.7353rem + 1.0435vw, 3.4049rem) → 41.12px
--step-4:  clamp(2.3328rem,2.0177rem + 1.5756vw, 4.5387rem) → 52.35px
--step-5:  clamp(2.7994rem,2.335rem + 2.3219vw, 6.05rem)    → 67.08px
--step-6:  clamp(3.3592rem,2.687rem + 3.3611vw, 8.0647rem)  → 86.01px
--step-7:  clamp(4.0311rem,3.0712rem + 4.7994vw, 10.7503rem)
--step-8:  clamp(4.8373rem,3.4812rem + 6.7806vw, 14.3301rem)
```

### Text-Rollen (gemessen @1280px)

| Rolle | Klasse | Size | Step | LH | Weight | Transform |
|---|---|---|---|---|---|---|
| Hero-Headline | `.b-heading--800` | 86.01px | `--step-6` | 1.0 | 900 | uppercase |
| Section-Headline | `.b-heading--600` | 41.12px | `--step-3` | 1.1 (45.23px) | 900 | uppercase |
| Card-Titel | `.b-heading--400` | 25.48px | `--step-1` | 1.25 (31.85px) | 700 | none |
| Body | `body` | 20.14px | `--step-0` | 1.4 (28.20px) | 400 | none |
| Copy / Chip-Label | `.b-copy` | 15.97px | `--step--1` | 1.4 (22.35px) | 600 | none, `max-width: 720px` |
| Kicker | `.b-kicker` | 15.97px | `--step--1` | 1.4 | 700 | uppercase |
| Meta-Zeile | `.b-meta-line__item` | 15.97px | `--step--1` | 1.4 | 500 | uppercase, `letter-spacing: .02em` |
| Nav-Link | `.b-menu__main-link` | 15.97px | `--step--1` | 1.4 | 700 | uppercase |
| Score | `.b-card-match__score` | 67.08px | `--step-5` | — | 900 | — |

`letter-spacing` ist überall `normal` — **außer** Meta-Zeile (`0.319px` ≈ `.02em`). Kein Tracking-Spielerei.

Die Vereinsmarke wird im Fließtext als `<span class="b-vfl">VfL</span>` mit `font-weight: 700` ausgezeichnet — steht auch mitten im Satz immer fett.

---

## 4. Spacing (fluid)

```
--space-3xs: clamp(.31rem, .31rem, .31rem)                    →  5px
--space-2xs: clamp(.56rem, .55rem + .07vw, .63rem)            →  9.7px
--space-xs:  clamp(.88rem, .86rem + .07vw, .94rem)            → 14.7px
--space-s:   clamp(1.13rem, 1.1rem + .14vw, 1.25rem)          → 19.4px
--space-m:   clamp(1.69rem, 1.64rem + .21vw, 1.88rem)         → 28.9px
--space-l:   clamp(2.25rem, 2.19rem + .28vw, 2.5rem)          → 38.8px
--space-xl:  clamp(3.38rem, 3.29rem + .43vw, 3.75rem)         → 58.1px
--space-2xl: clamp(4.5rem, 4.39rem + .57vw, 5rem)             → 77.6px
--space-3xl: clamp(6.75rem, 6.58rem + .85vw, 7.5rem)          →116.3px
--space-4xl: clamp(11.25rem, 10.97rem + 1.42vw, 12.5rem)      →193.9px
--space-5xl: clamp(13.5rem, 13.16rem + 1.7vw, 15rem)          →232.6px
```

Plus Paar-Ranges für weichere Übergänge:
`--space-3xs-2xs`, `--space-2xs-xs`, `--space-xs-s`, `--space-s-m`, `--space-m-l`,
`--space-l-xl`, `--space-xl-2xl`, `--space-2xl-3xl`, `--space-3xl-4xl`, `--space-4xl-5xl`.

### Abgeleitet

```
--grid-gap-x: var(--space-s)       /* 19.4px */
--grid-gap-y: var(--space-xl)      /* 58.1px */
--section-gap:          var(--space-2xl-3xl)
--section-gap-compact:  var(--space-xl)
--section-gap-spacious: var(--space-3xl-4xl)
--main-padding-top:     var(--space-4xl-5xl)
--main-padding-top-s:   var(--space-3xl-4xl)

--page-padding-x-phone:   var(--space-s)
--page-padding-x-tablet:  var(--space-m)
--page-padding-x-desktop: var(--space-xl)
--page-padding-y-phone:   var(--space-s)
--page-padding-y-tablet:  var(--space-m)
--page-padding-y-desktop: var(--space-l)
```

`section.b-section` hat gemessen `padding-bottom: 104.77px`.

---

## 5. Radius, Breakpoints, Container

```
--border-radius-s:  var(--space-2xs)   /*  9.7px  — nur Chips */
--border-radius-m:  var(--space-s)
--border-radius-l:  var(--space-m)
--border-radius-xl: var(--space-xl)
```
De facto: alles Sichtbare rendert mit `border-radius: 0`. Die Radius-Tokens existieren, werden aber praktisch nicht eingesetzt.

```
--break-phone-l:   (min-width: 480px)
--break-tablet:    (min-width: 768px)
--break-desktop-s: (min-width: 1024px)
--break-desktop-m: (min-width: 1280px)
--break-desktop-l: (min-width: 1600px)
--break-desktop-xl:(min-width: 1921px)

--max-width-s:    600px
--max-width-m:    900px
--max-width-l:   1000px
--max-width-type: 720px    /* Lesebreite Fließtext */
```

Content-Container (`.b-content__inner`, `.b-section`) misst **1265px** bei 1280px Viewport → `100vw - 2 × ~7px`? Praktisch: `width: 100%` innerhalb Page-Padding, kein hartes `max-width` auf der Startseite. 12-Spalten-Raster: `12 × 79.19px` + `column-gap 19.39px`.

---

## 6. Komponenten

### 6.1 Header `.b-header`

```
position: absolute        /* liegt über dem Hero, nicht sticky auf der Startseite */
z-index: 104
height: 67.55px
background: transparent
padding: 0
data-mode="dark"          /* Theming-Hook */
```
Aufbau: `[Logo-SVG] [.b-header__bar → .b-header__navigation → .b-menu]`
Bar: `display: flex; gap: 28.93px; height: 43.72px`.
Logo: inline `<svg viewBox="0 0 75.8 80"><use href="#vfl-logo"></use></svg>` — SVG-Sprite, kein Bild.

Menü: `.b-menu[data-theme="accent"]` mit CSS-Custom-Props für Mega-Menu-Animation:
```
--submenu-height, --header-navigation-height, --header-height
```
Ebenen: `.b-menu__main > .b-menu__main-item > button.b-menu__main-link` → Flyout `.b-menu__sub` mit `.b-menu__features > .b-menu__feature > a.b-menu__feature-link`.
Externe Links bekommen ein `#icon-arrow-up-right-24` Sprite-Icon.

Top-Level-Navigation: **Aktuell · Profis · Frauen · Talentwerk · Fans · Verein · Stadion · Netzwerk · Shop & Tickets**

### 6.2 Buttons `.b-button`

```
/* --primary */
background: #e6eaec
color: #041825
border: 1px solid transparent
border-radius: 0
padding: 14.66px 19.39px      /* = --space-xs --space-s */
font-size: 20.14px (--step-0)
font-weight: 700
text-transform: none
box-shadow: none

/* --secondary */
background: transparent
color: #e6eaec
border: 1px solid #e6eaec
border-radius: 0

/* --s (small modifier) */
padding: 9.70px 14.66px       /* = --space-2xs --space-xs */
font-size: 15.97px (--step--1)
```

### 6.3 Chips `.b-chip` (Filter)

```
/* inaktiv */
background: rgba(255,255,255,.1)
color: #e6eaec
border: 1px solid transparent
border-radius: 9.70px         /* --border-radius-s — einzige Rundung im System */
padding: 4.96px 9.70px        /* --space-3xs --space-2xs */
transition: background-color .25s

/* .--is-active */
background: #e6eaec
color: #041825
border: 1px solid #e6eaec
```
Label innen: `.b-chip__label.b-copy.b-copy--s` → 15.97px / 600.
Container `.b-chips`: `display: flex; gap: 9.70px`.

### 6.4 Section-Title `.b-section-title`

```html
<div class="b-section-title">
  <div class="b-section-title__content">
    <div class="b-section-title__presenter"></div>   <!-- "PRÄSENTIERT VON" Sponsor-Slot -->
    <div class="b-section-title__main">              <!-- flex, align-items:center, gap 9.7px -->
      <div class="b-section-title__heading">
        <h2 class="b-heading b-heading--600 b-heading--title">
          <span class="b-heading__text" data-heading-reveal>News</span>
        </h2>
      </div>
      <a href="/aktuelles" class="b-section-title__link">
        <span class="b-kicker b-section-title__link-label">Alle News</span>
        <span class="b-section-title__link-icon">
          <svg width="24" height="24" viewBox="0 0 24 24"><use href="#icon-arrow-right-24"/></svg>
        </span>
      </a>
    </div>
    <div class="b-section-title__chips"><!-- .b-chips --></div>
  </div>
</div>
```
Muster: **große Uppercase-900-Headline + „Alle X →" Kicker-Link direkt daneben + darunter Filter-Chips + optional Sponsor-Presenter darüber.**

### 6.5 Artikel-Card `.b-card-article`

```html
<a class="b-card-article b-card-article--link" href="…" aria-label="…">
  <div>
    <figure class="b-media">
      <img class="b-media__item" data-ratio="p-3x2" loading="lazy" srcset="…" sizes="100vw">
    </figure>
  </div>
  <div class="b-card-article__content">
    <div class="b-card-article__title">
      <h3 class="b-heading b-heading--400">Titel mit <span class="b-vfl">VfL</span></h3>
    </div>
  </div>
  <div class="b-card-article__meta">
    <div class="b-meta-line">
      <span class="b-meta-line__item"><span>03.08.2026</span></span>
      <span class="b-meta-line__item"><span>Fans</span></span>
    </div>
  </div>
</a>
```
```
display: flex; flex-direction: column
gap: 14.66px (--space-xs)
background: transparent; border: none; padding: 0; border-radius: 0
color: #e6eaec
```
Meta-Items: `display: inline; padding-right: 38.78px` (--space-l), Farbe `rgba(255,255,255,.6)`, uppercase, 500.

### 6.6 Medien `.b-media`

```
figure.b-media       { overflow: hidden; background: #062031; }
img.b-media__item    { object-fit: cover; transition: all; }
```
Ratio über `data-ratio`-Attribut statt CSS-Klasse:
`p-origin` · `p-1x1` · `p-3x2` · `p-3x4` · `p-6x7` · `p-4x1` · `origin`
Bilder kommen aus **Cloudinary** mit `f_auto,q_auto,w_{1200|1600|2000},c_limit` und `srcset`.

### 6.7 Match-Card `.b-card-match`

```html
<div class="b-card-match">
  <a class="b-card-match__grid" href="/teams/profis/match/…">
    <div class="b-card-match__teams">
      <div class="b-card-match__team">Arminia Bielefeld</div>
      <div class="b-card-match__team">VfL Bochum 1848</div>
    </div>
    <div class="b-card-match__status">
      <span class="b-card-match__score">1:1</span>
      <span class="b-card-match__score-extras"></span>
    </div>
    <div class="b-card-match__meta">
      <div class="b-card-match__meta-item">
        <span class="b-card-match__meta-item-value">2. Bundesliga · 32. Spieltag</span>
        <span class="b-card-match__meta-item-value">02.05.2026 · 13:00 Uhr</span>
      </div>
    </div>
  </a>
</div>
```
```
.b-card-match        { background: transparent; padding: 0; border: none; border-radius: 0 }
.b-card-match__grid  { display: grid; gap: 19.39px; width ~370–375px }
.b-card-match__team  { 20.14px / 700 / mixed case }
.b-card-match__score { 67.08px (--step-5) / 900 }
.b-card-match__meta-item-value { 15.97px / 400 / rgba(255,255,255,.6) }
```
Noch-nicht-gespielt: Score rendert als `—`. Trennzeichen in Meta ist immer `·`.

### 6.8 Hero `.b-hero`

```
min-height: 540px; height: 540px
padding: 58.14px (--space-xl)
position: relative; display: flex
```
Hintergrund kann `<video class="b-hero__video b-media__item" autoplay loop muted playsinline data-ratio="p-origin">` sein (`/videos/trikot-2627-hero.mp4`).
Inhalt: Kicker (`TRIKOT 2026|27`) → H1 `--800` uppercase → Primary-Button.

### 6.9 Marquee `.b-marquee` (Sponsoren + Deko-Laufschrift)

```
.b-marquee__row--logos-large { --marquee-speed: 130.27s }
.b-marquee__items > .b-marquee__item > .b-marquee__logo > a > img.b-marquee__logo-img
```
Geschwindigkeit als CSS-Variable pro Row, damit unterschiedliche Zeilen unterschiedlich schnell laufen. Wird zusätzlich als reine Typo-Deko genutzt (Wortband `CASTROPER CASTROPER …`, `STRASSENFUSSBALL …`).

### 6.10 Reveal

`data-reveal` / `data-reveal="true"` an `.b-blocks` und `.b-block`, `data-heading-reveal` an `.b-heading__text`. Intersection-Observer-getriebenes Einblenden, Headline separat animiert.

---

## 7. Startseiten-Komposition (Reihenfolge)

1. **Hero** — Video-BG, Kicker + H1 + Primary-CTA (`TRIKOT 2026|27 / DU TRÄGST ES IN DIR.`)
2. **News** — Section-Title mit „Alle News" + Chips (Alle · Profis · Fans · Verein · Talentwerk · Frauen), Card-Grid, dazwischen ein `ANZEIGE`-Slot
3. **Trikots / Shop** — `PRÄSENTIERT VON`-Presenter, Produkt-Cards mit Preis, „ZUM SHOP"
4. **Spielplan** — Section-Title „Alle Spiele" + Chips, Match-Card-Grid (horizontal scrollbar)
5. **1848TV** — Section-Title „Alle Videos", Video-Card-Reihe
6. **Mitgliedschaft** — Kicker `UNSERE FARBEN. UNSERE WERTE.` + Primary-CTA
7. **Ressort-Navigation** — PROFIS · FRAUEN · TALENTWERK · FANS · VEREIN · STADION · NETZWERK · SHOP & TICKETS
8. **Footer** — Sponsoren-Marquee + Typo-Marquee

**Für den Stream-Hub übertragbar:** Hero → Live/Featured, News → Neueste VODs, Spielplan → Spieltag-Archiv, 1848TV → Kategorie-Rails, Mitgliedschaft → Login/Redakteur-CTA.

---

## 8. Referenz: vfl1848.tv (das, was wir ablösen)

- Body: `#032546`, Text `#fff`, `18px`
- Schrift: **Geometr706 BdCn BT** (Bold Condensed) + **Geometr706 Md BT** — alte Bitstream-Lizenz, nicht die Marken-Typo der Hauptseite → das Portal wirkt schon dadurch abgehängt
- Player: **video.js**
- Struktur: `section.b-stage` (Swiper-Slider, 3 Slides) → `div.b-lane.stage-lane` (Netflix-artige horizontale Rails, `js-scroll-box`)
- Card: `article.lane-item > a.video-link > div.overlay > div.text-box > span.subtitle + h3.title`
- Paywall-Marker: `span.free.icon-lock` / `div.free.icon-lock`
- Kategorien/Rails: `Neueste Videos` · `Trainingslager` · `2. Bundesliga 2025/26` (nach Spieltag) · `DFB-Pokal` · …
- Inhaltstypen: Highlights, Volle Spiele, Pressekonferenzen (`PK vor/nach X`), `Stimmen nach X`, `MIC'D UP`, `Frage des Tages`, `Sach ma schnell`, Behind the Scenes, Trainingslager-Vlogs

Content-Modell, das wir abbilden müssen: **Serie/Format** (MIC'D UP, Frage des Tages …), **Wettbewerb + Spieltag**, **Team** (Profis/Frauen/Talentwerk), **Typ** (Highlight / Full Match / PK / Interview / Vlog), **Zugriff** (frei / Mitglied).

---

## 9. Umsetzungs-Checkliste für den Stream-Hub

- [ ] `src/index.css`: Inter → VisbyCF (oder Outfit als Platzhalter), Token-Layer aus `src/styles/vfl-tokens.css` einziehen
- [ ] Alle `border-radius: 9999px` / Pills entfernen → `0`, nur Filter-Chips behalten `--border-radius-s`
- [ ] `backdrop-filter` / Liquid-Glass komplett raus, `box-shadow` raus
- [ ] Akzent `#0055b8` → Primary-Button auf `#e6eaec` mit `#041825` Text; Blau nur noch als Fläche
- [ ] Body-BG `bg-figma.jpg` → `--color-surface` `#041825` (Bild höchstens als Hero-Layer)
- [ ] Navbar: Floating-Pill → `.b-header`-Muster (absolut über Hero, transparent, Logo-SVG links, Uppercase-700-Nav)
- [ ] `VideoCard` → `.b-card-article`-Muster: transparente Card, `b-media` mit `data-ratio`, H3 700 mixed case, Meta-Zeile uppercase 500 `rgba(255,255,255,.6)`
- [ ] Section-Title-Komponente bauen (H2 900 uppercase + „Alle X →"-Kicker-Link + Chips)
- [ ] Fluid-Type-Scale `--step--2 … --step-8` statt fixer px-Größen
- [ ] Spacing-Scale `--space-*` statt fixer `16/32`-Werte
- [ ] Kategorie-Rails (`b-lane`-Prinzip) für Formate/Wettbewerbe
- [ ] Scroll-Reveal via IntersectionObserver
- [ ] Match-Card-Komponente für Spieltag-VODs
