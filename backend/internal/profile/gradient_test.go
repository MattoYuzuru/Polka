package profile

import "testing"

func TestBuildProfileGradientFallsBackWhenBooksHaveNoPalette(t *testing.T) {
	t.Parallel()

	fallback := []string{"#101010", "#3563ff", "#ff7a51"}
	gradient := buildProfileGradient([]Book{{Title: "Без обложки"}}, fallback)

	if len(gradient) != len(fallback) {
		t.Fatalf("expected fallback gradient length %d, got %d", len(fallback), len(gradient))
	}

	for index := range fallback {
		if gradient[index] != fallback[index] {
			t.Fatalf("expected fallback stop %q at index %d, got %q", fallback[index], index, gradient[index])
		}
	}
}

func TestBuildProfileGradientAggregatesDominantAndContrastingPaletteColors(t *testing.T) {
	t.Parallel()

	gradient := buildProfileGradient(
		[]Book{
			{CoverPalette: []string{"#f2c94c", "#111111"}},
			{CoverPalette: []string{"#f2c94c", "#d9534f"}},
			{CoverPalette: []string{"#30a46c"}},
			{CoverPalette: []string{"#6f42c1", "#3563ff"}},
		},
		nil,
	)

	if len(gradient) != 3 {
		t.Fatalf("expected 3 gradient stops, got %d", len(gradient))
	}

	if gradient[0] != "#f2c94c" {
		t.Fatalf("expected dominant yellow as the first stop, got %q", gradient[0])
	}

	if gradient[2] != "#6f42c1" && gradient[2] != "#3563ff" {
		t.Fatalf("expected a cool contrasting stop, got %q", gradient[2])
	}

	if gradient[1] == gradient[0] || gradient[1] == gradient[2] {
		t.Fatalf("expected bridge stop to differ from edges, got %v", gradient)
	}
}

func TestBuildProfileGradientUsesDefaultFallbackForBrokenStops(t *testing.T) {
	t.Parallel()

	gradient := buildProfileGradient(nil, []string{"broken", "#123"})

	expected := []string{"#101010", "#3563ff", "#ff7a51"}
	for index := range expected {
		if gradient[index] != expected[index] {
			t.Fatalf("expected default fallback %q at index %d, got %q", expected[index], index, gradient[index])
		}
	}
}
