import { expect, test } from "@playwright/test";

const coverGif = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64",
);

test("redirects a guest from a protected page to login", async ({ page }) => {
  await page.goto("/books/new");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("login-form")).toBeVisible();
});

test("logs in with the seeded demo account and opens the owner profile", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/mattoy$/);
  await expect(page.getByTestId("profile-nickname")).toHaveText("mattoy");
  await page.getByRole("button", { name: "Добавить контент" }).click();
  await expect(page.getByRole("link", { name: "Добавить книгу" })).toBeVisible();
});

test("filters the public library by search query and status", async ({
  page,
}) => {
  await page.goto("/mattoy");

  await expect(page.getByTestId("profile-hero")).toBeVisible();
  await page.getByTestId("books-search").fill("Дюна");
  await expect(page.getByRole("heading", { name: "Дюна" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "451° по Фаренгейту" }),
  ).toHaveCount(0);

  await page.getByTestId("books-search").fill("");
  await page.getByTestId("books-status-filter").selectOption("Читаю");
  await expect(page.getByRole("heading", { name: "Дюна" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Если однажды зимней ночью путник" }),
  ).toHaveCount(0);
});

test("owner creates, edits and deletes a book with uploaded cover", async ({
  page,
}) => {
  const createdTitle = `Playwright книга ${Date.now()}`;
  const updatedTitle = `${createdTitle} updated`;

  await page.goto("/login");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/mattoy$/);

  await page.goto("/books/new");
  await page.getByTestId("book-title-input").fill(createdTitle);
  await page
    .locator('input[formControlName="author"]')
    .fill("Playwright Автор");
  await page.locator('input[formControlName="genre"]').fill("Тестовый жанр");
  await page
    .locator('input[formControlName="publisher"]')
    .fill("Playwright Press");
  await page
    .locator('textarea[formControlName="description"]')
    .fill("Создано e2e сценарием.");
  await page.getByTestId("book-cover-input").setInputFiles({
    name: "cover.gif",
    mimeType: "image/gif",
    buffer: coverGif,
  });
  await expect(
    page.getByText("Обложка загружена и будет сохранена вместе с книгой."),
  ).toBeVisible();
  await page.getByTestId("book-submit").click();

  await expect(page).toHaveURL(/\/mattoy$/);
  await page.getByTestId("books-search").fill(createdTitle);
  const createdCard = page
    .locator("article.book-card")
    .filter({ has: page.getByRole("heading", { name: createdTitle }) });
  await expect(createdCard).toBeVisible();
  await expect(createdCard.locator("img")).toHaveCount(1);
  await createdCard.getByRole("link", { name: "Мнение" }).click();

  await expect(page.getByRole("heading", { name: createdTitle })).toBeVisible();
  await expect(page.locator(".book-pane--meta .book-cover img")).toBeVisible();
  await page.getByRole("button", { name: "Редактировать книгу" }).click();
  await page.locator('input[formControlName="title"]').fill(updatedTitle);
  await page.locator('select[formControlName="status"]').selectOption("Прочитал");
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByText("Прочитал")).toBeVisible();

  await page.goto("/mattoy");
  await page.getByTestId("books-search").fill(updatedTitle);
  const updatedCard = page
    .locator("article.book-card")
    .filter({ has: page.getByRole("heading", { name: updatedTitle }) });
  await expect(updatedCard).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await updatedCard
    .getByRole("button", { name: /меню действий/i })
    .click();
  await page.getByRole("button", { name: "Удалить из библиотеки" }).click();

  await expect(page).toHaveURL(/\/mattoy$/);
  await expect(page.getByRole("heading", { name: updatedTitle })).toHaveCount(
    0,
  );
});
