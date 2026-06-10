# SferaLuna — Design System

## Brand
Application de rencontre premium française. Univers lunaire/nocturne. Cible : femmes 28 ans+, relations sérieuses.
Ton : chaleureux, élégant, rassurant, jamais superficiel.

## Colors

### Dark Palette (primary)
- Background deep: `#1a0b2e`
- Background mid: `#2d1b69`
- Background surface: `#3a2a82`
- Accent purple: `#7C3AED` (purple-600)
- Accent pink: `#DB2777` (pink-600)
- Gradient: `purple-600 → pink-600` = `['#7C3AED', '#DB2777']`

### Light Palette (cards, surfaces)
- Off-white: `#faf9ff`
- Light purple tint: `#f0ecff`
- Muted purple: `#8E7AB5`
- Deep muted: `#5B4B8A`

### Semantic
- Text primary (dark bg): `#FFFFFF`
- Text secondary (dark bg): `rgba(255,255,255,0.6)`
- Text muted (dark bg): `rgba(255,255,255,0.35)`
- Text primary (light bg): `#1a0b2e`
- Border: `rgba(255,255,255,0.12)`
- Glass surface: `rgba(255,255,255,0.08)`
- Glass border: `rgba(255,255,255,0.15)`

## Typography
- Display: **Playfair Display** (elegant, premium) — for headings, brand name
- Body: **Inter** or system font — for UI text, labels, body
- Sizes: 32/28/24/20/16/14/12
- Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## Glassmorphism Style
```
background: rgba(255,255,255,0.08)
border: 1px solid rgba(255,255,255,0.15)
borderRadius: 20
backdropFilter: blur(20px)  // via blur on web, approximate on native
```

## Spacing Scale
4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64

## Border Radius
- Small: 8
- Medium: 16
- Large: 20
- XL: 28
- Full: 999

## Shadows
```
shadowColor: '#7C3AED'
shadowOffset: { width: 0, height: 8 }
shadowOpacity: 0.3
shadowRadius: 20
elevation: 12
```

## Bottom Tabs
- Background: `rgba(26, 11, 46, 0.95)` with border top `rgba(255,255,255,0.1)`
- Active tint: `#DB2777` (pink)
- Inactive tint: `rgba(255,255,255,0.4)`
- Icons: phosphor-react-native, weight="duotone"

## Component Patterns

### Primary Button
- Gradient `#7C3AED → #DB2777`, borderRadius 999, height 56, full width
- Text: white, 16, semibold

### Glass Card
- bg: `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.15)`, borderRadius 20

### Input
- bg: `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.2)`, borderRadius 16
- Text: white, placeholder: `rgba(255,255,255,0.4)`
- Height 56, padding horizontal 16

## UX Patterns
- Screen transitions: smooth slide (default expo-router)
- Loading: ActivityIndicator with pink accent
- Status bar: light content on dark backgrounds
- Safe area: always wrap in SafeAreaView
- Onboarding: full-screen gradient with moon/star imagery
