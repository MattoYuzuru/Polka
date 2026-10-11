import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomBytes } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";

const api = "/api/v1";
test("the keyboard skip link preserves the current route and focuses content", async ({
  page,
}) => {
  await page.goto("/yuzuru");
  await page.getByTestId("profile-hero").waitFor();
  const skip = page.getByRole("link", { name: "К содержимому" });
  await skip.focus();
  await skip.press("Enter");
  await expect(page).toHaveURL(/\/yuzuru$/);
  await expect(page.locator("#main-content")).toBeFocused();
});
const coverGif = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64",
);

function largePng(): Buffer {
  const size = 768;
  const pixels = randomBytes((size * 3 + 1) * size);
  for (let row = 0; row < size; row++) pixels[row * (size * 3 + 1)] = 0;
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("a valid cover above one MiB uploads through the frontend proxy", async ({
  request,
}) => {
  const session = await login(request);
  const headers = { Authorization: `Bearer ${session.token}` };
  const buffer = largePng();
  expect(buffer.length).toBeGreaterThan(1024 * 1024);
  const uploaded = await request.post(`${api}/books/cover-upload`, {
    headers,
    multipart: { file: { name: "large.png", mimeType: "image/png", buffer } },
  });
  expect(uploaded.status()).toBe(201);
  const cover = (await uploaded.json()) as {
    coverObjectKey: string;
    coverPalette: string[];
  };
  const created = await request.post(`${api}/books`, {
    headers,
    data: {
      title: `Large cover ${Date.now()}`,
      author: "Playwright",
      year: 2026,
      genre: "Тест",
      status: "Хочу",
      isPublic: false,
      ...cover,
    },
  });
  expect(created.status()).toBe(201);
  const book = (await created.json()) as CreatedBook;
  try {
    const downloaded = await request.get(`${api}/books/${book.id}/cover`, {
      headers,
    });
    expect(downloaded.status()).toBe(200);
    expect(downloaded.headers()["content-type"]).toBe("image/png");
    expect(await downloaded.body()).toEqual(buffer);
  } finally {
    await request.delete(`${api}/books/${book.id}`, { headers });
  }
});

interface Session {
  token: string;
  user: { id: string; nickname: string; email: string; createdAt: string };
}

interface CreatedBook {
  id: string;
  title: string;
  coverUrl: string;
}

async function login(request: APIRequestContext): Promise<Session> {
  const response = await request.post(`${api}/auth/login`, {
    data: { email: "reader@polka.local", password: "Reader1234" },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Session>;
}

async function openOwnerPage(
  page: Page,
  session: Session,
  path: string,
): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem("polka.auth.token", value.token);
    localStorage.setItem("polka.auth.user", JSON.stringify(value.user));
  }, session);
  await page.goto(path);
}

