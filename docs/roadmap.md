# Roadmap

## Текущий статус

- Текущая ветка: `fix/site-footer-auth-links`
- Текущая фаза: корректировка глобального site-footer для auth-ссылок и откат встроенного footer на странице логина
- Последнее обновление: 2026-04-01

## Этапы

| Этап                           | Статус      | Содержимое                                                                                                                                          | Артефакты                                               |
| ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0. Discovery и правила работы  | completed   | Анализ требований, документы, правила для агентов, стартовый README                                                                                 | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md`  |
| 1. Monorepo bootstrap          | completed   | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles                                                                        | `frontend/`, root config                                |
| 2. Backend foundation          | completed   | Go API, Postgres, Docker Compose, startup migrations, seeded auth/profile persistence                                                               | `backend/`, `compose.yaml`                              |
| 3. Auth и app shell            | completed   | JWT login/register, token storage, guards, interceptors, profile edit, owner/guest profile visibility                                               | frontend + backend auth modules                         |
| 4. Books domain                | completed   | create/get/update/delete книг, edit mode, публичность, цитаты, мнения, reorder/top order, cover upload через S3-compatible storage                  | books feature                                           |
| 5. Recommendation lists        | completed   | create/get/update/delete списков, edit mode, публичность, owner/guest visibility                                                                    | recommendation-lists feature                            |
| 6. Public profile и статистика | completed   | owner/guest режимы, фильтры, сортировка, метрики, reading analytics                                                                                 | profile feature                                         |
| 7. QA и delivery               | completed   | lint/format tooling, Jest unit tests, Playwright browser scenarios, CI/CD, GHCR, Kubernetes manifests, deploy docs, `edge` rollout flow, Lighthouse | `.github/`, `docs/`, `README.md`, `playwright/`, `k8s/` |

## Ближайшие шаги

1. Провести ручной smoke-pass профиля и страницы книги на мобильных брейкпоинтах после новой scroll/navigation логики.
2. Решить, выносить ли минималистичные `auth-action`, `profile-action` и `form-action` паттерны в shared-слой.
3. При необходимости добавить отдельные e2e-сценарии на скачивание `zip`-экспорта полки и гостевой режим с приватными книгами.

## Последняя проверка

- `npm run lint`
- `npm run format:check`
- `npm run lint:frontend`
- `npm run lint:styles`
- `npm run build:frontend`
- `npm run test:frontend`
- `npm run test:component`
- `npm run test:backend`
- `npm run compose:check`
- `npm run build:frontend` после UI redesign
- `npm run lint:frontend` после UI redesign
- `npm run lint:styles` после UI redesign
- `npm run test:frontend` после UI redesign
- `npm run test:component` после UI redesign
- `npm run lint:frontend` после profile/book pass 2
- `npm run lint:styles` после profile/book pass 2
- `npm run build:frontend` после profile/book pass 2
- `npm run test:frontend` после profile/book pass 2
- `npx playwright test playwright/tests/auth-and-profile.spec.ts`
- `POST https://polka.keykomi.com/api/v1/auth/login`
- `POST https://polka.keykomi.com/api/v1/books/cover-upload`
- `POST https://polka.keykomi.com/api/v1/books`
- `GET https://polka.keykomi.com/api/v1/books/:id`
- `DELETE https://polka.keykomi.com/api/v1/books/:id`
- Lighthouse mobile report: `docs/lighthouse/polka-mobile.report.html`
- `npm run lint` после minimal UI/book/list pass
- `npm run format:check` после minimal UI/book/list pass
- `npm run test:frontend` после minimal UI/book/list pass
- `npm run test:backend` после minimal UI/book/list pass
- `npm run build:frontend` после minimal UI/book/list pass
- `npm run compose:check` после minimal UI/book/list pass
- `npm run test:component` после minimal UI/book/list pass
- `npm run lint` после export/auth/scroll polish
- `npm run format:check` после export/auth/scroll polish
- `npm run test:frontend` после export/auth/scroll polish
- `npm run test:backend` после export/auth/scroll polish
- `npm run build:frontend` после export/auth/scroll polish
- `npm run compose:check` после export/auth/scroll polish
- `npm run test:component` после export/auth/scroll polish
- `npm run lint` после final main/book scroll pass
- `npm run format:check` после final main/book scroll pass
- `npm run test:frontend` после final main/book scroll pass
- `npm run test:component` после final main/book scroll pass
- `npm run build:frontend` после final main/book scroll pass
- `npm run lint` после auth/import/icon pass
- `npm run format:check` после auth/import/icon pass
- `npm run test:frontend` после auth/import/icon pass
- `npm run test:component` после auth/import/icon pass
- `npm run build:frontend` после auth/import/icon pass
- `npm run lint` после site-footer auth pass
- `npm run format:check` после site-footer auth pass
- `npm run test:frontend` после site-footer auth pass
- `npm run test:component` после site-footer auth pass
- `npm run build:frontend` после site-footer auth pass

## Принципы итераций

- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
