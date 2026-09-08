package com.howling.openedagain.ui

import android.graphics.Color
import com.howling.openedagain.core.Rarity

data class CardPalette(
    val background: Int,
    val border: Int,
    val accent: Int,
    val title: Int = Color.rgb(54, 49, 45),
    val body: Int = Color.rgb(78, 72, 67)
)

object CardStyle {
    fun palette(rarity: Rarity): CardPalette = when (rarity) {
        Rarity.NORMAL -> CardPalette(Color.rgb(251, 250, 247), Color.rgb(201, 203, 207), Color.rgb(130, 136, 145))
        Rarity.RARE -> CardPalette(Color.rgb(239, 247, 255), Color.rgb(96, 171, 225), Color.rgb(42, 133, 205))
        Rarity.EPIC -> CardPalette(Color.rgb(249, 241, 255), Color.rgb(174, 112, 223), Color.rgb(133, 67, 194))
        Rarity.LEGENDARY -> CardPalette(Color.rgb(255, 249, 224), Color.rgb(224, 174, 53), Color.rgb(190, 133, 21))
        Rarity.HIDDEN -> CardPalette(Color.rgb(229, 241, 245), Color.rgb(26, 110, 126), Color.rgb(10, 80, 98))
    }
}
