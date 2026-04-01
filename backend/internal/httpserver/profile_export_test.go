package httpserver

import (
	"archive/zip"
	"bytes"
	"io"
	"testing"

	"github.com/MattoYuzuru/Polka/backend/internal/books"
)

func TestBuildShelfArchiveCreatesBookFoldersAndPayloadFiles(t *testing.T) {
	t.Parallel()

	archiveBytes, err := buildShelfArchive([]shelfArchiveBook{
		{
			Details: books.BookDetails{
				ID:            "book-1",
				Title:         "Дюна",
				Author:        "Фрэнк Герберт",
				OwnerNickname: "mattoy",
				Quotes: []books.Quote{
					{ID: "quote-1", Content: "Fear is the mind-killer."},
				},
				Opinions: []books.Opinion{
					{ID: "opinion-1", Content: "Сильная архитектура мира."},
				},
			},
			CoverContentType: "image/png",
			CoverBytes:       []byte("png-bytes"),
		},
		{
			Details: books.BookDetails{
				ID:            "book-2",
				Title:         "Дюна",
				Author:        "Фрэнк Герберт",
				OwnerNickname: "mattoy",
			},
		},
	})
	if err != nil {
		t.Fatalf("buildShelfArchive returned error: %v", err)
	}

	reader, err := zip.NewReader(bytes.NewReader(archiveBytes), int64(len(archiveBytes)))
	if err != nil {
		t.Fatalf("zip.NewReader returned error: %v", err)
	}

	entries := make(map[string]string, len(reader.File))
	for _, file := range reader.File {
		content, readErr := readZipEntry(file)
		if readErr != nil {
			t.Fatalf("read zip entry %q: %v", file.Name, readErr)
		}

		entries[file.Name] = content
	}

	expectedPaths := []string{
		"Дюна/book.json",
		"Дюна/quotes.json",
		"Дюна/opinions.json",
		"Дюна/cover.png",
		"Дюна-2/book.json",
		"Дюна-2/quotes.json",
		"Дюна-2/opinions.json",
	}

	for _, path := range expectedPaths {
		if _, exists := entries[path]; !exists {
			t.Fatalf("expected archive entry %q to exist, entries: %v", path, mapsKeys(entries))
		}
	}

	if entries["Дюна/cover.png"] != "png-bytes" {
		t.Fatalf("expected cover bytes to be preserved, got %q", entries["Дюна/cover.png"])
	}

	if !bytes.Contains([]byte(entries["Дюна/book.json"]), []byte(`"title": "Дюна"`)) {
		t.Fatalf("expected book metadata json to contain title, got %q", entries["Дюна/book.json"])
	}
}

func TestSanitizeArchiveNameStripsUnsupportedCharacters(t *testing.T) {
	t.Parallel()

	got := sanitizeArchiveName(`  ../A:Book?*"<>|  `)
	if got != "A Book" {
		t.Fatalf("expected sanitized name %q, got %q", "A Book", got)
	}
}

func readZipEntry(file *zip.File) (string, error) {
	reader, err := file.Open()
	if err != nil {
		return "", err
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func mapsKeys(entries map[string]string) []string {
	keys := make([]string, 0, len(entries))
	for key := range entries {
		keys = append(keys, key)
	}

	return keys
}
