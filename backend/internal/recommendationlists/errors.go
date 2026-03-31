package recommendationlists

import "errors"

var (
	ErrNotFound     = errors.New("recommendation list not found")
	ErrInvalidInput = errors.New("invalid recommendation list input")
	ErrUnauthorized = errors.New("unauthorized")
)
