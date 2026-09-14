# Monovella Brand Assets

This is the canonical, flattened package for Monovella's current web and app
exports. Use the supplied files as-is. Do not redraw, recolour, crop, or
recreate the mark in product code.

## About the name

**Monovella means one whole health story.** It is a coined brand name, not a
literal translation: **mono-** carries the sense of one or single, while
**novella** carries the sense of a short narrative and, historically, news or
something new.

## Primary marks

| File | Use |
|---|---|
| `logo-colored.svg` / `.png` | Default full logo on light, paper, or neutral surfaces. |
| `logo-dark.svg` / `.png` | Single-colour dark full logo when a coloured mark is unsuitable. |
| `logo-light.svg` / `.png` | Light full logo on dark surfaces. |
| `logo-monochrome.svg` / `.png` | Single-colour output for constrained production. |
| `icon-colored.svg` / `.png` | Default standalone mark where the full logo will not fit. |
| `icon-dark`, `icon-light`, `icon-monochrome` | Standalone mark variants for the matching surface or production constraint. |

## Usage rules

- Use `logo-colored` for the normal full lockup. Use an icon variant only when the lockup would be too small or too cramped.
- Select dark, light, and monochrome variants for the surface or output requirement. Do not apply CSS filters or substitute ad hoc colours.
- Preserve the aspect ratio and clear space around the mark. Keep the asset as an image rather than rebuilding it from text or SVG paths.
- The prototype's browser metadata and install assets are copied from this package into `Product/prototype/public/brand/`.

## Palette

- Clay: `#A8461F`
- Deep teal: `#155953`
- Warm paper: `#FBF9F5`
- Ink: `#211D18`

## Typography

Monovella sets type in exactly two typefaces, no third font:

- **EB Garamond:** display and body/UI text. One editorial serif carries
  headlines, page copy, and interface labels, which keeps the system quieter
  than a display/body pairing and matches the brand's journal-like, narrative
  tone (see "About the name" above). Set body copy at 18px+ and interface
  text at semibold or heavier where it runs small; Garamond's fine strokes
  and small x-height lose definition below that on screen.
- **Fira Mono:** technical and tabular data only: IDs, timestamps,
  verification codes, prices in dense tables, and actual code. Never used for
  headlines, body copy, or brand expression. This mirrors how the prior
  system reserved its monospace font for data, not identity, and gives
  dense, small-scale UI a legible alternative to setting Garamond too small.

Full type scale, weights, and per-surface rules live in the root `DESIGN.md`.

## App and browser exports

| File | Use |
|---|---|
| `app-icon-colored.png` | Opaque 1024px iOS and general app icon. |
| `app-icon-foreground.png` | Transparent Android adaptive-icon foreground. |
| `app-icon-monochrome.png` | Android adaptive-icon monochrome layer. |
| `favicon.svg`, `favicon.png`, `favicon.ico` | Browser favicon exports. |

Every SVG has a matching PNG export. The full app-icon variants are 1024 × 1024, and `favicon.ico` contains 16px, 32px, 48px, and 64px browser sizes.

## Expo use

Expo app configuration consumes PNG files, not SVG masters. Ready-to-use PNG exports are included.

```json
{
  "expo": {
    "icon": "./assets/brand/app-icon-colored.png",
    "ios": {
      "icon": "./assets/brand/app-icon-colored.png"
    },
    "android": {
      "icon": "./assets/brand/app-icon-colored.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/brand/app-icon-foreground.png",
        "monochromeImage": "./assets/brand/app-icon-monochrome.png",
        "backgroundColor": "#FBF9F5"
      }
    }
  }
}
```

`app-icon-colored.png` is the opaque 1024 × 1024 universal/iOS icon. `app-icon-foreground.png` and `app-icon-monochrome.png` are transparent Android adaptive-icon layers. Android applies the themed colour to the monochrome layer.

Use `favicon.svg` directly in the web app's `<head>` or framework metadata configuration.
