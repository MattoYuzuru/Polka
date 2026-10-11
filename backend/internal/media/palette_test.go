package media

import (
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"hash/crc32"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/MattoYuzuru/Polka/backend/internal/config"
)

func whitePNG(t *testing.T) []byte {
	t.Helper()
	value := image.NewRGBA(image.Rect(0, 0, 2, 2))
	for y := 0; y < 2; y++ {
		for x := 0; x < 2; x++ {
			value.Set(x, y, color.White)
		}
	}
	var body bytes.Buffer
	if err := png.Encode(&body, value); err != nil {
		t.Fatal(err)
	}
	return body.Bytes()
}
func TestExtractPalettePreservesBrightChannels(t *testing.T) {
	palette, err := ExtractPalette(whitePNG(t))
	if err != nil {
		t.Fatal(err)
	}
	if len(palette) == 0 || palette[0] != "#ffffff" {
		t.Fatalf("white quantized to %v", palette)
	}
	if got := quantizeChannel(250); got != 255 {
		t.Fatalf("bright channel overflowed to %d", got)
	}
}
func TestExtractPaletteRejectsOversizedDimensionsBeforeDecode(t *testing.T) {
	body := whitePNG(t)
	binary.BigEndian.PutUint32(body[16:20], 100000)
	binary.BigEndian.PutUint32(body[29:33], crc32.ChecksumIEEE(body[12:29]))
	if _, err := ExtractPalette(body); !errors.Is(err, ErrUnsupportedImage) {
		t.Fatalf("accepted huge image header: %v", err)
	}
}
func TestUploadCoverUsesOwnerNamespaceAndDetectedImageType(t *testing.T) {
	var storedType, key string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		storedType = r.Header.Get("Content-Type")
		key = r.URL.Path
		_, _ = io.Copy(io.Discard, r.Body)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	storage, err := New(config.Config{StorageEndpoint: server.URL, StorageRegion: "us-east-1", StorageBucket: "test", StorageAccessKeyID: "test", StorageSecretAccessKey: "test", StorageUsePathStyle: true})
	if err != nil {
		t.Fatal(err)
	}
	uploaded, err := storage.UploadCover(context.Background(), UploadInput{OwnerUserID: "owner", FileName: "payload.html", ContentType: "text/html", Body: whitePNG(t)})
	if err != nil {
		t.Fatal(err)
	}
	if uploaded.ContentType != "image/png" || storedType != "image/png" {
		t.Fatalf("untrusted media type stored: %q %q", uploaded.ContentType, storedType)
	}
	if !strings.HasPrefix(uploaded.ObjectKey, "covers/owner/") || !strings.Contains(key, "covers/owner/") {
		t.Fatalf("unscoped object key: %q (%s)", uploaded.ObjectKey, key)
	}
	second, err := buildObjectKey("owner")
	if err != nil {
		t.Fatal(err)
	}
	if second == uploaded.ObjectKey {
		t.Fatal("duplicate random object keys")
	}
}

func TestOpenMissingS3ObjectReturnsNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		w.WriteHeader(http.StatusNotFound)
		_, _ = io.WriteString(w, `<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>`)
	}))
	defer server.Close()
	storage, err := New(config.Config{StorageEndpoint: server.URL, StorageRegion: "us-east-1", StorageBucket: "test", StorageAccessKeyID: "test", StorageSecretAccessKey: "test", StorageUsePathStyle: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := storage.Open(context.Background(), "missing"); !errors.Is(err, ErrObjectNotFound) {
		t.Fatalf("missing object is not mapped: %v", err)
	}
}
