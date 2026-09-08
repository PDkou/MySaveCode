package com.howling.openedagain.ui

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.net.Uri
import android.provider.MediaStore
import com.howling.openedagain.core.DetectedIncident
import com.howling.openedagain.core.IncidentType
import com.howling.openedagain.core.Rarity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Renders a shareable incident card as a bitmap, using the same final asset
 * pack the WebView UI does (`app/src/main/assets/visual/`) rather than
 * drawing everything as flat shapes/text.
 *
 * IMPORTANT asset choice: the card body uses `cards/frames/frame_*.png` --
 * the actual blank, reusable card frames (per PROJECT_HANDOFF.md: "Use
 * assets/cards/frames + assets/badges to render incident rarities"). It
 * does NOT use the cards/templates or cards/examples folders: those hold
 * finished mockups/reference art with placeholder or incident-specific
 * text already baked into the pixels, meant for art reference, not for
 * layering live text on top of at runtime (an earlier version of this
 * file used templates/ by mistake, which both showed stale baked-in text
 * and, because its aspect ratio didn't match the drawing area, got
 * cropped).
 *
 * The frame art has a fixed aspect ratio (~0.8, width:height) that's
 * consistent across rarities, so the card rect below is sized to match it
 * exactly -- the frame is drawn with zero cropping, never "cover"-cropped
 * into a mismatched box.
 */
class ShareCardRenderer(private val context: Context) {
    enum class Format(val width: Int, val height: Int) { SQUARE(1080, 1080), STORY(1080, 1920) }

    fun render(
        incident: DetectedIncident,
        title: String,
        punchline: String,
        detail: String,
        format: Format,
        lang: String = "ko"
    ): Bitmap {
        val opal = CardStyle.isOpalHidden(incident.type)
        val p = CardStyle.palette(incident.rarity, opal)
        val bitmap = Bitmap.createBitmap(format.width, format.height, Bitmap.Config.ARGB_8888)
        val c = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // Full-bleed backdrop. NOTE: backgrounds/share_template_square.png
        // and share_template_vertical.png look like plain backdrops but are
        // actually complete, finished card designs in their own right --
        // they already have their own decorative frame AND a MONI
        // illustration baked into a bottom corner. Using either of those as
        // a "backdrop" behind our own separately-drawn rarity frame doubled
        // up both the frame and the character in the exported image. Use
        // the tileable paw-print pattern instead, which has no baked-in
        // frame/character to collide with.
        //
        // bg_pattern_beige.png is a small (445x535) SEAMLESS TILE, not a
        // single full-canvas image -- drawCover() was stretching that one
        // copy ~2.4x to cover the 1080px canvas, blowing up every paw
        // print/hat icon in it and making the card look small and the
        // backdrop blurry/oversized by comparison (a real on-device export
        // showed exactly that). Tile it at native resolution via a
        // BitmapShader instead, same as a CSS `background-repeat`.
        val backdrop = assetBitmap("backgrounds/bg_pattern_beige.png")
        if (backdrop != null) {
            paint.shader = BitmapShader(backdrop, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT)
            c.drawRect(0f, 0f, format.width.toFloat(), format.height.toFloat(), paint)
            paint.shader = null
        } else {
            c.drawColor(Color.rgb(247, 241, 231))
        }

        val margin = 78f
        val outerTop = if (format == Format.STORY) 330f else 110f
        val outerBottom = if (format == Format.STORY) format.height - 330f else format.height - 110f
        val rect = frameAlignedRect(margin, outerTop, format.width - margin, outerBottom)

        // Solid backing first (in case the frame art has transparent gaps),
        // then the frame art itself at its native aspect -- no tint overlay
        // on top of it, since the frame's own interior (light for every
        // rarity except the dark ANOMALY hidden variant) already gives the
        // right contrast for the palette's text colors.
        paint.style = Paint.Style.FILL
        paint.color = p.background
        c.drawRoundRect(rect, 46f, 46f, paint)
        assetBitmap(frameAsset(incident.rarity, opal))?.let { frame ->
            drawCover(c, frame, rect, paint)
        }

        // Text sits in the left column; MONI's scene occupies the right
        // column -- same split as index.html's `.card-body` grid.
        // NOTE: no separate badge image here (unlike index.html's cards) --
        // frame_*.png already has its own decorative corner ornaments (a
        // detective hat, a paw medallion, a magnifier) baked into the same
        // top area a badge pill would sit in, and the two visibly collided.
        // The frame's distinct color per rarity already communicates which
        // tier this is.
        //
        // contentTop's fraction was 0.12 until a real-device share-card
        // screenshot showed the title/detail text spilling out past the
        // card's visible border, directly under the hat/paw-medallion
        // ornaments. Measuring the frame PNGs directly (pixel-color scan
        // for where the hat/medallion decorations bottom out) put that at
        // ~15-17% of the card's height across every rarity (same template,
        // recolored) -- 0.12 sat text right on top of them. 0.22 clears
        // both with a real margin.
        val pad = 56f
        val contentTop = rect.top + rect.height() * 0.22f
        val footerTop = rect.bottom - 120f
        val leftColRight = rect.left + rect.width() * 0.56f
        val leftTextWidth = leftColRight - (rect.left + pad) - 16f
        val sceneLeft = leftColRight + 24f

        // Title wraps (up to the available left-column width) instead of a
        // single unwrapped line -- a long incident name no longer clips or
        // runs into MONI's scene on the right.
        paint.color = p.title; paint.textSize = 58f; paint.isFakeBoldText = true
        val titleEndY = drawWrapped(c, title, rect.left + pad, contentTop + 52f, leftTextWidth, 66f, paint)
        paint.color = p.body; paint.textSize = 36f; paint.isFakeBoldText = false
        drawWrapped(c, detail, rect.left + pad, titleEndY + 54f, leftTextWidth, 48f, paint)

        // MONI, posed to match the incident (mirrors index.html's
        // incidentVisual() map), bottom-anchored and centered in its box --
        // same as the web card's `.scene{align-items:flex-end}`.
        assetBitmap(characterAsset(incident.type))?.let { moni ->
            val sceneBox = RectF(sceneLeft, contentTop, rect.right - 28f, footerTop)
            drawContain(c, moni, sceneBox, paint)
        }

        paint.isFakeBoldText = true; paint.textSize = 44f; paint.color = p.title
        // `rect.width() - pad - 32f` let a wrapped line run out to ~95% of
        // the card width, but the frame art's visible border on the right
        // side starts at ~87% (pixel-measured on frame_normal.png) -- a
        // full-width punchline line was rendering its closing quote mark
        // past the border, onto the beige backdrop (seen on a real
        // exported card). rightSafeInset backs the wrap width off to end
        // inside the border with a real margin.
        val rightSafeInset = rect.width() * 0.16f
        drawWrapped(c, "“$punchline”", rect.left + pad, rect.bottom - 165f, rect.width() - pad - rightSafeInset, 56f, paint)

        // Wordmark logo instead of a plain app-name text label, matching the
        // language actually selected in-app (not the device locale) -- text
        // fallback if the logo asset can't be decoded.
        val logo = assetBitmap(if (lang == "ja") "logo/logo_jp.png" else "logo/logo_ko.png")
        if (logo != null) {
            drawLeftAligned(c, logo, rect.left + pad, rect.bottom - 84f, 28f, paint)
        } else {
            paint.isFakeBoldText = false; paint.textSize = 30f; paint.color = p.accent
            c.drawText(context.getString(com.howling.openedagain.R.string.app_name), rect.left + pad, rect.bottom - 60f, paint)
        }
        paint.isFakeBoldText = false; paint.textSize = 30f; paint.color = p.accent
        paint.textAlign = Paint.Align.RIGHT
        // Anchored at leftColRight, not rect.right - pad: the frame's own
        // magnifier ornament (bottom-right corner, measured at roughly the
        // outer 24% x 28% of the card) sat exactly where a corner-pinned
        // label would go and covered it. leftColRight keeps this label
        // clear of that ornament across every rarity (same frame template).
        c.drawText("MONI CASE FILE", leftColRight, rect.bottom - 60f, paint)
        paint.textAlign = Paint.Align.LEFT
        return bitmap
    }

    fun saveAndShare(bitmap: Bitmap, chooserTitle: String) {
        val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "opened_again_$stamp.png")
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            if (android.os.Build.VERSION.SDK_INT >= 29) put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/OpenedAgain")
        }
        val uri: Uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return
        context.contentResolver.openOutputStream(uri)?.use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, chooserTitle))
    }

    // -- layout -----------------------------------------------------------

    // frame_*.png is ~348x436 across every rarity (width:height ~= 0.8).
    // Fit the largest rect of that aspect ratio inside the given bounds,
    // centered, so the frame draws with zero cropping regardless of format.
    private fun frameAlignedRect(left: Float, top: Float, right: Float, bottom: Float): RectF {
        val frameAspect = 0.8f
        val availW = right - left
        val availH = bottom - top
        var w = availW
        var h = w / frameAspect
        if (h > availH) {
            h = availH
            w = h * frameAspect
        }
        val cardLeft = left + (availW - w) / 2f
        val cardTop = top + (availH - h) / 2f
        return RectF(cardLeft, cardTop, cardLeft + w, cardTop + h)
    }

    // -- asset lookup ---------------------------------------------------

    private fun assetBitmap(path: String): Bitmap? = runCatching {
        context.assets.open("visual/$path").use { BitmapFactory.decodeStream(it) }
    }.getOrNull()

    private fun frameAsset(rarity: Rarity, opal: Boolean): String = when (rarity) {
        Rarity.NORMAL -> "cards/frames/frame_normal.png"
        Rarity.RARE -> "cards/frames/frame_rare.png"
        Rarity.EPIC -> "cards/frames/frame_epic.png"
        Rarity.LEGENDARY -> "cards/frames/frame_legendary.png"
        Rarity.HIDDEN -> if (opal) "cards/frames/frame_hidden_02.png" else "cards/frames/frame_hidden_01.png"
    }

    // Same incident -> pose mapping as index.html's incidentVisual(), minus
    // the background half (the share card gets its background from the
    // rarity frame art instead).
    //
    // v0.14 asset pack: character/additional/ merged into character/basic/;
    // character/expressions/* was fully replaced with a new "_phone" set
    // (old exp_suspicious.png is gone); moni_sit_phone.png/moni_sleep.png
    // were dropped for good (source-sheet contamination found during the
    // design pipeline's re-crop pass, see docs/DEVELOPMENT_HISTORY.md v0.14).
    private fun characterAsset(type: IncidentType): String = when (type) {
        IncidentType.QUICK_EXIT -> "character/expressions/exp_side_eye_phone.png"
        IncidentType.RETURN_TO_START -> "character/expressions/exp_thinking_phone.png"
        IncidentType.REENTRY, IncidentType.REGULAR, IncidentType.FIRST_CONTACT, IncidentType.HUNDRED_VISITS -> "character/basic/moni_phone.png"
        IncidentType.PATROL, IncidentType.APP_WANDERING, IncidentType.DIGITAL_LOST -> "character/basic/moni_magnifier.png"
        IncidentType.ESCAPE_FAILED -> "character/basic/moni_under_blanket_phone.png"
        IncidentType.NIGHT_PATROL, IncidentType.DAWN_SURVIVOR, IncidentType.HIDDEN_NIGHT_ACTIVITY -> "character/expressions/exp_sleepy_phone.png"
        IncidentType.HIDDEN_LOOP -> "character/expressions/exp_side_eye_phone.png"
    }

    // -- drawing helpers --------------------------------------------------

    /** Scales [bmp] to fully cover [dest] (may crop), centered. */
    private fun drawCover(canvas: Canvas, bmp: Bitmap, dest: RectF, paint: Paint) {
        val scale = maxOf(dest.width() / bmp.width, dest.height() / bmp.height)
        val dx = dest.left + (dest.width() - bmp.width * scale) / 2f
        val dy = dest.top + (dest.height() - bmp.height * scale) / 2f
        val matrix = Matrix().apply { setScale(scale, scale); postTranslate(dx, dy) }
        canvas.save()
        canvas.clipRect(dest)
        canvas.drawBitmap(bmp, matrix, paint)
        canvas.restore()
    }

    /** Scales [bmp] to fit fully inside [box] (may letterbox, never crops), bottom-anchored and centered. */
    private fun drawContain(canvas: Canvas, bmp: Bitmap, box: RectF, paint: Paint) {
        val scale = minOf(box.width() / bmp.width, box.height() / bmp.height)
        val w = bmp.width * scale
        val h = bmp.height * scale
        val left = box.left + (box.width() - w) / 2f
        val top = box.bottom - h
        canvas.drawBitmap(bmp, null, RectF(left, top, left + w, top + h), paint)
    }

    /** Draws [bmp] at a fixed height, left-aligned at ([x], [y]), preserving aspect ratio. */
    private fun drawLeftAligned(canvas: Canvas, bmp: Bitmap, x: Float, y: Float, height: Float, paint: Paint) {
        val scale = height / bmp.height
        val w = bmp.width * scale
        canvas.drawBitmap(bmp, null, RectF(x, y, x + w, y + height), paint)
    }

    /** Word-wraps [text] within [maxWidth]; returns the last line's baseline Y so callers can chain the next block after it. */
    private fun drawWrapped(canvas: Canvas, text: String, x: Float, y: Float, maxWidth: Float, lineHeight: Float, paint: Paint): Float {
        var line = ""
        var cy = y
        text.split(Regex("\\s+")).forEach { word ->
            val test = if (line.isBlank()) word else "$line $word"
            if (paint.measureText(test) > maxWidth && line.isNotBlank()) {
                canvas.drawText(line, x, cy, paint); cy += lineHeight; line = word
            } else line = test
        }
        if (line.isNotBlank()) canvas.drawText(line, x, cy, paint)
        return cy
    }
}
