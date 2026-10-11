package httputil

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeJSONRequiresOneCompleteKnownObject(t *testing.T) {
	for _, body := range []string{`{"name":"first"} {"name":"second"}`, `{"name":"first"} trailing`, `{"unknown":true}`, `{"name":`} {
		var target struct {
			Name string `json:"name"`
		}
		if err := DecodeJSON(httptest.NewRequest("POST", "/", strings.NewReader(body)), &target); err == nil {
			t.Fatalf("accepted %q", body)
		}
	}
	var target struct {
		Name string `json:"name"`
	}
	if err := DecodeJSON(httptest.NewRequest("POST", "/", strings.NewReader("{\"name\":\"reader\"}\n ")), &target); err != nil || target.Name != "reader" {
		t.Fatalf("valid request failed: %v, %+v", err, target)
	}
}
