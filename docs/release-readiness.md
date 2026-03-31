# Release Readiness

## Статус по требованиям

| Требование                           | Статус | Комментарий                                                                                              |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| `docs/plan.md` заполнен              | done   | План, сценарии, этапы и риски зафиксированы.                                                             |
| `docs/ux.md` заполнен                | done   | Персоны, stories и дизайн-система описаны.                                                               |
| Figma ссылка                         | open   | В `docs/ux.md` пока только пометка, что ссылка будет добавлена позже.                                    |
| Авторизация `login/logout`           | done   | JWT flow, guards и `localStorage` работают.                                                              |
| Регистрация                          | done   | Есть отдельный flow и автологин после регистрации.                                                       |
| CRUD основных сущностей              | done   | Books и recommendation lists закрыты с owner actions.                                                    |
| Поиск / фильтрация / сортировка      | done   | На профиле работают поиск, фильтр по статусу и сортировки.                                               |
| Вычисляемые показатели / статистика  | done   | Analytics по чтению и breakdown уже на backend и в UI.                                                   |
| State management                     | done   | Используются Signal Store / signals.                                                                     |
| Guards                               | done   | Защищённые роуты работают.                                                                               |
| Interceptors                         | done   | Токен и обработка ошибок подключены.                                                                     |
| Unit tests 10+                       | done   | Jest на frontend уже покрывает ключевую логику.                                                          |
| Component tests 2+                   | done   | Playwright покрывает guest/login/filtering и owner CRUD книги.                                           |
| ESLint / Prettier / Stylelint        | done   | Настроены и включены в CI.                                                                               |
| CI pipeline                          | done   | `lint`, `test`, `build`, `publish` в GitHub Actions.                                                     |
| GHCR publish                         | done   | Публикуются `sha-*`, `branch-*`, `edge`, `main`.                                                         |
| Публичный URL в README               | done   | `https://polka.keykomi.com` добавлен в README.                                                           |
| Deploy flow на VPS                   | done   | `k3s` rollout применён 2026-03-31: `postgres`, `minio`, `backend`, `frontend`, ingress и TLS активны.  |
| Lighthouse >= 80                     | done   | Mobile audit от 2026-03-31: `Accessibility 100`, `Best Practices 100`, `SEO 82`, `Performance 77`.     |
| Скриншот Lighthouse в `docs/`        | done   | Добавлены `docs/lighthouse/polka-mobile-summary.png` и raw reports `.html/.json`.                       |
| Импорт из внешних источников         | done   | Добавлен owner-only import JSON для книг.                                                                |
| История разработки не одним коммитом | done   | История итерационная.                                                                                    |

## Что уже можно считать готовым к сдаче

- Архитектура monorepo и доменное разделение `features / shared / core`.
- Реальный full-stack flow вместо формального mock-only фронта.
- Owner/guest visibility policy на backend.
- S3-compatible upload обложек и выдача cover в карточках.
- CI/CD до уровня публикации образов и ручного безопасного rollout на VPS.

## Что осталось критично добить

1. Добавить реальную Figma ссылку, если это требуется именно в артефактах сдачи.
2. При желании дожать mobile performance выше `80`, но для штрафов по чеклисту уже закрыты `SEO` и `Best Practices`.

## Рекомендованные ближайшие итерации

1. `docs/final-handoff-and-figma`:
   финальный пакет артефактов, если нужна Figma ссылка в сдаче.

## Production smoke 2026-03-31

- `https://polka.keykomi.com` отвечает `200`.
- `https://polka.keykomi.com/api/v1/health` отвечает `{"status":"ok"}`.
- `POST /api/v1/auth/login` на публичном домене возвращает `200`.
- `POST /api/v1/books/cover-upload` возвращает `201`.
- Owner smoke через API прошёл: create book -> get book -> delete book.
- `minio`, `postgres`, `backend`, `frontend` в namespace `polka` находятся в `Running`.
