package identity

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

func ValidNickname(nickname string) bool {
	if utf8.RuneCountInString(nickname) < 3 {
		return false
	}
	switch strings.ToLower(nickname) {
	case "login", "register":
		return false
	}
	for _, char := range nickname {
		if !unicode.IsLetter(char) && !unicode.IsDigit(char) && char != '_' && char != '-' && char != '.' {
			return false
		}
	}
	return strings.Trim(nickname, ".") != ""
}
