# Contribuir

Gracias por ayudar a mejorar learn-cs. Podés proponer correcciones, contenido nuevo o cambios en la interfaz mediante un issue o pull request.

## Preparar el proyecto

Necesitás Node.js 20 o superior.

```bash
git clone https://github.com/PucciRomeroTobias/learn-cs.git
cd learn-cs
npm ci
npm run dev
```

Antes de enviar un pull request:

```bash
npm run check
npm audit --audit-level=high
```

## Agregar una lección

Las lecciones viven en `src/content/<area>.json`. Conservá los IDs existentes porque el progreso guardado los usa como referencia. Cada lección necesita `id`, `level`, `area`, `title`, `summary`, `added`, `body` y al menos una tarjeta con `id`, `front` y `back`.

Usá Markdown para el cuerpo. Los diagramas admitidos son bloques `mermaid`; mantenelos simples y evitá HTML embebido. El comando `npm test` valida el JSON, los niveles, las áreas y los IDs duplicados.

No incluyas datos privados, credenciales, tokens ni material con copyright que no puedas redistribuir.
