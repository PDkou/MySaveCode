// Shared category color choices -- used by both AddCategoryModal and
// EditCategoryModal (previously duplicated in each). A curated pastel set
// drawn from the app icon's own palette (lavender ground, coral drawer,
// sage-green drawers) rather than saturated primaries or the earlier
// wood/brass palette -- see global.css's color tokens for the same set
// applied to the app chrome itself.
export const CATEGORY_COLOR_CHOICES = [
  '#6F5499', // lavender
  '#F17B6B', // coral
  '#5FA382', // sage green
  '#E0A93E', // mustard
  '#4FA8A0', // dusty teal
  '#D98BA0', // dusty rose
  '#6E8FC9', // soft blue
  '#8A82A3', // gray-lavender
];

// Icon choices for a category -- covers the domains someone is likely to
// want a drawer for (finance, fashion, beauty, food, hobbies, health,
// tech, travel, pets, home, kids, sports, entertainment, work/study),
// not just the three worked examples (가계부/옷장/화장품) the app was
// originally scoped around.
export const CATEGORY_EMOJI_CHOICES = [
  '📁',
  '💰',
  '👕',
  '💄',
  '📚',
  '🏋️',
  '🐾',
  '🌱',
  '🎮',
  '🚗',
  '✈️',
  '🏠',
  '🎬',
  '🍔',
  '🎵',
  '💊',
  '🧸',
  '🛠️',
  '🎁',
  '💻',
  '⚽',
  '📷',
  '💳',
  '🍷',
  '🚲',
  '🎨',
  '📺',
  '🧴',
];