test("private covers and books stay private while the owner can view them", async ({
  page,
  request,
}) => {
  const session = await login(request);
  const headers = { Authorization: `Bearer ${session.token}` };
  const createdBooks: CreatedBook[] = [];
  let listId: string | undefined;

  try {
    const upload = await request.post(`${api}/books/cover-upload`, {
      headers,
      multipart: {
        file: { name: "privacy.gif", mimeType: "image/gif", buffer: coverGif },
      },
    });
    expect(upload.status()).toBe(201);
    const uploaded = (await upload.json()) as {
      coverObjectKey: string;
      coverPalette: string[];
    };

    for (const isPublic of [false, true]) {
      const response = await request.post(`${api}/books`, {
        headers,
        data: {
          title: `Privacy ${isPublic ? "public" : "private"} ${Date.now()}`,
          author: "Playwright",
          description: "Privacy regression",
          year: 2026,
          publisher: "Polka",
          ageRating: "0+",
          genre: "Тест",
          status: "Хочу",
          isPublic,
          rating: null,
          opinion: "Private note must follow the book visibility.",
          quote: "Privacy test quote.",
          coverPalette: isPublic ? [] : uploaded.coverPalette,
          coverObjectKey: isPublic ? null : uploaded.coverObjectKey,
        },
      });
      expect(response.status()).toBe(201);
      createdBooks.push((await response.json()) as CreatedBook);
    }

    const [privateBook, publicBook] = createdBooks;
    const createList = await request.post(`${api}/recommendation-lists`, {
      headers,
      data: {
        title: `Privacy mixed list ${Date.now()}`,
        description: "Public list contains both visibility modes.",
        isPublic: true,
        bookIds: createdBooks.map((book) => book.id),
      },
    });
    expect(createList.status()).toBe(201);
    listId = ((await createList.json()) as { id: string }).id;

    const guestBook = await request.get(`${api}/books/${privateBook.id}`);
    expect(guestBook.status()).toBe(404);
    const guestCover = await request.get(privateBook.coverUrl);
    expect(guestCover.status()).toBe(404);
    const ownerCover = await request.get(privateBook.coverUrl, { headers });
    expect(ownerCover.status()).toBe(200);
    expect(ownerCover.headers()["cache-control"]).toContain("no-store");

    const guestProfile = await request.get(
      `${api}/profiles/${session.user.nickname}`,
    );
    const profile = (await guestProfile.json()) as {
      books: CreatedBook[];
      user: Record<string, unknown>;
      analytics: { readingWindows: { privateBooksCount: number } };
    };
    expect(
      profile.books.some((book) => book.id === privateBook.id),
    ).toBeFalsy();
    expect(
      profile.books.some((book) => book.id === publicBook.id),
    ).toBeTruthy();
    expect(profile.user).not.toHaveProperty("email");
    expect(profile.analytics.readingWindows.privateBooksCount).toBe(0);

    const guestList = await request.get(
      `${api}/recommendation-lists/${listId}`,
    );
    expect(guestList.status()).toBe(200);
    const list = (await guestList.json()) as {
      books: CreatedBook[];
      booksCount: number;
    };
    expect(list.books.map((book) => book.id)).toEqual([publicBook.id]);
    expect(list.booksCount).toBe(1);

    await page.goto(`/${session.user.nickname}`);
    await page.getByTestId("books-search").fill(privateBook.title);
    await expect(
      page.getByRole("heading", { name: privateBook.title }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Добавить контент" }),
    ).toHaveCount(0);

    await openOwnerPage(page, session, `/books/${privateBook.id}`);
    await expect(
      page.getByRole("heading", { name: privateBook.title }),
    ).toBeVisible();
    const cover = page.locator(".book-pane--meta .book-cover img");
    await expect(cover).toBeVisible();
    await expect
      .poll(() =>
        cover.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBeGreaterThan(0);
  } finally {
    if (listId) {
      expect(
        (
          await request.delete(`${api}/recommendation-lists/${listId}`, {
            headers,
          })
        ).ok(),
      ).toBeTruthy();
    }
    for (const book of createdBooks) {
      expect(
        (await request.delete(`${api}/books/${book.id}`, { headers })).ok(),
      ).toBeTruthy();
    }
  }
});

for (const width of [360, 768, 1440]) {
  test(`public and owner screens fit a ${width}px viewport`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/login",
      "/register",
      "/yuzuru",
      "/books/f691ff32-c3f8-4b25-8965-4f45a1bff001",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width + 1);
    }

    const session = await login(request);
    await openOwnerPage(page, session, "/books/new");
    for (const path of ["/books/new", "/lists/new", "/settings/profile"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width + 1);
    }
  });
}

test("owner action menus close with Escape and return keyboard focus", async ({
  page,
  request,
}) => {
  const session = await login(request);
  await openOwnerPage(page, session, `/${session.user.nickname}`);
  const trigger = page.getByRole("button", { name: "Добавить контент" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "Добавить книгу" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Добавить книгу" })).toHaveCount(
    0,
  );
  await expect(trigger).toBeFocused();
});

test("a rejected import leaves the library unchanged", async ({ request }) => {
  const session = await login(request);
  const headers = { Authorization: `Bearer ${session.token}` };
  const title = `Rejected import ${Date.now()}`;
  const response = await request.post(`${api}/books/import`, {
    headers,
    data: {
      items: [
        {
          title,
          author: "Playwright",
          year: 2026,
          publisher: "Polka",
          genre: "Тест",
          status: "Хочу",
          isPublic: false,
        },
        { title: "", author: "", status: "invalid" },
      ],
    },
  });
  const profileResponse = await request.get(
    `${api}/profiles/${session.user.nickname}`,
    { headers },
  );
  const profile = (await profileResponse.json()) as { books: CreatedBook[] };
  const unexpectedBooks = profile.books.filter((book) => book.title === title);
  for (const book of unexpectedBooks) {
    await request.delete(`${api}/books/${book.id}`, { headers });
  }
  expect(response.status()).toBe(400);
  expect(unexpectedBooks).toEqual([]);
});

test("reduced motion keeps the public profile still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/yuzuru");
  await expect(page.getByTestId("profile-hero")).toBeVisible();
  const durations = await page
    .locator(".book-card")
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        ...style.animationDuration.split(","),
        ...style.transitionDuration.split(","),
      ].map((duration) => Number.parseFloat(duration));
    });
  expect(durations.every((duration) => duration <= 0.001)).toBeTruthy();
});
