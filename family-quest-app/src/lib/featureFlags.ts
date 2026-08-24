// Temporary product-decision holds, not a technical limitation -- both
// features below are fully built and functional (real Supabase-backed
// state, real RPCs, real UI), but their VISUAL DESIGN hasn't been settled
// (see the housework clicker's own long back-and-forth over character/
// background art style across CLEANER_ART_REDO_HANDOFF.md v5-v8) and the
// team asked to pull both from the live UI in both apps until that's
// decided, without losing any of the underlying code/data.
//
// family-quest-app and business-quest-app share this exact source tree via
// the '@core' alias (see business-quest-app/vite.config.ts) and neither
// feature has any app-mode branching (lib/appMode.ts) between them, so
// flipping a flag here takes effect in both apps identically -- there is
// no separate place to hold this per app.
//
// To bring a feature back: flip its flag back to true. Nothing else needs
// to change -- only the entry points that render each modal (and the
// matching TutorialTour step for the character shop) stop referencing it
// while its flag is off; the modal components, lib code, schema, and RPCs
// were never touched.

// Housework clicker minigame (HouseworkClickerModal) -- the dashboard's
// broom-icon entry button.
export const GAME_FEATURES_ENABLED = false;

// Character shop (CharacterShopModal, outfit purchases/equip) -- the
// dashboard topbar's character avatar button. The avatar itself still
// shows (it's the user's identity display, not just a shop entry point);
// only the click-to-open-shop behavior is held.
export const CHARACTER_CUSTOMIZATION_ENABLED = false;
