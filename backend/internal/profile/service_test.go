package profile

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type editableRepository struct {
	Repository
	calls int
	input UpdateProfileInput
}

func (r *editableRepository) UpdateByUserID(_ context.Context, _ string, input UpdateProfileInput) (EditableProfile, error) {
	r.calls++
	r.input = input
	return EditableProfile{Nickname: input.Nickname}, nil
}
func TestUpdateProfileRejectsUnusableNicknameAndEmptyName(t *testing.T) {
	for _, input := range []UpdateProfileInput{{Nickname: "login", DisplayName: "Reader"}, {Nickname: "reader/name", DisplayName: "Reader"}, {Nickname: "reader", DisplayName: " "}, {Nickname: "reader", DisplayName: "Reader", Tagline: strings.Repeat("я", 281)}} {
		repo := &editableRepository{}
		_, err := NewService(repo).UpdateByUserID(context.Background(), "owner", input)
		if !errors.Is(err, ErrInvalidInput) || repo.calls != 0 {
			t.Fatalf("accepted %+v: %v", input, err)
		}
	}
	repo := &editableRepository{}
	_, err := NewService(repo).UpdateByUserID(context.Background(), "owner", UpdateProfileInput{Nickname: " читатель ", DisplayName: " Имя "})
	if err != nil || repo.input.Nickname != "читатель" || repo.input.DisplayName != "Имя" {
		t.Fatalf("normalization: %+v %v", repo.input, err)
	}
}
