// Package theme provides the visual theme system for the dashboard.
package theme

import (
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
)

// Theme holds all color definitions for the pipeline dashboard.
type Theme struct {
	// Base colors
	Base    lipgloss.Color
	Surface lipgloss.Color
	Overlay lipgloss.Color
	Text    lipgloss.Color
	Subtext lipgloss.Color

	// Accent colors
	Blue   lipgloss.Color
	Mauve  lipgloss.Color
	Green  lipgloss.Color
	Yellow lipgloss.Color
	Sky    lipgloss.Color
	Peach  lipgloss.Color
	Red    lipgloss.Color
	Pink   lipgloss.Color
}

// NewTheme creates a theme by name. Use "auto" or "" to detect from terminal background.
//
// Themes:
//   - "catppuccin-mocha" / "catppuccin-latte": upstream Catppuccin variants
//     (default, preserves the look from the santifer/career-ops upstream).
//   - "wranngle" / "wranngle-light" / "wranngle-dark": Wranngle-branded
//     variants that map the same slot structure onto the canonical Wranngle
//     palette (see internal/theme/wranngle.go).
func NewTheme(name string) Theme {
	switch name {
	case "catppuccin-mocha":
		return newCatppuccinMocha()
	case "catppuccin-latte":
		return newCatppuccinLatte()
	case "wranngle-light":
		return newWranngleLight()
	case "wranngle-dark":
		return newWranngleDark()
	case "wranngle":
		if termenv.HasDarkBackground() {
			return newWranngleDark()
		}
		return newWranngleLight()
	case "auto", "":
		if termenv.HasDarkBackground() {
			return newCatppuccinMocha()
		}
		return newCatppuccinLatte()
	default:
		return newCatppuccinMocha()
	}
}
