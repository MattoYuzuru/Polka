package profile

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

var defaultGradientStops = []string{"#101010", "#3563ff", "#ff7a51"}

type weightedGradientColor struct {
	hex    string
	weight float64
}

func buildProfileGradient(books []Book, fallback []string) []string {
	normalizedFallback := normalizeGradientStops(fallback)
	if len(normalizedFallback) == 0 {
		normalizedFallback = append([]string{}, defaultGradientStops...)
	}

	weights := make(map[string]float64)

	for _, book := range books {
		for index, color := range book.CoverPalette {
			normalized := normalizeHexColor(color)
			if normalized == "" {
				continue
			}

			weights[normalized] += paletteWeight(index)
		}
	}

	if len(weights) == 0 {
		return normalizedFallback
	}

	colors := make([]weightedGradientColor, 0, len(weights))
	for hex, weight := range weights {
		colors = append(colors, weightedGradientColor{
			hex:    toneGradientColor(hex),
			weight: weight,
		})
	}

	sort.SliceStable(colors, func(left, right int) bool {
		if colors[left].weight == colors[right].weight {
			return colors[left].hex < colors[right].hex
		}

		return colors[left].weight > colors[right].weight
	})

	primary := colors[0].hex
	secondary := pickContrastingColor(primary, colors)
	if secondary == "" {
		secondary = shiftColor(primary, 0.26)
	}

	bridge := pickBridgeColor(primary, secondary, colors)
	if bridge == "" {
		bridge = blendColors(primary, secondary, 0.5)
	}

	return []string{primary, bridge, secondary}
}

func paletteWeight(index int) float64 {
	switch index {
	case 0:
		return 8
	case 1:
		return 5
	case 2:
		return 3
	default:
		return 1
	}
}

func pickContrastingColor(primary string, colors []weightedGradientColor) string {
	primaryRed, primaryGreen, primaryBlue := parseHexColor(primary)

	bestHex := ""
	bestScore := -1.0

	for _, candidate := range colors[1:] {
		candidateRed, candidateGreen, candidateBlue := parseHexColor(candidate.hex)
		distance := colorDistance(
			primaryRed,
			primaryGreen,
			primaryBlue,
			candidateRed,
			candidateGreen,
			candidateBlue,
		)
		score := distance + candidate.weight*8 + colorSaturation(candidate.hex)*90
		if score > bestScore {
			bestScore = score
			bestHex = candidate.hex
		}
	}

	return bestHex
}

func pickBridgeColor(primary string, secondary string, colors []weightedGradientColor) string {
	bestHex := ""
	bestScore := -1.0

	for _, candidate := range colors {
		if candidate.hex == primary || candidate.hex == secondary {
			continue
		}

		primaryDistance := colorDistanceHex(primary, candidate.hex)
		secondaryDistance := colorDistanceHex(secondary, candidate.hex)
		if primaryDistance < 42 || secondaryDistance < 42 {
			continue
		}

		score := candidate.weight*10 - math.Abs(primaryDistance-secondaryDistance)
		if score > bestScore {
			bestScore = score
			bestHex = candidate.hex
		}
	}

	return bestHex
}

func normalizeGradientStops(stops []string) []string {
	normalized := make([]string, 0, len(stops))

	for _, stop := range stops {
		hex := normalizeHexColor(stop)
		if hex == "" {
			continue
		}

		normalized = append(normalized, hex)
		if len(normalized) == 3 {
			break
		}
	}

	return normalized
}

func normalizeHexColor(value string) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if len(trimmed) != 7 || !strings.HasPrefix(trimmed, "#") {
		return ""
	}

	for _, symbol := range trimmed[1:] {
		if !strings.ContainsRune("0123456789abcdef", symbol) {
			return ""
		}
	}

	return trimmed
}

func toneGradientColor(hex string) string {
	red, green, blue := parseHexColor(hex)
	luminance := 0.2126*float64(red) + 0.7152*float64(green) + 0.0722*float64(blue)

	switch {
	case luminance > 238:
		return shiftColor(hex, -0.18)
	case luminance < 14:
		return shiftColor(hex, 0.16)
	default:
		return hex
	}
}

func shiftColor(hex string, factor float64) string {
	red, green, blue := parseHexColor(hex)

	adjust := func(value uint8) uint8 {
		current := float64(value)
		if factor >= 0 {
			current += (255 - current) * factor
		} else {
			current *= 1 + factor
		}

		return uint8(clampColorChannel(math.Round(current)))
	}

	return fmt.Sprintf("#%02x%02x%02x", adjust(red), adjust(green), adjust(blue))
}

func blendColors(left string, right string, ratio float64) string {
	leftRed, leftGreen, leftBlue := parseHexColor(left)
	rightRed, rightGreen, rightBlue := parseHexColor(right)

	blend := func(start uint8, end uint8) uint8 {
		value := float64(start) + (float64(end)-float64(start))*ratio
		return uint8(clampColorChannel(math.Round(value)))
	}

	return fmt.Sprintf(
		"#%02x%02x%02x",
		blend(leftRed, rightRed),
		blend(leftGreen, rightGreen),
		blend(leftBlue, rightBlue),
	)
}

func colorDistanceHex(left string, right string) float64 {
	leftRed, leftGreen, leftBlue := parseHexColor(left)
	rightRed, rightGreen, rightBlue := parseHexColor(right)

	return colorDistance(leftRed, leftGreen, leftBlue, rightRed, rightGreen, rightBlue)
}

func colorSaturation(hex string) float64 {
	red, green, blue := parseHexColor(hex)
	maxChannel := math.Max(float64(red), math.Max(float64(green), float64(blue)))
	minChannel := math.Min(float64(red), math.Min(float64(green), float64(blue)))

	if maxChannel == 0 {
		return 0
	}

	return (maxChannel - minChannel) / maxChannel
}

func colorDistance(
	leftRed uint8,
	leftGreen uint8,
	leftBlue uint8,
	rightRed uint8,
	rightGreen uint8,
	rightBlue uint8,
) float64 {
	return math.Sqrt(
		math.Pow(float64(leftRed)-float64(rightRed), 2) +
			math.Pow(float64(leftGreen)-float64(rightGreen), 2) +
			math.Pow(float64(leftBlue)-float64(rightBlue), 2),
	)
}

func parseHexColor(hex string) (uint8, uint8, uint8) {
	var red, green, blue uint8
	_, _ = fmt.Sscanf(hex, "#%02x%02x%02x", &red, &green, &blue)

	return red, green, blue
}

func clampColorChannel(value float64) float64 {
	return math.Max(0, math.Min(255, value))
}
