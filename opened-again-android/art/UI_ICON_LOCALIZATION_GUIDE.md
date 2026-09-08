# UI_ICON_LOCALIZATION_GUIDE

## Structure
- `assets/ui/icons/unlabeled/` : language-neutral icon-only PNG assets
- `assets/ui/icons/labeled/jp/` : previous Japanese-labeled reference PNGs
- `assets/ui/labels/ko.json` : Korean labels
- `assets/ui/labels/jp.json` : Japanese labels
- `assets/ui/labels/en.json` : English labels

## Recommended build usage
Use icon-only PNG assets for all builds, and render text labels from locale strings.

Example mapping:
- `icon_home.png` + `ko.home` => 홈
- `icon_home.png` + `jp.home` => ホーム
- `icon_home.png` + `en.home` => Home
