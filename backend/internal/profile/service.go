package profile

import (
	"errors"
	"strings"
	"time"
)

var ErrNotFound = errors.New("profile not found")

type Stats struct {
	MemberSinceLabel         string `json:"memberSinceLabel"`
	BooksCount               int    `json:"booksCount"`
	CompletedCount           int    `json:"completedCount"`
	RecommendationListsCount int    `json:"recommendationListsCount"`
}

type User struct {
	Nickname  string    `json:"nickname"`
	Display   string    `json:"displayName"`
	Tagline   string    `json:"tagline"`
	CreatedAt time.Time `json:"createdAt"`
}

type Book struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Author         string   `json:"author"`
	Description    string   `json:"description"`
	Year           int      `json:"year"`
	Publisher      string   `json:"publisher"`
	AgeRating      string   `json:"ageRating"`
	Genre          string   `json:"genre"`
	Status         string   `json:"status"`
	Rating         *int     `json:"rating"`
	OpinionPreview string   `json:"opinionPreview"`
	CoverPalette   []string `json:"coverPalette"`
}

type RecommendationList struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	BooksCount  int    `json:"booksCount"`
	IsPublic    bool   `json:"isPublic"`
}

type PublicProfile struct {
	User                User                 `json:"user"`
	Stats               Stats                `json:"stats"`
	GradientStops       []string             `json:"gradientStops"`
	Books               []Book               `json:"books"`
	RecommendationLists []RecommendationList `json:"recommendationLists"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (service *Service) ByNickname(nickname string) (PublicProfile, error) {
	if strings.TrimSpace(strings.ToLower(nickname)) != "mattoy" {
		return PublicProfile{}, ErrNotFound
	}

	rating10 := 10
	rating9 := 9
	rating8 := 8

	return PublicProfile{
		User: User{
			Nickname:  "mattoy",
			Display:   "Matto Yuzuru",
			Tagline:   "Собираю библиотеку как личную книжную газету: с топами, заметками и спокойной типографикой.",
			CreatedAt: time.Date(2024, time.September, 14, 9, 0, 0, 0, time.UTC),
		},
		Stats: Stats{
			MemberSinceLabel:         "с сентября 2024",
			BooksCount:               24,
			CompletedCount:           12,
			RecommendationListsCount: 3,
		},
		GradientStops: []string{"#101010", "#3563ff", "#ff7a51"},
		Books: []Book{
			{
				ID:             "book-451",
				Title:          "451° по Фаренгейту",
				Author:         "Рэй Брэдбери",
				Description:    "Антиутопия о памяти, чтении и цене удобного мира.",
				Year:           1953,
				Publisher:      "Ballantine Books",
				AgeRating:      "16+",
				Genre:          "Антиутопия",
				Status:         "Прочитал",
				Rating:         &rating10,
				OpinionPreview: "Перечитываю ради темпа, огня и тревоги за культурную амнезию.",
				CoverPalette:   []string{"#0f0f12", "#d94f3d", "#f9be54"},
			},
			{
				ID:             "book-dune",
				Title:          "Дюна",
				Author:         "Фрэнк Герберт",
				Description:    "Политика, экология и мессианские конструкции на уровне эпоса.",
				Year:           1965,
				Publisher:      "Chilton Books",
				AgeRating:      "16+",
				Genre:          "Научная фантастика",
				Status:         "Читаю",
				Rating:         &rating9,
				OpinionPreview: "Держу высоко в сетке за масштаб мира и плотность деталей.",
				CoverPalette:   []string{"#26120c", "#b56d3f", "#f0d0a1"},
			},
			{
				ID:             "book-sea",
				Title:          "Море спокойствия",
				Author:         "Эмили Сент-Джон Мандел",
				Description:    "Тихая научная фантастика о времени, памяти и повторяемости сюжетов.",
				Year:           2022,
				Publisher:      "Knopf",
				AgeRating:      "16+",
				Genre:          "Фантастика",
				Status:         "Хочу",
				Rating:         &rating8,
				OpinionPreview: "В списке на ближайшее чтение ради лёгкости формы и интеллектуального хода.",
				CoverPalette:   []string{"#111827", "#2854a6", "#b6d7ff"},
			},
		},
		RecommendationLists: []RecommendationList{
			{
				ID:          "list-newspaper-core",
				Title:       "Книги, которые ощущаются как архив",
				Description: "Подборка книг с сильным чувством документа, следа и голоса эпохи.",
				BooksCount:  5,
				IsPublic:    true,
			},
			{
				ID:          "list-sf-entry",
				Title:       "Мягкий вход в sci-fi",
				Description: "Для тех, кто хочет начать фантастику не с энциклопедии, а с настроения.",
				BooksCount:  4,
				IsPublic:    true,
			},
			{
				ID:          "list-private-top",
				Title:       "Личный пересбор топа",
				Description: "Черновой приватный список для перестановки любимых книг.",
				BooksCount:  7,
				IsPublic:    false,
			},
		},
	}, nil
}
