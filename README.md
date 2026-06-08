# learn-cs

PWA personal para aprender fundamentos de CS. Dos modos que forman el ciclo
**entender → retener**:

- **Curso**: lecciones por nivel. Al marcar una como aprendida, sus tarjetas se
  suman al repaso.
- **Repaso**: flashcards con repetición espaciada (SM-2 simplificado). Reemplazo
  del scroll de reels.

## Stack

React + Vite, sin backend. Estado en `localStorage`. Contenido en
`src/content.json` (lecciones → tarjetas). Para agregar contenido se edita solo
ese archivo; lo nuevo (`added` posterior a la última visita) se marca `NUEVO`.

## Dev

```bash
npm install
npm run dev
```

Deploy: Vercel (preset Vite). Build `npm run build` → `dist/`.
