# `src/branding/`

Todo el código de la **branding page** (landing pública en `/`) vive aquí.
Diseño migrado 1:1 desde el HTML producido en Claude Design — animaciones,
cursor follow, sticky horizontal services, phone preview, manifesto reveal y
electric lines.

## Estructura

```
src/branding/
├── landing-page.tsx                  ← root cliente (cursor + reveals + secciones)
├── assets.ts                         ← rutas de imágenes (logo + ejercicios)
│
├── components/
│   ├── branding-shell.tsx            ← shell viejo (lo usan /pricing y /legal/*)
│   ├── branding-header.tsx           ← header viejo (usado por shell)
│   └── branding-footer.tsx           ← footer viejo (usado por shell)
│
├── sections/                         ← secciones de la landing nueva
│   ├── landing-nav.tsx               ← nav sticky + clock + meta + logo
│   ├── hero.tsx                      ← FUERZA / ORDEN / ESCALA con parallax
│   ├── marquee.tsx                   ← RUTINAS · SESIONES · OFFLINE...
│   ├── manifesto.tsx                 ← "No transformás cuerpos..."
│   ├── services.tsx                  ← 6 cards sticky horizontal
│   ├── preview.tsx                   ← phone mockup con app UI
│   └── landing-footer.tsx            ← footer de la landing nueva
│
├── hooks/
│   ├── use-cursor.ts                 ← cursor + ring + hover
│   ├── use-clock.ts                  ← HH:MM:SS CST tickea cada 1s
│   ├── use-hero-parallax.ts          ← parallax título + glow
│   ├── use-reveal-on-view.ts         ← IntersectionObserver para .fade-up/.reveal
│   └── use-services-sticky.ts        ← sticky horizontal scroll progreso
│
├── data/
│   ├── modules.ts                    ← 6 módulos del producto
│   └── preview-exercises.ts          ← 4 ejercicios del phone preview
│
└── styles/
    └── landing.css                   ← TODO el CSS de la landing, scoped a .branding-landing
```

## Cómo se conecta al routing

- `src/app/(marketing)/page.tsx` → `<BrandingLandingPage />` (landing nueva)
- `src/app/(marketing)/layout.tsx` → pass-through (`{children}`)
- `src/app/(marketing)/pricing/page.tsx` → envuelve con `<BrandingShell>` (shell viejo)
- `src/app/(marketing)/legal/*/page.tsx` → envuelve con `<BrandingShell>` (shell viejo)

## Assets requeridos (copiar a `public/branding/`)

El CSS y el JSX referencian estos archivos. Si faltan, los `<img>` se rompen
silenciosamente (el alt funciona). Copiá los pngs reales acá cuando los tengas:

- `public/branding/logo-transparent.png` — logo Blackline (usado en nav, footer y phone preview)
- `public/branding/exercise-1.png` ... `exercise-4.png` — (opcional, hoy se ven gradient placeholders)

## Scope: ¿qué se toca y qué no?

- **Sí se toca:** todo lo de `src/branding/`, y los wrappers `src/app/(marketing)/*`.
- **NO se toca:** `(app)/`, `(auth)/`, `(onboarding)/`, logo SVG compartido
  (`src/components/shared/blackline-fitness-logo.tsx`), tokens globales del
  trainer (`src/app/globals.css`).
