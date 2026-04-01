# Polka

<p align="center">
  <img src="docs/assets/polka-readme-logo.png" alt="Polka logo" width="240">
</p>

Polka это full-stack приложение для личной библиотеки с публичным профилем, списками рекомендаций, цитатами и мнениями о книгах.

Текущий статус: собран и выложен на VPS рабочий full-stack vertical slice с Angular 21, Taiga UI 4, Signal Store, Go API, PostgreSQL, MinIO/S3-compatible cover upload и цепочкой `register/login -> JWT session -> owner/guest profile -> create/edit/delete book -> cover upload -> reorder/filter library -> profile analytics -> create/edit/delete recommendation list -> import JSON`.

Прод URL: `https://polka.keykomi.com`

## Стек

- Frontend: Angular 21, TypeScript, Taiga UI 4, RxJS, NgRx Signal Store
- Backend: Go 1.25, chi router, PostgreSQL, startup migrations, S3-compatible media storage
- Data layer: PostgreSQL 17 и MinIO в Docker Compose
- Delivery: Docker images, GHCR, `k3s` deploy на VPS

## Что уже есть

- `docs/plan.md` и `docs/ux.md`
- `docs/roadmap.md` с текущей фазой и ближайшими шагами
- `docs/release-readiness.md` с audit по требованиям, production smoke и оставшимися хвостами
- `docs/lighthouse/` с mobile Lighthouse отчётом, raw HTML/JSON и summary screenshot
- `AGENTS.md` с правилами по веткам, проверкам и обновлению документации
- login flow с токеном в `localStorage`
- registration flow с автоматическим входом после создания аккаунта
- auth guard и HTTP interceptors
- публичная страница профиля с загрузкой данных из Go API и учётом owner/guest видимости
- страница редактирования профиля с сохранением в PostgreSQL
- создание книги через реальный backend endpoint
- страница книги с загрузкой метаданных, мнений и цитат
- owner actions для книг: редактирование, удаление и переключение публичности
- reorder/top mechanics для книг через backend endpoint и owner controls в профиле
- поиск, фильтрация по статусу и сортировка библиотеки на странице профиля
- analytics-блок на профиле: чтение за 30/365 дней, средняя оценка, публичные/приватные книги, breakdown по статусам и жанрам
- backend tracking `finished_at` для completed books, чтобы периодическая статистика считалась по данным сервера
- форма создания книги с валидацией и draft cache в `localStorage`
- загрузка обложки книги в S3-compatible storage с автоматической палитрой для fallback-градиентов
- import JSON для массового добавления книг во владельческую библиотеку
- форма создания списка рекомендаций с выбором книг из библиотеки и draft cache в `localStorage`
- публичная страница списка рекомендаций с owner/guest visibility
- owner actions для списков: редактирование, удаление и переключение публичности
- ESLint, Stylelint и Prettier scripts для frontend с root-level proxy командами
- Jest как unit test runner для frontend с 30+ тестами на stores, guard, interceptors и профильные utils
- Playwright browser scenarios для protected routes, login flow, фильтрации профиля и owner CRUD книги с upload flow
- GitHub Actions pipeline под lint/test/build и публикацию образов в GHCR
- Kubernetes manifests и bootstrap script для namespace `polka` на VPS с `k3s`, `traefik`, `cert-manager` и `minio`
- Production rollout на `https://polka.keykomi.com` с рабочим TLS, `login`, `cover-upload` и owner CRUD smoke
- Dockerfiles для frontend и backend
- `compose.yaml` с frontend, backend, PostgreSQL и MinIO

## Демо-учётка

- Email: `reader@polka.local`
- Password: `Reader1234`
- Public profile: `/mattoy`

## Локальный запуск

### Frontend

```bash
npm --prefix frontend install
npm run start:frontend
```

### Backend

```bash
go -C backend mod tidy
export DATABASE_URL=postgres://polka:polka@localhost:5432/polka?sslmode=disable
npm run start:backend
```

### Полный стек в Docker

```bash
docker compose up --build
```

После запуска:

- frontend: `http://localhost:4200`
- backend health: `http://localhost:8080/api/v1/health`
- minio api: `http://localhost:9000`
- minio console: `http://localhost:9001`

При старте backend автоматически применяет SQL-миграции и добавляет demo seed пользователя.

## Проверки

```bash
npm run playwright:install
npm run lint:frontend
npm run lint:styles
npm run lint
npm run format:check
npm run build:frontend
npm run test:frontend
npm run test:component
npm run test:backend
npm run compose:check
```

## Deploy

- Инструкции по VPS и `k3s` лежат в `docs/deploy.md`
- Bootstrap команда для кластера: `npm run deploy:polka:k8s`
- Для обычного продового rollout после merge в default branch используется `edge` тег
- После merge и завершения GitHub Actions deploy делается вручную:

```bash
ssh -i ~/sshKeysDir/id_ed25519_hse matto@158.160.66.87
cd /opt/polka
git fetch --all --prune
git checkout main
git pull --ff-only
POLKA_IMAGE_TAG=edge ./scripts/deploy/polka-bootstrap-k8s.sh
```

## Следующие шаги

1. Добавить реальную Figma ссылку в `docs/ux.md`, если она обязательна для сдачи.
2. При желании расширить Playwright на owner CRUD рекомендационных списков.
3. При желании поднять Lighthouse mobile performance выше `80` без потери текущего дизайна.
