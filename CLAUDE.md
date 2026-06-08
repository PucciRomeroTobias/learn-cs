# CLAUDE.md — reglas de trabajo para `learn-cs`

PWA personal para aprender fundamentos de CS. Proyecto Obsidian vinculado:
`aprender-cs` (en `personal/brain/proyectos/aprender-cs/`).

## Restricción central: NO se puede clonar ni usar git

Esto se desarrolla desde una Mac de trabajo. La seguridad corporativa **mata
cualquier operación `git`** (`git clone/push` → `signal: killed`). Por lo tanto:

- **No hay repo git local.** No intentar `git clone`, `git push`, etc.
- El repo de GitHub se edita **exclusivamente vía la API de GitHub** (`gh api`).

## Workflow: copia local + pushes sistemáticos

1. **Copia local de trabajo** = esta carpeta
   (`/Users/tpucci/Documents/repos/personal/learn-cs`). Es la **mesa de trabajo**:
   acá se lee, se edita y se **valida** (`npm run dev`, `npm run build`) antes de
   tocar el remoto. NO es un repo git (no tiene `.git`).
2. **GitHub = fuente de verdad.** Se modifica solo vía API, en **pushes
   sistemáticos**: un commit por cambio lógico, con mensaje claro.
3. La copia local es **canónica para editar**: siempre se pushea para reflejarla.
   Si hay duda del estado remoto, leerlo vía API antes de sobreescribir.
4. **Validar siempre antes de pushear**: `npm run build` tiene que pasar.

## Auth de GitHub (crítico)

- Cuenta personal: **`PucciRomeroTobias`**. Usar SIEMPRE la config personal:
  ```bash
  export GH_CONFIG_DIR=/Users/tpucci/Documents/repos/personal/.gh-personal
  ```
- **Verificar antes de cada push** que la cuenta activa es `PucciRomeroTobias`
  (`gh auth status`). La cuenta default es la de trabajo (`tpucci_meli`) — NUNCA
  usarla para este repo. Si la activa no es la personal, STOP.
- Repo: `PucciRomeroTobias/learn-cs`, branch `main`.

## Mecánica de push vía API

- **Un solo archivo** (ej. `src/content.json`): Contents API.
  ```bash
  gh api -X PUT repos/PucciRomeroTobias/learn-cs/contents/<path> \
    -f message="<msg>" -f content="$(base64 -i <file>)" -f sha="<blob-sha-actual>"
  ```
  (el `sha` es el del blob actual del archivo; se obtiene leyendo el contents).
- **Varios archivos a la vez**: Git Data API (blobs → tree → commit → update ref),
  un único commit atómico.
- **NUNCA pushear sin OK explícito del usuario** (regla global). Mostrar el comando
  y esperar confirmación. Cada commit por separado.
- **NUNCA agregar `Co-Authored-By`** ni atribución a Claude.

## Diseño: simple, pocos archivos, sin over-engineering

- Editar vía API es costoso → mantener **pocos archivos**. El código se escribe una
  vez; lo que crece es `src/content.json`.
- Resolver paso a paso, lo más simple que funcione. No anticipar estructura que no
  se necesita todavía. Partir un archivo solo cuando crezca de verdad.

## Estructura

```
learn-cs/
├─ package.json        # react, react-dom, marked + vite
├─ vite.config.js
├─ index.html
├─ CLAUDE.md
├─ README.md
└─ src/
   ├─ main.jsx
   ├─ App.jsx          # UI + SRS (SM-2 simplificado) + storage (localStorage)
   ├─ styles.css
   └─ content.json     # lecciones → tarjetas. ÚNICO archivo que se edita seguido.
```

## Deploy

- Vercel, preset **Vite**. URL: `learn-cs-psi.vercel.app`. Deploy automático en cada
  push a `main`. Dominio custom (`learn.nowarmup.com.ar`) = opcional futuro.
