# Tailwind CSS v4 — Official Reference

> **Version in use**: `^4`
> **Official docs**: https://tailwindcss.com/docs

---

## Key Docs Links

| Topic | URL |
|---|---|
| Installation (PostCSS) | https://tailwindcss.com/docs/installation/using-postcss |
| Utility-First Fundamentals | https://tailwindcss.com/docs/styling-with-utility-classes |
| Responsive Design | https://tailwindcss.com/docs/responsive-design |
| Dark Mode | https://tailwindcss.com/docs/dark-mode |
| Theme Configuration | https://tailwindcss.com/docs/theme |
| Colors | https://tailwindcss.com/docs/colors |
| Typography | https://tailwindcss.com/docs/font-size |
| Flexbox | https://tailwindcss.com/docs/flex |
| Grid | https://tailwindcss.com/docs/grid-template-columns |
| Animations | https://tailwindcss.com/docs/animation |
| Custom Properties | https://tailwindcss.com/docs/adding-custom-styles |

---

## Tailwind CSS v4 Key Changes

- **CSS-first configuration** — config now lives in CSS (`@theme`) instead of `tailwind.config.js`
- **No `tailwind.config.js`** by default
- **PostCSS plugin** via `@tailwindcss/postcss`
- **New color system** with OKLCH colors
- **Container queries** built-in
- **`@starting-style`** for entry animations

---

## Dilnova Setup

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```
