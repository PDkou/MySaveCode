package com.howling.openedagain.ui

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
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
 * drawing everything as flat shapes/text. Layout mirrors index.html's
 * `.card` (art + tint overlay, badge instead of a text rarity label, MONI
 * posed per incident type in a right-hand "scene") so a shared image looks
 * like the same card the player saw in-app, not a different design.
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

        // Full-bleed backdrop from the asset pack; a flat tone is the
        // fallback if the asset can't be decoded for some reason.
        val backdropAsset = if (format == Format.STORY) "backgrounds/share_template_vertical.png" else "backgrounds/share_template_square.png"
        val backdrop = assetBitmap(backdropAsset)
        if (backdrop != null) {
            drawCover(c, backdrop, RectF(0f, 0f, format.width.toFloat(), format.height.toFloat()), paint)
        } else {
            c.drawColor(Color.rgb(247, 241, 231))
        }

        val margin = 78f
        val top = if (format == Format.STORY) 330f else 110f
        val bottom = if (format == Format.STORY) format.height - 330f else format.height - 110f
        val rect = RectF(margin, top, format.width - margin, bottom)

        // Card body: the rarity's illustrated template art, tinted for text
        // legibility -- same "art + tint" recipe as index.html's
        // `.card.<rarity>` background.
        val template = assetBitmap(templateAsset(incident.rarity, opal))
        paint.style = Paint.Style.FILL
        if (template != null) {
            c.save()
            c.clipPath(roundedRectPath(rect, 46f))
            drawCover(c, template, rect, paint)
            c.restore()
        } else {
            paint.color = p.background
            c.drawRoundRect(rect, 46f, 46f, paint)
        }
        paint.color = p.overlay
        c.drawRoundRect(rect, 46f, 46f, paint)
        paint.style = Paint.Style.STROKE; paint.strokeWidth = 9f; paint.color = p.border
        c.drawRoundRect(rect, 46f, 46f, paint)
        paint.style = Paint.Style.FILL

        // Text sits in the left column; MONI's scene occupies the right
        // column -- same split as index.html's `.card-body` grid.
        val badgeH = 46f
        val contentTop = top + 40f + badgeH + 24f
        val footerTop = bottom - 130f
        val leftColRight = rect.left + rect.width() * 0.56f
        val sceneLeft = leftColRight + 28f

        // Rarity badge image, replacing the plain rarity-name text label.
        assetBitmap(badgeAsset(incident.rarity, opal))?.let { badge ->
            drawLeftAligned(c, badge, margin + 56f, top + 40f, badgeH, paint)
        }

        paint.color = p.title; paint.textSize = 70f; paint.isFakeBoldText = true
        c.drawText(title, margin + 56f, contentTop + 58f, paint)
        paint.color = p.body; paint.textSize = 38f; paint.isFakeBoldText = false
        drawWrapped(c, detail, margin + 56f, contentTop + 140f, leftColRight - (margin + 56f) - 16f, 52f, paint)

        // MONI, posed to match the incident (mirrors index.html's
        // incidentVisual() map), bottom-anchored and centered in its box --
        // same as the web card's `.scene{align-items:flex-end}`.
        assetBitmap(characterAsset(incident.type))?.let { moni ->
            val sceneBox = RectF(sceneLeft, contentTop, rect.right - 32f, footerTop)
            drawContain(c, moni, sceneBox, paint)
        }

        paint.isFakeBoldText = true; paint.textSize = 50f; paint.color = p.title
        drawWrapped(c, "“$punchline”", margin + 56f, bottom - 185f, leftColRight - (margin + 56f) - 16f, 64f, paint)

        // Wordmark logo instead of a plain app-name text label, matching the
        // language actually selected in-app (not the device locale) -- text
        // fallback if the logo asset can't be decoded.
        val logo = assetBitmap(if (lang == "ja") "logo/logo_jp.png" else "logo/logo_ko.png")
        if (logo != null) {
            drawLeftAligned(c, logo, margin + 56f, bottom - 100f, 32f, paint)
        } else {
            paint.isFakeBoldText = false; paint.textSize = 34f; paint.color = p.accent
            c.drawText(context.getString(com.howling.openedagain.R.string.app_name), margin + 56f, bottom - 72f, paint)
        }
        paint.isFakeBoldText = false; paint.textSize = 34f; paint.color = p.accent
        paint.textAlign = Paint.Align.RIGHT
        c.drawText("MONI CASE FILE", format.width - margin - 56f, bottom - 72f, paint)
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

    // -- asset lookup ---------------------------------------------------

    private fun assetBitmap(path: String): Bitmap? = runCatching {
        context.assets.open("visual/$path").use { BitmapFactory.decodeStream(it) }
    }.getOrNull()

    private fun templateAsset(rarity: Rarity, opal: Boolean): String = when (rarity) {
        Rarity.NORMAL -> "cards/templates/template_normal.png"
        Rarity.RARE -> "cards/templates/template_rare.png"
        Rarity.EPIC -> "cards/templates/template_epic.png"
        Rarity.LEGENDARY -> "cards/templates/template_legendary.png"
        Rarity.HIDDEN -> if (opal) "cards/templates/template_hidden_02.png" else "cards/templates/template_hidden_01.png"
    }

    private fun badgeAsset(rarity: Rarity, opal: Boolean): String = when (rarity) {
        Rarity.NORMAL -> "badges/badge_normal.png"
        Rarity.RARE -> "badges/badge_rare.png"
        Rarity.EPIC -> "badges/badge_epic.png"
        Rarity.LEGENDARY -> "badges/badge_legendary.png"
        Rarity.HIDDEN -> if (opal) "badges/badge_hidden_02.png" else "badges/badge_hidden_01.png"
    }

    // Same incident -> pose mapping as index.html's incidentVisual(), minus
    // the background half (the share card gets its background from the
    // rarity template art instead, same as archive/records elsewhere).
    private fun characterAsset(type: IncidentType): String = when (type) {
        IncidentType.QUICK_EXIT, IncidentType.RETURN_TO_START -> "character/basic/moni_sit_phone.png"
        IncidentType.REENTRY, IncidentType.REGULAR, IncidentType.FIRST_CONTACT, IncidentType.HUNDRED_VISITS -> "character/basic/moni_phone.png"
        IncidentType.PATROL, IncidentType.APP_WANDERING, IncidentType.DIGITAL_LOST -> "character/basic/moni_magnifier.png"
        IncidentType.ESCAPE_FAILED -> "character/additional/moni_under_blanket_phone.png"
        IncidentType.NIGHT_PATROL, IncidentType.DAWN_SURVIVOR, IncidentType.HIDDEN_NIGHT_ACTIVITY -> "character/basic/moni_sleep.png"
        IncidentType.HIDDEN_LOOP -> "character/expressions/exp_suspicious.png"
    }

    // -- drawing helpers --------------------------------------------------

    private fun roundedRectPath(rect: RectF, radius: Float) = Path().apply {
        addRoundRect(rect, radius, radius, Path.Direction.CW)
    }

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

    /** Scales [bmp] to fit fully inside [box] (may letterbox), bottom-anchored and centered. */
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

    private fun drawWrapped(canvas: Canvas, text: String, x: Float, y: Float, maxWidth: Float, lineHeight: Float, paint: Paint) {
        var line = ""
        var cy = y
        text.split(Regex("\\s+")).forEach { word ->
            val test = if (line.isBlank()) word else "$line $word"
            if (paint.measureText(test) > maxWidth && line.isNotBlank()) {
                canvas.drawText(line, x, cy, paint); cy += lineHeight; line = word
            } else line = test
        }
        if (line.isNotBlank()) canvas.drawText(line, x, cy, paint)
    }
}
