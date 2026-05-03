package theme

import "github.com/charmbracelet/lipgloss"

// newWranngleLight returns a Wranngle-branded light theme that preserves the
// Catppuccin slot names (Blue/Mauve/Sky/Peach/etc.) but maps them onto the
// canonical Wranngle palette (sunset / wviolet / sand / night) defined in
// ~/.agents/DESIGN.md and tokens/tokens.css.
//
// Slot mapping intent (light surface):
//
//	Base    = sand-50      page background
//	Surface = sand-100     muted surface
//	Overlay = sand-300     borders / dividers
//	Text    = night-950    primary text
//	Subtext = night-500    secondary text
//	Blue    = sunset-500   primary brand accent (replaces Catppuccin Blue role)
//	Mauve   = wviolet-500  secondary brand accent
//	Green   = #5d8c61      cactus (healthy / success)
//	Yellow  = sunset-300   warning amber
//	Sky     = wviolet-400  light secondary accent
//	Peach   = sunset-400   warm tertiary
//	Red     = #ef4444      destructive
//	Pink    = wviolet-300  highlight accent
func newWranngleLight() Theme {
	return Theme{
		Base:    lipgloss.Color("#fcfaf5"),
		Surface: lipgloss.Color("#f6f1e7"),
		Overlay: lipgloss.Color("#dac39f"),
		Text:    lipgloss.Color("#12111a"),
		Subtext: lipgloss.Color("#6a6380"),

		Blue:   lipgloss.Color("#ff5f00"), // sunset-500 — primary action
		Mauve:  lipgloss.Color("#cf3c69"), // wviolet-500 — secondary
		Green:  lipgloss.Color("#5d8c61"), // cactus
		Yellow: lipgloss.Color("#ff9e33"), // sunset-300
		Sky:    lipgloss.Color("#dd6186"), // wviolet-400
		Peach:  lipgloss.Color("#ff7f00"), // sunset-400
		Red:    lipgloss.Color("#ef4444"),
		Pink:   lipgloss.Color("#ea8aa6"), // wviolet-300
	}
}

// newWranngleDark returns the dark variant — night-950 page, sand for text,
// brand accents preserved.
func newWranngleDark() Theme {
	return Theme{
		Base:    lipgloss.Color("#12111a"), // night-950
		Surface: lipgloss.Color("#201e28"), // night-900
		Overlay: lipgloss.Color("#393444"), // night-800
		Text:    lipgloss.Color("#fcfaf5"), // sand-50
		Subtext: lipgloss.Color("#aaa4b8"), // night-300

		Blue:   lipgloss.Color("#ff7f00"), // sunset-400 — slightly lighter for dark bg
		Mauve:  lipgloss.Color("#dd6186"), // wviolet-400
		Green:  lipgloss.Color("#7aae7e"),
		Yellow: lipgloss.Color("#ffc179"), // sunset-200
		Sky:    lipgloss.Color("#ea8aa6"), // wviolet-300
		Peach:  lipgloss.Color("#ff9e33"), // sunset-300
		Red:    lipgloss.Color("#ef4444"),
		Pink:   lipgloss.Color("#f2b6c6"), // wviolet-200
	}
}
