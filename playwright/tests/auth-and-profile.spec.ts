import { expect, test } from '@playwright/test';

test('redirects a guest from a protected page to login', async ({ page }) => {
  await page.goto('/books/new');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});

test('logs in with the seeded demo account and opens the owner profile', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/mattoy$/);
  await expect(page.getByTestId('profile-nickname')).toHaveText('mattoy');
  await expect(page.getByRole('link', { name: 'Добавить книгу' })).toBeVisible();
});

test('filters the public library by search query and status', async ({ page }) => {
  await page.goto('/mattoy');

  await expect(page.getByTestId('profile-hero')).toBeVisible();
  await page.getByTestId('books-search').fill('Дюна');
  await expect(page.getByRole('heading', { name: 'Дюна' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '451° по Фаренгейту' })).toHaveCount(0);

  await page.getByTestId('books-search').fill('');
  await page.getByTestId('books-status-filter').selectOption('Читаю');
  await expect(page.getByRole('heading', { name: 'Дюна' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Если однажды зимней ночью путник' }),
  ).toHaveCount(0);
});
