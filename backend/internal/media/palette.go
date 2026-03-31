package media

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"sort"

	_ "golang.org/x/image/webp"
)

var ErrUnsupportedImage = errors.New("unsupported image")

type colorBucket struct {
	hex       string
	weight    int
	luminance float64
}

func ExtractPalette(content []byte) ([]string, error) {
	imageValue, _, err := image.Decode(bytes.NewReader(content))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnsupportedImage, err)
	}

	bounds := imageValue.Bounds()
	if bounds.Empty() {
		return []string{}, nil
	}

	counts := make(map[string]int)

	for y := bounds.Min.Y; y < bounds.Max.Y; y += sampleStep(bounds.Dy()) {
		for x := bounds.Min.X; x < bounds.Max.X; x += sampleStep(bounds.Dx()) {
			red, green, blue, alpha := imageValue.At(x, y).RGBA()
			if alpha == 0 {
				continue
			}

			hex := quantizedHex(red, green, blue)
			counts[hex]++
		}
	}

	buckets := make([]colorBucket, 0, len(counts))
	for hex, weight := range counts {
		buckets = append(buckets, colorBucket{
			hex:       hex,
			weight:    weight,
			luminance: relativeLuminance(hex),
		})
	}

	sort.SliceStable(buckets, func(left, right int) bool {
		if buckets[left].weight == buckets[right].weight {
			return buckets[left].luminance > buckets[right].luminance
		}

		return buckets[left].weight > buckets[right].weight
	})

	palette := make([]string, 0, 4)
	for _, bucket := range buckets {
		if len(palette) == 0 {
			palette = append(palette, bucket.hex)
			continue
		}

		if isDistinctColor(bucket.hex, palette) {
			palette = append(palette, bucket.hex)
		}

		if len(palette) == 4 {
			break
		}
	}

	if len(palette) == 1 {
		palette = append(palette, shiftLightness(palette[0], 0.18))
	}

	return palette, nil
}

func sampleStep(size int) int {
	switch {
	case size > 1200:
		return 12
	case size > 800:
		return 8
	case size > 320:
		return 4
	default:
		return 2
	}
}

func quantizedHex(red uint32, green uint32, blue uint32) string {
	r := quantizeChannel(uint8(red >> 8))
	g := quantizeChannel(uint8(green >> 8))
	b := quantizeChannel(uint8(blue >> 8))

	return fmt.Sprintf("#%02x%02x%02x", r, g, b)
}

func quantizeChannel(value uint8) uint8 {
	return uint8(math.Round(float64(value)/32.0) * 32.0)
}

func relativeLuminance(hex string) float64 {
	var red, green, blue uint8
	_, _ = fmt.Sscanf(hex, "#%02x%02x%02x", &red, &green, &blue)

	return 0.2126*float64(red) + 0.7152*float64(green) + 0.0722*float64(blue)
}

func isDistinctColor(candidate string, palette []string) bool {
	var candidateRed, candidateGreen, candidateBlue uint8
	_, _ = fmt.Sscanf(candidate, "#%02x%02x%02x", &candidateRed, &candidateGreen, &candidateBlue)

	for _, existing := range palette {
		var existingRed, existingGreen, existingBlue uint8
		_, _ = fmt.Sscanf(existing, "#%02x%02x%02x", &existingRed, &existingGreen, &existingBlue)

		distance := math.Sqrt(
			math.Pow(float64(candidateRed)-float64(existingRed), 2) +
				math.Pow(float64(candidateGreen)-float64(existingGreen), 2) +
				math.Pow(float64(candidateBlue)-float64(existingBlue), 2),
		)

		if distance < 48 {
			return false
		}
	}

	return true
}

func shiftLightness(hex string, factor float64) string {
	var red, green, blue uint8
	_, _ = fmt.Sscanf(hex, "#%02x%02x%02x", &red, &green, &blue)

	adjust := func(value uint8) uint8 {
		result := float64(value) + (255.0-float64(value))*factor
		if result > 255 {
			return 255
		}

		return uint8(result)
	}

	return fmt.Sprintf("#%02x%02x%02x", adjust(red), adjust(green), adjust(blue))
}
