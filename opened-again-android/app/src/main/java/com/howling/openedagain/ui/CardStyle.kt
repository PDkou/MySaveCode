package com.howling.openedagain.ui

import android.graphics.Color
import com.howling.openedagain.core.IncidentType
import com.howling.openedagain.core.Rarity

data class CardPalette(
    /** Flat fallback fill used only if the rarity's template art fails to decode. */
    val background: Int,
    /** Semi-transparent tint drawn over the template art for text legibility --
     *  same "art + tint" recipe as index.html's `.card.<rarity>` CSS. */
    val overlay: Int,
    val border: Int,
    val accent: Int,
    val title: Int,
    val body: Int
)

object CardStyle {
    /**
     * [opalHidden] picks between the two official HIDDEN visual families
     * (docs/UI_UX_SPEC.md §3): false = ANOMALY (deep navy/cyan, light text),
     * true = DREAM/opal (pale, dark text). Meaningless for non-HIDDEN rarities.
     */
    fun palette(rarity: Rarity, opalHidden: Boolean = false): CardPalette = when (rarity) {
        Rarity.NORMAL -> CardPalette(
            background = Color.rgb(251, 250, 247),
            overlay = Color.argb(235, 255, 255, 255),
            border = Color.rgb(201, 203, 207),
            accent = Color.rgb(130, 136, 145),
            title = Color.rgb(54, 49, 45),
            body = Color.rgb(78, 72, 67)
        )
        Rarity.RARE -> CardPalette(
            background = Color.rgb(239, 247, 255),
            overlay = Color.argb(230, 255, 255, 255),
            border = Color.rgb(96, 171, 225),
            accent = Color.rgb(42, 133, 205),
            title = Color.rgb(54, 49, 45),
            body = Color.rgb(78, 72, 67)
        )
        Rarity.EPIC -> CardPalette(
            background = Color.rgb(249, 241, 255),
            overlay = Color.argb(224, 255, 255, 255),
            border = Color.rgb(174, 112, 223),
            accent = Color.rgb(133, 67, 194),
            title = Color.rgb(54, 49, 45),
            body = Color.rgb(78, 72, 67)
        )
        Rarity.LEGENDARY -> CardPalette(
            background = Color.rgb(255, 249, 224),
            overlay = Color.argb(224, 255, 252, 238),
            border = Color.rgb(224, 174, 53),
            accent = Color.rgb(190, 133, 21),
            title = Color.rgb(54, 49, 45),
            body = Color.rgb(78, 72, 67)
        )
        Rarity.HIDDEN -> if (opalHidden) CardPalette(
            background = Color.rgb(251, 248, 255),
            overlay = Color.argb(194, 251, 248, 255),
            border = Color.rgb(221, 232, 255),
            accent = Color.rgb(150, 110, 180),
            title = Color.rgb(52, 45, 70),
            body = Color.rgb(103, 94, 126)
        ) else CardPalette(
            background = Color.rgb(3, 25, 35),
            overlay = Color.argb(194, 3, 25, 35),
            border = Color.rgb(10, 182, 212),
            accent = Color.rgb(10, 182, 212),
            title = Color.rgb(233, 251, 255),
            body = Color.rgb(185, 223, 232)
        )
    }

    /** HIDDEN_NIGHT_ACTIVITY is the DREAM/opal family; every other HIDDEN incident
     *  (currently only HIDDEN_LOOP) is the ANOMALY family. */
    fun isOpalHidden(type: IncidentType) = type == IncidentType.HIDDEN_NIGHT_ACTIVITY
}
