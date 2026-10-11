# Демо-библиотека

Восемь дополнительных книг показывают длинные заголовки, японскую типографику, диакритику, кириллицу, разные статусы и заметки. Это карточки библиотеки, а не распространение полных текстов. Читательские мнения написаны для демонстрации; обложки — оригинальные макеты Polka, а не изображения коммерческих изданий. Год относится к произведению или явно указанному изданию.

| Язык    | Книга                                             | Источник метаданных                                                                                                    |
| ------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 日本語  | こころ — 夏目 漱石                                | [Aozora Bunko](https://www.aozora.gr.jp/cards/000148/card773.html)                                                     |
| 日本語  | 銀河鉄道の夜 — 宮沢 賢治                          | [Aozora Bunko](https://www.aozora.gr.jp/cards/000081/card43737.html)                                                   |
| Español | Don Quijote de la Mancha — Miguel de Cervantes    | [Project Gutenberg](https://www.gutenberg.org/ebooks/2000)                                                             |
| Español | Niebla — Miguel de Unamuno                        | [Project Gutenberg](https://www.gutenberg.org/ebooks/49836)                                                            |
| English | Flatland — Edwin A. Abbott                        | [Project Gutenberg](https://www.gutenberg.org/ebooks/201)                                                              |
| English | Structure and Interpretation of Computer Programs | [MIT Press, второе издание](https://mitpress.mit.edu/9780262510875/structure-and-interpretation-of-computer-programs/) |
| Русский | Мы — Евгений Замятин                              | [Gutenberg, первая публикация в английском переводе](https://www.gutenberg.org/ebooks/61963)                           |
| Русский | Евгений Онегин — Александр Пушкин                 | [Викитека](<https://ru.wikisource.org/wiki/Евгений_Онегин_(Пушкин)>)                                                   |

`demo/books.json` хранит карточки. `demo/covers/` содержит редактируемые SVG и готовые PNG 600×900. Скачанные исторические изображения для референса сохранены в `demo/sources/`: [геометрическая иллюстрация Flatland](https://www.gutenberg.org/files/201/201-h/images/ill_002.png), [титул Niebla 1914](https://www.gutenberg.org/cache/epub/49836/images/cover.jpg). Они не выдаются за новые обложки.

После запуска локального стека:

```bash
POLKA_DEMO_URL=http://127.0.0.1:14200 npm run demo:seed
```

Seeder входит в development demo-аккаунт, загружает обложки через API, добавляет отсутствующие книги и две подборки. Повторный запуск сохраняет существующие карточки. Скрипт разрешает только localhost, не меняет профиль и не удаляет книги. Другую локальную учётку можно выбрать через `POLKA_DEMO_EMAIL` / `POLKA_DEMO_PASSWORD`.

Для пересборки PNG нужен установленный Playwright Chromium:

```bash
npm run playwright:install
npm run demo:covers
```

На macOS можно использовать установленный Chrome, без скачивания нового браузера:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run demo:covers
```

Скриншоты и запись реального взаимодействия создаёт `npm run demo:capture`. По умолчанию он использует `http://127.0.0.1:14200`; URL задаётся через `POLKA_DEMO_URL`. Результаты находятся в `docs/screenshots/`. Запись охватывает полку, переключение подборки, страницу книги и раскрытие заметки. Для GIF используется установленный `ffmpeg`; исходное видео сохраняется отдельно.
