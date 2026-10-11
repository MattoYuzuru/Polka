import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const base = new URL(process.env.POLKA_DEMO_URL ?? "http://127.0.0.1:14200");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error("Demo seeding is restricted to localhost.");
const books = JSON.parse(
  await readFile(path.join(root, "demo/books.json"), "utf8"),
);
let token;
async function api(route, method = "GET", body) {
  const response = await fetch(new URL(`/api/v1${route}`, base), {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`${method} ${route}: HTTP ${response.status}`);
  return response.json();
}
const session = await api("/auth/login", "POST", {
  email: process.env.POLKA_DEMO_EMAIL ?? "reader@polka.local",
  password: process.env.POLKA_DEMO_PASSWORD ?? "Reader1234",
});
token = session.token;
const profile = await api(
  `/profiles/${encodeURIComponent(session.user.nickname)}`,
);
const bookIds = [];
let created = 0;
for (const book of books) {
  const existing = profile.books.find(
    (item) => item.title === book.title && item.author === book.author,
  );
  if (existing) {
    bookIds.push(existing.id);
    continue;
  }
  const bytes = await readFile(path.join(root, `demo/covers/${book.slug}.png`));
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: "image/png" }),
    `${book.slug}.png`,
  );
  const cover = await api("/books/cover-upload", "POST", form);
  const { slug, language, source, ...metadata } = book;
  const result = await api("/books", "POST", {
    ...metadata,
    ageRating: "12+",
    isPublic: true,
    coverPalette: cover.coverPalette,
    coverObjectKey: cover.coverObjectKey,
    removeCover: false,
  });
  bookIds.push(result.id);
  created++;
}
const lists = [
  {
    title: "Мир на четырёх языках",
    description:
      "日本語 · Español · English · Русский. Восемь разных голосов: классика, математическая фантазия и программирование.",
    bookIds,
  },
  {
    title: "Воображение как инструмент",
    description:
      "Ночное небо, новые измерения, код и стеклянный город. Книги, которые меняют систему координат.",
    bookIds: [bookIds[1], bookIds[4], bookIds[5], bookIds[6]],
  },
];
if (created > 0 || process.env.POLKA_DEMO_REORDER === "1") {
  await api("/books/order", "PATCH", {
    bookIds: [
      ...bookIds,
      ...profile.books
        .filter((book) => !bookIds.includes(book.id))
        .map((book) => book.id),
    ],
  });
}
for (const list of lists) {
  if (!profile.recommendationLists.some((item) => item.title === list.title))
    await api("/recommendation-lists", "POST", { ...list, isPublic: true });
}
console.log(
  `Demo ready: ${created} books added, ${books.length} multilingual books available at ${new URL(`/${session.user.nickname}`, base)}.`,
);
