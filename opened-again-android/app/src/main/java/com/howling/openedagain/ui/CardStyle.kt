package com.howling.openedagain.ui

import android.graphics.Color
import com.howling.openedagain.core.IncidentType
import com.howling.openedagain.core.Rarity

/**
 * Single source of truth for the TCG-style share card's per-rarity colors --
 * a 1:1 port of `PALETTE`/`FOIL_TITLE` in the confirmed Python/PIL mockup
 * (sim_tcg_v16.py, see docs/CARD_LAYOUT_SPEC.md for the coordinate half of
 * the spec). Position/size is NOT here -- see
 * `ShareCardRenderer.CardLayout` -- only look is.
 *
 * [border]/[glow] are the same color (the rarity's signature accent) used
 * for both the art-window stroke and every panel/chip outline; [text] is
 * the ink color for flat (non-foil) text; [panel] is the translucent
 * header/info panel fill; [medalFix] corrects for the emblem medallion
 * shell PNGs not sharing the same "ring fill ratio" of their own canvas
 * (EPIC/LEGENDARY's flair reaches closer to the edge, so drawn at the same
 * literal size their ring reads smaller -- see CARD_LAYOUT_SPEC.md); [fx]
 * is the sparkle/glow escalation level for the emblem (0 none, 1 epic,
 * 2 legendary -- HIDDEN gets its own bespoke treatment instead of this
 * scale, see ShareCardRenderer's hidden-emblem branch).
 */
data class TcgPalette(
    val border: Int,
    val glow: Int,
    val text: Int,
    val panel: Int,
    val medalFix: Float,
    val fx: Int,
    /** Text color drawn on top of this rarity's rarity-label chip. */
    val chipTextColor: Int
)

/**
 * TCG-style foil title-text treatment for EPIC and up (director: "포켓몬카드나
 * 유희왕카드 참고해서"). [colors] are gradient stops sampled along the text's
 * own bounding box -- top-to-bottom when [vertical], left-to-right otherwise.
 *
 * [vertical] matters for legibility, not just style: a HORIZONTAL gradient
 * shades different letters differently depending on where they fall in the
 * word, so on a light panel (EPIC/LEGENDARY) some letters can land on the
 * gradient's lightest stop and nearly vanish. A VERTICAL gradient shades
 * every letter identically regardless of horizontal position, keeping
 * contrast uniform across the whole title. HIDDEN is the one exception --
 * its panel is dark navy, so a horizontal rainbow sweep is safe (every
 * stop is bright/saturated enough to clear a dark background regardless of
 * which letter it lands on).
 */
data class FoilTitleStyle(
    val colors: IntArray,
    val outline: Int,
    val glow: Int,
    val vertical: Boolean
)

object CardStyle {
    fun tcgPalette(rarity: Rarity): TcgPalette = when (rarity) {
        Rarity.NORMAL -> TcgPalette(
            border = Color.rgb(178, 174, 166), glow = Color.rgb(200, 196, 188),
            text = Color.rgb(54, 49, 45), panel = Color.rgb(255, 255, 255),
            medalFix = 1.0f, fx = 0, chipTextColor = Color.rgb(55, 50, 46)
        )
        Rarity.RARE -> TcgPalette(
            border = Color.rgb(96, 160, 214), glow = Color.rgb(150, 205, 240),
            text = Color.rgb(30, 50, 78), panel = Color.rgb(225, 240, 255),
            medalFix = 1.0f, fx = 0, chipTextColor = Color.rgb(20, 40, 65)
        )
        Rarity.EPIC -> TcgPalette(
            border = Color.rgb(150, 105, 200), glow = Color.rgb(195, 150, 235),
            text = Color.rgb(55, 35, 78), panel = Color.rgb(236, 224, 250),
            medalFix = 1.12f, fx = 1, chipTextColor = Color.rgb(255, 255, 255)
        )
        Rarity.LEGENDARY -> TcgPalette(
            border = Color.rgb(205, 160, 60), glow = Color.rgb(240, 205, 110),
            text = Color.rgb(70, 50, 12), panel = Color.rgb(252, 240, 210),
            medalFix = 1.22f, fx = 2, chipTextColor = Color.rgb(30, 20, 10)
        )
        Rarity.HIDDEN -> TcgPalette(
            border = Color.rgb(70, 175, 195), glow = Color.rgb(110, 220, 235),
            text = Color.rgb(220, 245, 250), panel = Color.rgb(10, 30, 48),
            medalFix = 1.0f, fx = 0, chipTextColor = Color.rgb(6, 28, 34)
        )
    }

    /** Null for NORMAL/RARE -- those keep the plain flat [TcgPalette.text] ink color. */
    fun foilTitle(rarity: Rarity): FoilTitleStyle? = when (rarity) {
        Rarity.EPIC -> FoilTitleStyle(
            colors = intArrayOf(Color.rgb(150, 95, 200), Color.rgb(75, 30, 120)),
            outline = Color.rgb(35, 12, 55), glow = Color.rgb(190, 140, 235), vertical = true
        )
        Rarity.LEGENDARY -> FoilTitleStyle(
            colors = intArrayOf(Color.rgb(190, 140, 45), Color.rgb(110, 72, 12)),
            outline = Color.rgb(48, 30, 5), glow = Color.rgb(250, 210, 110), vertical = true
        )
        Rarity.HIDDEN -> FoilTitleStyle(
            // director: "히든은 아예 무지개색으로" -- full rainbow sweep, safe
            // here specifically because HIDDEN's panel is dark (see class doc).
            colors = intArrayOf(
                Color.rgb(255, 90, 90), Color.rgb(255, 185, 60), Color.rgb(240, 230, 70),
                Color.rgb(90, 220, 120), Color.rgb(80, 200, 235), Color.rgb(120, 130, 245),
                Color.rgb(210, 110, 235)
            ),
            outline = Color.rgb(3, 14, 20), glow = Color.rgb(210, 210, 250), vertical = false
        )
        else -> null
    }

    /**
     * [opalHidden] picks between the two official HIDDEN visual families
     * (docs/UI_UX_SPEC.md §3): false = ANOMALY (deep navy/cyan), true =
     * DREAM/opal (pale). Only used to pick the OUTER canvas backdrop asset
     * (`backgrounds/share/...`) -- the TCG card face itself (frame_bg,
     * palette, medallion) is one shared design per rarity tier regardless
     * of HIDDEN's two incident sub-types (director confirmed one HIDDEN
     * frame is enough: "히든 프레임은 지금처럼 1장이면 충분").
     */
    fun isOpalHidden(type: IncidentType) = type == IncidentType.HIDDEN_NIGHT_ACTIVITY
}
