import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const contentDir = new URL("../src/content/", import.meta.url);
const meta = JSON.parse(await readFile(new URL("_meta.json", contentDir), "utf8"));
const files = (await readdir(contentDir)).filter((file) => file.endsWith(".json") && file !== "_meta.json");

const lessons = [];
for (const file of files) {
  const parsed = JSON.parse(await readFile(new URL(file, contentDir), "utf8"));
  assert(Array.isArray(parsed.lessons), `${file}: lessons debe ser un array`);
  lessons.push(...parsed.lessons);
}

const levels = new Set(meta.ladder.map(({ id }) => id));
const areas = new Set(meta.areas.map(({ id }) => id));
const lessonIds = new Set();
const cardIds = new Set();

for (const lesson of lessons) {
  assert.equal(typeof lesson.id, "string", "Cada lección necesita un id");
  assert(!lessonIds.has(lesson.id), `ID de lección duplicado: ${lesson.id}`);
  lessonIds.add(lesson.id);

  assert(levels.has(lesson.level), `${lesson.id}: nivel desconocido ${lesson.level}`);
  assert(areas.has(lesson.area), `${lesson.id}: área desconocida ${lesson.area}`);
  assert.equal(typeof lesson.title, "string", `${lesson.id}: falta title`);
  assert.equal(typeof lesson.summary, "string", `${lesson.id}: falta summary`);
  assert.match(lesson.added, /^\d{4}-\d{2}-\d{2}$/, `${lesson.id}: added debe usar YYYY-MM-DD`);
  assert.equal(typeof lesson.body, "string", `${lesson.id}: falta body`);
  assert(Array.isArray(lesson.cards) && lesson.cards.length > 0, `${lesson.id}: necesita tarjetas`);

  for (const card of lesson.cards) {
    assert.equal(typeof card.id, "string", `${lesson.id}: hay una tarjeta sin id`);
    assert(!cardIds.has(card.id), `ID de tarjeta duplicado: ${card.id}`);
    cardIds.add(card.id);
    assert.equal(typeof card.front, "string", `${card.id}: falta front`);
    assert.equal(typeof card.back, "string", `${card.id}: falta back`);
  }
}

console.log(`Contenido válido: ${lessons.length} lecciones y ${cardIds.size} tarjetas en ${files.length} archivos.`);
