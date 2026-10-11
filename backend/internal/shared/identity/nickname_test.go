package identity

import "testing"

func TestNicknameCanBeUsedAsProfileRoute(t *testing.T) {
	for _, nickname := range []string{"login", "REGISTER", "..", "...", "reader/name", "reader?tab=books", "reader name", "reader%2Fname", "ab", "reader\nname"} {
		if ValidNickname(nickname) {
			t.Fatalf("accepted unusable nickname %q", nickname)
		}
	}
	for _, nickname := range []string{"mattoy", "читатель", "reader-name", "reader_2", "reader.name"} {
		if !ValidNickname(nickname) {
			t.Fatalf("rejected valid nickname %q", nickname)
		}
	}
}
