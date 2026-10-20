import { currentTheme, DEFAULT_THEME, onThemeApplied, type ThemeId } from '../flow/theme';

/**
 * The accent-coloured artwork (UI icons, field-type icons, bottom-nav parts) exists in one
 * extra version per theme under /assets-theme/<theme>/ (public/assets stays the approved
 * lavender originals). Screens keep pointing at the originals; this swaps the picture on
 * every <img> that shows one, now and whenever one appears or changes its `src`.
 */
const PATH = /^(.*?)assets(?:-theme\/(?:coral|sage|mustard|sky))?\/(ui-icons|field-types|nav)\/(.+)$/;

export function themedSrc(src: string, theme: ThemeId): string | null {
  const m = PATH.exec(src);
  if (!m) return null;
  const [, base, dir, file] = m;
  return theme === DEFAULT_THEME ? `${base}assets/${dir}/${file}` : `${base}assets-theme/${theme}/${dir}/${file}`;
}

function retheme(img: HTMLImageElement, theme: ThemeId) {
  const src = img.getAttribute('src');
  if (!src) return;
  const next = themedSrc(src, theme);
  if (next && next !== src) img.setAttribute('src', next);
}

export function startThemedImages(root: Document = document): () => void {
  const all = () => root.querySelectorAll('img').forEach((img) => retheme(img, currentTheme()));
  const observer = new MutationObserver((records) => {
    const theme = currentTheme();
    for (const rec of records) {
      if (rec.type === 'attributes') { if (rec.target instanceof HTMLImageElement) retheme(rec.target, theme); continue; }
      rec.addedNodes.forEach((n) => {
        if (n instanceof HTMLImageElement) retheme(n, theme);
        else if (n instanceof Element) n.querySelectorAll('img').forEach((img) => retheme(img, theme));
      });
    }
  });
  observer.observe(root.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  const off = onThemeApplied(all);
  all();
  return () => { observer.disconnect(); off(); };
}
