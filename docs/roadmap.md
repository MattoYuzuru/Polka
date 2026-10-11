# Roadmap

## Текущий статус

- Ветка: `codex/audit-design-library`.
- Фаза: завершён аудит, UI polish и расширение многоязычной демонстрации; локальный full-stack работает в контейнерах.
- Обновление: 2026-10-11.
- Основной контекст: [аудит и ограничения](audit-2026-10-11.md), [демо-контент](demo-content.md), [UX](ux.md), [запуск](../README.md).

## Этапы

| Этап                           | Статус    | Результат                                                                                                                                                 |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery и bootstrap          | completed | Документы, Angular workspace, Go API, Compose                                                                                                             |
| Auth и профиль                 | completed | JWT, owner/guest, редактирование профиля                                                                                                                  |
| Книги и подборки               | completed | CRUD, обложки, заметки, импорт, экспорт и публичность                                                                                                     |
| QA и delivery                  | completed | Jest, Playwright, GitHub Actions, GHCR, K8s                                                                                                               |
| Аудит и UI polish · 2026-10-11 | completed | Приватность cover, atomic import, production secret/seed, patched dependencies, формы/сессия/черновики, mobile/focus/motion                               |
| Многоязычная демонстрация      | completed | Профиль yuzuru: 24 книги, 20 локальных обложек, 80 мнений у многоязычных книг, 12 дополнений к исходным, шесть публичных подборок, screenshots и GIF/WebM |

## Проверенная среда

Текущая машина macOS/arm64, Node 22, Go 1.27, Docker/Colima. Локальный Compose project `polka` сохраняет `postgres-data` и `minio-data`. Другие проекты и их volumes не изменяются.

Локальная полка — `http://127.0.0.1:14200/yuzuru`, API — `http://127.0.0.1:18081/api/v1/health`, PostgreSQL — 55432, storage — 19000/19001. Порт 18080 занят другим проектом, поэтому используется 18081. Запуск повторяется командой из README.

## Проверки этой итерации

- 47 Jest tests / 8 suites.
- 13 Playwright scenarios; responsive 360/768/1440px, owner/guest и cover privacy, CRUD, import, keyboard и reduced motion.
- Backend unit/HTTP/S3-fake/isolated PostgreSQL tests и race detector.
- `go vet`, ESLint/Stylelint, format, production build, Compose model, actionlint и shellcheck.
- `npm audit --omit=dev`: 0 vulnerabilities. Dev tooling residuals перечислены в аудите.
- Сборка MinIO из pinned official source с checksum и сохранённой лицензией.
- Визуальные артефакты: `docs/screenshots/`; `capture.json` содержит viewport и browser errors.

`govulncheck`: 0 уязвимостей в вызываемом коде и импортируемых пакетах; 19 advisories остаются в неиспользуемых частях required modules. Все четыре Compose services запущены на новых образах; PostgreSQL/MinIO healthy, API health возвращает 200 напрямую и через Nginx. Проверен upload ~1.7MiB через production frontend. Backend и MinIO собраны native arm64 с Go 1.27.2. Frontend собран через Buildx; 8kB CSS limit сохранён, 4kB предупреждения остаются. Исторические production smoke и Lighthouse не считаются доказательством состояния этой ветки.

## Ближайшие шаги

1. Выбрать поддерживаемое S3-хранилище: MinIO upstream архивирован; source build решает текущий запуск, но не будущее сопровождение.
2. Усилить lifecycle медиа: устойчивые черновики загруженных обложек, сбор orphan uploads и координация concurrent attach/delete.
3. Разобрать остающиеся advisories dev tooling и добавить auth rate limiting перед production exposure.
4. Пройти Safari/Firefox и screen reader на физическом мобильном устройстве; Chromium viewport checks покрывают только свою среду.

## Правила продолжения

Сначала открыть этот файл, затем текущий audit report. Работать в отдельной ветке, устанавливать npm-зависимости из корня, сохранять volumes и не запускать Playwright с rebuild поверх другого runtime. Для действующего стека использовать `POLKA_REUSE_STACK=1` и его реальные порты. Финальные проверки проводить в тихой фазе без параллельных изменений исходников.
