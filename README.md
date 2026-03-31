# Polka

<p align="center">
  <img src="docs/assets/polka-readme-logo.png" alt="Polka logo" width="420">
</p>

Polka это full-stack приложение для личной библиотеки с публичным профилем, списками рекомендаций, цитатами и мнениями о книгах.

Текущий статус: собран рабочий auth/profile/books/recommendation-lists foundation с Angular 21, Taiga UI 4, Signal Store, Go API, PostgreSQL и вертикальным срезом `register/login -> JWT session -> owner/guest profile -> create/edit/delete book -> reorder/filter library -> profile analytics -> create/edit/delete recommendation list`.

## Стек
- Frontend: Angular 21, TypeScript, Taiga UI 4, RxJS, NgRx Signal Store
- Backend: Go 1.25, chi router, PostgreSQL, startup migrations
- Data layer: PostgreSQL 17 в Docker Compose
- Delivery: Docker images, подготовка к GHCR и deploy на VPS

## Что уже есть
- `docs/plan.md` и `docs/ux.md`
- `docs/roadmap.md` с текущей фазой и ближайшими шагами
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
- форма создания списка рекомендаций с выбором книг из библиотеки и draft cache в `localStorage`
- публичная страница списка рекомендаций с owner/guest visibility
- owner actions для списков: редактирование, удаление и переключение публичности
- ESLint, Stylelint и Prettier scripts для frontend с root-level proxy командами
- Dockerfiles для frontend и backend
- `compose.yaml` с frontend, backend и PostgreSQL

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

При старте backend автоматически применяет SQL-миграции и добавляет demo seed пользователя.

## Проверки
```bash
npm run lint:frontend
npm run lint:styles
npm run format:check
npm run build:frontend
npm run test:frontend
npm run test:backend
npm run compose:check
```

## Следующие шаги
1. Перевести unit tests на Jest и добрать покрытие ключевой логики.
2. Добавить Playwright component/e2e сценарии под login, CRUD и фильтрацию.
3. Собрать CI/CD pipeline с публикацией образов в GHCR и deploy flow на VPS.
4. Подготовить Lighthouse-замеры, production polish и финальный deploy handoff.
