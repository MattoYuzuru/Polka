package books

import "errors"

var (
	ErrNotFound     = errors.New("book not found")
	ErrInvalidInput = errors.New("invalid book input")
	ErrUnauthorized = errors.New("unauthorized")
)
