# La Sevillana — Brand Guidelines for Claude

> Read this file at the start of any new project for La Sevillana so that headers, sidebars, and navigation bars are always consistent.

---

## Logo

| Asset | URL |
|-------|-----|
| Logo blanco (uso principal) | `https://res.cloudinary.com/dqnsskjfg/image/upload/q_auto/f_auto/v1776400960/Logo-La-Sevillana-white_1_cjoldw.png` |

- Siempre usar la versión blanca del logo sobre el fondo oscuro de la marca.
- Tamaño recomendado en desktop: **160 × 56 px** (`object-contain`).
- Tamaño recomendado en móvil: **130 × 44 px** (`object-contain`).
- En Next.js usar `<Image unoptimized />` para cargar desde Cloudinary sin pasar por el optimizador de imágenes local.

---

## Colores del header

| Rol | Valor | Uso |
|-----|-------|-----|
| Fondo principal del header / sidebar | `#111111` | Fondo donde va el logo |
| Texto sobre fondo oscuro | `#FFFFFF` | Iconos, texto en header |
| Strip secundario (app label) | `#FFFFFF` | Banda delgada debajo del logo con el nombre del módulo |

El negro `#111111` (no puro `#000000`) da profundidad sin perder elegancia y contrasta perfectamente con el logo blanco.

---

## Estructura del header en sidebar (desktop)

```
┌──────────────────────────────┐
│  [fondo #111111 h-20]        │  ← Logo La Sevillana centrado
│      <Image logo />          │
├──────────────────────────────┤
│  [fondo blanco, border-b]    │  ← Strip del módulo (ícono + nombre)
│  [icon]  Nombre módulo       │
│          Descripción corta   │
├──────────────────────────────┤
│  Nav links                   │
│  ...                         │
├──────────────────────────────┤
│  email usuario               │
│  [Cerrar sesión]             │
└──────────────────────────────┘
```

## Estructura del header en móvil

```
┌──────────────────────────────────────┐
│  [fondo #111111 h-14 sticky z-40]    │
│  <Image logo />          [☰ menú]    │
└──────────────────────────────────────┘
```

---

## Implementación de referencia (Next.js + Tailwind + shadcn)

```tsx
import Image from "next/image";

const LOGO_URL =
  "https://res.cloudinary.com/dqnsskjfg/image/upload/q_auto/f_auto/v1776400960/Logo-La-Sevillana-white_1_cjoldw.png";

// Header desktop (dentro de sidebar)
<div className="flex h-20 items-center justify-center px-6 bg-[#111111]">
  <Image
    src={LOGO_URL}
    alt="La Sevillana"
    width={160}
    height={56}
    className="object-contain"
    priority
    unoptimized
  />
</div>

// Header móvil (sticky top bar)
<header className="lg:hidden flex h-14 items-center justify-between border-b bg-[#111111] px-4 sticky top-0 z-40">
  <Image
    src={LOGO_URL}
    alt="La Sevillana"
    width={130}
    height={44}
    className="object-contain"
    priority
    unoptimized
  />
  {/* botón hamburger aquí */}
</header>
```

---

## Reglas de consistencia

1. **Nunca** cambiar el color de fondo del header por proyecto — siempre `#111111`.
2. **Nunca** mostrar el logo sobre fondo blanco (usar versión oscura del logo si existiese).
3. El header del módulo/aplicación va **debajo** del logo en una banda más delgada.
4. El logo siempre lleva `alt="La Sevillana"` para accesibilidad.
5. En top-bars de página (no sidebar) mantener el mismo fondo `#111111` con el logo a la izquierda y acciones a la derecha.
