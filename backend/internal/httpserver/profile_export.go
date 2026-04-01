package httpserver

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"mime"
	"path/filepath"
	"sort"
	"strings"

	"github.com/MattoYuzuru/Polka/backend/internal/books"
)

type shelfArchiveBook struct {
	Details          books.BookDetails
	CoverContentType string
	CoverBytes       []byte
}

type shelfArchiveMetadata struct {
	ID             string   `json:"id"`
	OwnerID        string   `json:"ownerId"`
	OwnerNickname  string   `json:"ownerNickname"`
	Title          string   `json:"title"`
	Author         string   `json:"author"`
	Description    string   `json:"description"`
	Year           int      `json:"year"`
	Publisher      string   `json:"publisher"`
	AgeRating      string   `json:"ageRating"`
	Genre          string   `json:"genre"`
	IsPublic       bool     `json:"isPublic"`
	Status         string   `json:"status"`
	Rating         *int     `json:"rating"`
	OpinionPreview string   `json:"opinionPreview"`
	CoverPalette   []string `json:"coverPalette"`
	CoverURL       string   `json:"coverUrl"`
	ViewerCanEdit  bool     `json:"viewerCanEdit"`
	CreatedAt      string   `json:"createdAt"`
}

func buildShelfArchive(items []shelfArchiveBook) ([]byte, error) {
	buffer := bytes.NewBuffer(nil)
	writer := zip.NewWriter(buffer)
	usedFolders := make(map[string]int, len(items))

	sortedItems := append([]shelfArchiveBook(nil), items...)
	sort.SliceStable(sortedItems, func(left, right int) bool {
		return sortedItems[left].Details.Title < sortedItems[right].Details.Title
	})

	for index, item := range sortedItems {
		folderName := uniqueArchiveFolderName(item.Details.Title, usedFolders, index+1)
		if err := writeArchiveJSON(
			writer,
			folderName+"/book.json",
			shelfArchiveMetadata{
				ID:             item.Details.ID,
				OwnerID:        item.Details.OwnerID,
				OwnerNickname:  item.Details.OwnerNickname,
				Title:          item.Details.Title,
				Author:         item.Details.Author,
				Description:    item.Details.Description,
				Year:           item.Details.Year,
				Publisher:      item.Details.Publisher,
				AgeRating:      item.Details.AgeRating,
				Genre:          item.Details.Genre,
				IsPublic:       item.Details.IsPublic,
				Status:         item.Details.Status,
				Rating:         item.Details.Rating,
				OpinionPreview: item.Details.OpinionPreview,
				CoverPalette:   item.Details.CoverPalette,
				CoverURL:       item.Details.CoverURL,
				ViewerCanEdit:  item.Details.ViewerCanEdit,
				CreatedAt:      item.Details.CreatedAt,
			},
		); err != nil {
			return nil, err
		}

		if err := writeArchiveJSON(writer, folderName+"/quotes.json", item.Details.Quotes); err != nil {
			return nil, err
		}

		if err := writeArchiveJSON(writer, folderName+"/opinions.json", item.Details.Opinions); err != nil {
			return nil, err
		}

		if len(item.CoverBytes) > 0 {
			fileWriter, err := writer.Create(folderName + "/cover" + archiveExtension(item.CoverContentType))
			if err != nil {
				return nil, fmt.Errorf("create cover file in archive: %w", err)
			}

			if _, err := fileWriter.Write(item.CoverBytes); err != nil {
				return nil, fmt.Errorf("write cover file to archive: %w", err)
			}
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("close zip archive: %w", err)
	}

	return buffer.Bytes(), nil
}

func writeArchiveJSON(writer *zip.Writer, path string, payload any) error {
	entry, err := writer.Create(path)
	if err != nil {
		return fmt.Errorf("create archive entry %q: %w", path, err)
	}

	body, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal archive json %q: %w", path, err)
	}

	body = append(body, '\n')
	if _, err := entry.Write(body); err != nil {
		return fmt.Errorf("write archive entry %q: %w", path, err)
	}

	return nil
}

func uniqueArchiveFolderName(title string, used map[string]int, index int) string {
	base := sanitizeArchiveName(title)
	if base == "" {
		base = fmt.Sprintf("book-%d", index)
	}

	used[base]++
	if used[base] == 1 {
		return base
	}

	return fmt.Sprintf("%s-%d", base, used[base])
}

func sanitizeArchiveName(value string) string {
	replacer := strings.NewReplacer(
		"/", " ",
		"\\", " ",
		":", " ",
		"*", " ",
		"?", " ",
		"\"", " ",
		"<", " ",
		">", " ",
		"|", " ",
	)

	sanitized := strings.TrimSpace(replacer.Replace(value))
	sanitized = strings.Join(strings.Fields(sanitized), " ")
	sanitized = strings.Trim(sanitized, ". ")
	if sanitized == "" {
		return ""
	}

	return sanitized
}

func archiveExtension(contentType string) string {
	if extensions, err := mime.ExtensionsByType(contentType); err == nil && len(extensions) > 0 {
		extension := strings.ToLower(filepath.Ext(strings.TrimSpace(extensions[0])))
		if extension != "" {
			return extension
		}
	}

	switch strings.TrimSpace(strings.ToLower(contentType)) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".bin"
	}
}
