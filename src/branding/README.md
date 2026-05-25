# `src/branding/`

Todo el código de la **branding page** (landing pública de Blackline Fitness)
vive aquí. Hacer ajustes a la landing **solo requiere tocar archivos de esta
carpeta** — no se modifica el gym (`(app)`), ni el login (`(auth)`), ni el
onboarding.

## Estructura

```
src/branding/
├── landing-page.tsx              ← Componente raíz que arma las 5 secciones
├── components/
│   ├── branding-shell.tsx        ← Wrapper layout (header + main + footer)
│   ├── branding-header.tsx       ← Header sticky con logo y nav
│   └── branding-footer.tsx       ← Footer con copyright + links legales
├── sections/
│   ├── hero.tsx                  ← "Tu línea, tu fuerza." + CTAs
│   ├── features.tsx              ← Grid de 3 features
│   ├── pricing-teaser.tsx        ← Resumen de 3 planes
│   ├── testimonial.tsx           ← Quote + autor
│   └── cta-final.tsx             ← "Empezá hoy"
└── data/
    ├── features.ts               ← BRANDING_FEATURES
    ├── testimonial.ts            ← BRANDING_TESTIMONIAL
    └── pricing-teaser.ts         ← BRANDING_PRICING_TIERS
```

## Cómo se conecta al routing

- `src/app/(marketing)/page.tsx` → renderiza `<BrandingLandingPage />`
- `src/app/(marketing)/layout.tsx` → renderiza `<BrandingShell>`

Ambos archivos son **wrappers delgados** — toda la lógica/markup vive en
`src/branding/`.

## Lo que NO está aquí

- **Logo** (`@/components/shared/blackline-fitness-logo`) — es compartido con
  auth, onboarding y el gym; se importa, no se mueve.
- **Tokens de color** (`--brand-primary`, `--brand-accent`) — son CSS vars
  globales en `src/app/globals.css` porque el trainer las personaliza desde
  ajustes.
- **Pricing detallado** (`/pricing`) y **legales** (`/legal/*`) — son páginas
  separadas del marketing route group, comparten el mismo `BrandingShell`
  pero su contenido propio sigue en `(marketing)/pricing/` y
  `(marketing)/legal/`.
