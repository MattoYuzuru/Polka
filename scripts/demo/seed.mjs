import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const base = new URL(process.env.POLKA_DEMO_URL ?? "http://127.0.0.1:14200");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error("Demo seeding is restricted to localhost.");
const readFixture = async (name) =>
  JSON.parse(await readFile(path.join(root, `demo/${name}.json`), "utf8"));
const books = await readFixture("books");
const notes = await readFixture("notes");
const lists = await readFixture("collections");
const slugs = new Set(books.map((book) => book.slug));
if (
  slugs.size !== books.length ||
  lists.some((list) => list.slugs.some((slug) => !slugs.has(slug)))
)
  throw new Error("Demo fixtures contain duplicate or unknown book slugs.");
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
let nickname = session.user.nickname;
if (session.user.id === "7cb8e370-1cb4-4794-b0e3-8cde1cd4ae8b") {
  const editable = await api("/profiles/me");
  if (editable.nickname !== "yuzuru" || editable.displayName !== "yuzuru") {
    const updated = await api("/profiles/me", "PATCH", {
      nickname: "yuzuru",
      displayName: "yuzuru",
      tagline: editable.tagline,
    });
    nickname = updated.nickname;
  }
}
const profile = await api(`/profiles/${encodeURIComponent(nickname)}`);
const bookIds = [];
const idsBySlug = new Map();
let created = 0;
let addedOpinions = 0;
let updatedLists = 0;
async function addMissingOpinions(bookId, contents) {
  const details = await api(`/books/${bookId}`);
  const existing = new Set(
    details.opinions.map((entry) => entry.content.trim()),
  );
  for (const content of contents) {
    const trimmed = content.trim();
    if (trimmed && !existing.has(trimmed)) {
      await api(`/books/${bookId}/opinions`, "POST", { content: trimmed });
      existing.add(trimmed);
      addedOpinions++;
    }
  }
}
for (const book of books) {
  let result = profile.books.find(
    (item) => item.title === book.title && item.author === book.author,
  );
  if (!result) {
    const bytes = await readFile(
      path.join(root, `demo/covers/${book.slug}.png`),
    );
    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: "image/png" }),
      `${book.slug}.png`,
    );
    const cover = await api("/books/cover-upload", "POST", form);
    const { slug, language, source, opinions, ...metadata } = book;
    result = await api("/books", "POST", {
      ...metadata,
      ageRating: book.ageRating ?? "12+",
      isPublic: true,
      coverPalette: cover.coverPalette,
      coverObjectKey: cover.coverObjectKey,
      removeCover: false,
    });
    created++;
    if (book.opinion?.trim()) addedOpinions++;
  }
  bookIds.push(result.id);
  idsBySlug.set(book.slug, result.id);
  await addMissingOpinions(result.id, [book.opinion, ...(book.opinions ?? [])]);
}
for (const note of notes) {
  const existing = profile.books.find(
    (item) => item.title === note.title && item.author === note.author,
  );
  if (existing) await addMissingOpinions(existing.id, note.opinions);
}
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
for (const { slugs: listSlugs, ...list } of lists) {
  const desiredIds = listSlugs.map((slug) => idsBySlug.get(slug));
  const existing = profile.recommendationLists.find(
    (item) => item.title === list.title,
  );
  if (!existing) {
    await api("/recommendation-lists", "POST", {
      ...list,
      bookIds: desiredIds,
      isPublic: true,
    });
    updatedLists++;
    continue;
  }
  const details = await api(`/recommendation-lists/${existing.id}`);
  const currentIds = details.books.map((book) => book.id);
  const mergedIds = [...new Set([...desiredIds, ...currentIds])];
  if (
    mergedIds.some((id) => !currentIds.includes(id)) ||
    details.description !== list.description
  ) {
    await api(`/recommendation-lists/${existing.id}`, "PATCH", {
      ...list,
      bookIds: mergedIds,
      isPublic: details.isPublic,
    });
    updatedLists++;
  }
}
console.log(
  `Demo ready: ${created} books, ${addedOpinions} opinions added; ${updatedLists} collections updated. ${books.length} multilingual books at ${new URL(`/${encodeURIComponent(nickname)}`, base)}.`,
);
