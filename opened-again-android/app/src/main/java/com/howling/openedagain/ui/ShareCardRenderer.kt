package com.howling.openedagain.ui

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.net.Uri
import android.provider.MediaStore
import com.howling.openedagain.core.DetectedIncident
import com.howling.openedagain.core.IncidentType
import com.howling.openedagain.core.Rarity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * Renders a shareable incident card as a TCG-style ("Pokemon/Yu-Gi-Oh
 * card") trading-card bitmap.
 *
 * This is a straight Kotlin port of the confirmed Python/PIL mockup
 * (`sim_tcg_v16.py`, iterated to final with the director over many rounds
 * and confirmed with "좋아 일단 이걸로 확정지어보자") -- see
 * `docs/CARD_LAYOUT_SPEC.md` for the coordinate spec and `CardStyle.kt`
 * for the per-rarity color/foil-title spec. Both files are the actual
 * single source of truth; this class only turns them into Canvas calls.
 *
 * ARCHITECTURE: earlier attempts asked GPT to bake the whole card
 * (header/art/info panel geometry included) into one image per rarity,
 * which cannot reproduce identical internal layout across 5 separate
 * generations ("카드마다 사이즈가 다 틀리다"). The fix the director landed
 * on: `cards/frame_bg/<rarity>.webp` is now ONLY an atmospheric
 * background + border -- no baked panels -- and every piece of actual
 * content (art window, header/info panels, chip, title, emblem, case tag,
 * logo) is drawn by this class at fixed coordinates from [CardLayout],
 * identical across all 5 rarities, then uniformly scaled to fit whatever
 * output [Format] is requested. Only the color inputs
 * (`CardStyle.tcgPalette`/`foilTitle`) and the frame/medallion image
 * assets vary by rarity.
 */
class ShareCardRenderer(private val context: Context) {
    enum class Format(val width: Int, val height: Int) { SQUARE(1080, 1080), STORY(1080, 1920) }

    /**
     * The card's own fixed geometry, 1:1 with `GEOMETRY` in sim_tcg_v16.py
     * and the coordinate table in docs/CARD_LAYOUT_SPEC.md. Native canvas
     * is 1024x1536 -- every rarity uses these exact numbers; only the
     * uniform `scale` factor computed in [drawTcgCard] changes per [Format].
     */
    private object CardLayout {
        const val W = 1024f
        const val H = 1536f
        val HEADER = RectF(97f, 200f, 925f, 309f)
        val ART = RectF(103f, 315f, 919f, 935f)
        val INFO = RectF(97f, 1116f, 925f, 1385f)
        const val EMBLEM_CX = 508f
        const val EMBLEM_CY = 125f
        const val EMBLEM_D = 162f
    }

    fun render(
        incident: DetectedIncident,
        title: String,
        punchline: String,
        detail: String,
        format: Format,
        lang: String = "ko"
    ): Bitmap {
        val rarity = incident.rarity
        val opal = CardStyle.isOpalHidden(incident.type)
        val bitmap = Bitmap.createBitmap(format.width, format.height, Bitmap.Config.ARGB_8888)
        val c = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // Full-bleed outer backdrop, independent of the card face itself --
        // unchanged from the pre-redesign renderer (docs/ASSET_REQUESTS_FOR_DESIGN.md #4).
        val backdrop = assetBitmap(backgroundAsset(rarity, opal, format))
            ?: assetBitmap(commonBackgroundAsset(format))
        if (backdrop != null) {
            drawCover(c, backdrop, RectF(0f, 0f, format.width.toFloat(), format.height.toFloat()), paint)
        } else {
            c.drawColor(Color.rgb(250, 245, 232))
        }

        // The TCG card itself renders edge-to-edge within `rect` (matching
        // the confirmed mockup 1:1 aside from uniform scale) -- STORY
        // reserves 330px top/bottom outside `rect` for Instagram's own
        // overlaid UI (progress bar, username, reply box); SQUARE just
        // needs a small margin so the card isn't flush with the canvas edge.
        val margin = if (format == Format.STORY) 78f else 50f
        val outerTop = if (format == Format.STORY) 330f else 50f
        val outerBottom = if (format == Format.STORY) format.height - 330f else format.height - 50f
        val rect = cardAlignedRect(margin, outerTop, format.width - margin, outerBottom)

        drawTcgCard(c, paint, rect, incident, title, detail, punchline)
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

    // -- the card itself ---------------------------------------------------

    /**
     * Draws the whole TCG card into [rect], scaled uniformly from the
     * [CardLayout] geometry (native 1024x1536) -- one `scale` factor for
     * every element, never a per-element recomputation (CARD_LAYOUT_SPEC.md
     * principle #3). Layer order matches sim_tcg_v16.py's render() exactly:
     * frame bg -> art -> emblem glow (fx) -> header panel -> rarity chip ->
     * title -> info panel -> stat/quote/diamond -> case tag + logo -> emblem
     * medallion + symbol (or HIDDEN's bespoke glyph treatment).
     */
    private fun drawTcgCard(
        c: Canvas,
        paint: Paint,
        rect: RectF,
        incident: DetectedIncident,
        title: String,
        stat: String,
        quote: String
    ) {
        val rarity = incident.rarity
        val pal = CardStyle.tcgPalette(rarity)
        val scale = rect.width() / CardLayout.W
        fun sx(v: Float) = rect.left + v * scale
        fun sy(v: Float) = rect.top + v * scale
        fun s(v: Float) = v * scale

        val header = RectF(sx(CardLayout.HEADER.left), sy(CardLayout.HEADER.top), sx(CardLayout.HEADER.right), sy(CardLayout.HEADER.bottom))
        val art = RectF(sx(CardLayout.ART.left), sy(CardLayout.ART.top), sx(CardLayout.ART.right), sy(CardLayout.ART.bottom))
        val info = RectF(sx(CardLayout.INFO.left), sy(CardLayout.INFO.top), sx(CardLayout.INFO.right), sy(CardLayout.INFO.bottom))
        val ecx = sx(CardLayout.EMBLEM_CX)
        val ecy = sy(CardLayout.EMBLEM_CY)
        val ed = s(CardLayout.EMBLEM_D)

        val titleTypeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
        val sansBoldTypeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        val statTypeface = Typeface.create(Typeface.SERIF, Typeface.NORMAL)

        // 1. Frame background -- pure atmospheric art + border, native
        // aspect already matches `rect`'s (both 1024:1536), so a plain
        // scale-to-fit never crops it.
        assetBitmap(frameBgAsset(rarity))?.let { c.drawBitmap(it, null, rect, paint) }

        // 2. Art window -- cover-fit incident illustration, rounded, with
        // a glow-colored outline stroke.
        val artRadius = s(30f)
        assetBitmap(incidentIllustrationAsset(incident.type, rarity))?.let { illo ->
            val artPath = Path().apply { addRoundRect(art, artRadius, artRadius, Path.Direction.CW) }
            c.save()
            c.clipPath(artPath)
            drawCover(c, illo, art, paint)
            c.restore()
        }
        paint.reset(); paint.isAntiAlias = true
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = s(3f)
        paint.color = pal.glow
        c.drawRoundRect(art, artRadius, artRadius, paint)

        // 3. Emblem glow -- drawn BEFORE the header panel: its blur radius
        // reaches down past the emblem into the header's own y-range, and a
        // radial glow drawn AFTER an opaque-ish panel it overlaps paints a
        // visible haze on top of it (found in the mockup, fixed by draw order).
        if (pal.fx >= 1) radialGlow(c, ecx, ecy, ed * 0.85f, pal.glow, s(22f), 140)
        if (pal.fx >= 2) radialGlow(c, ecx, ecy, ed * 1.3f, pal.glow, s(40f), 90)

        // 4. Header panel -- translucent, identical box every rarity.
        val headerAlpha = if (rarity == Rarity.HIDDEN) 210 else 235
        translucentPanel(c, header, s(22f), pal.panel, headerAlpha, pal.glow, s(2f))

        // 5. Rarity label chip. All 5 rarities get a filled pill in the
        // rarity's own color (director: "노멀도 레어도 [칩] 해줘"); HIDDEN
        // gets a fancier gradient-filled version with flanking sparkles
        // ("가장 얻기 힘든거니까 좀 더 화려하게").
        val rarityTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = sansBoldTypeface
            textSize = s(22f)
        }
        val labelText = rarity.name
        val lw = rarityTextPaint.measureText(labelText)
        val chip = RectF(sx(CardLayout.HEADER.left + 26f), sy(CardLayout.HEADER.top + 15f), sx(CardLayout.HEADER.left + 26f) + lw + s(20f), sy(CardLayout.HEADER.top + 15f) + s(26f))
        val chipRadius = s(13f)
        if (rarity == Rarity.HIDDEN) {
            val gradientColors = intArrayOf(Color.rgb(70, 190, 210), Color.rgb(225, 252, 255), Color.rgb(90, 210, 225))
            val chipPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                shader = LinearGradient(chip.left, 0f, chip.right, 0f, gradientColors, null, Shader.TileMode.CLAMP)
            }
            c.drawRoundRect(chip, chipRadius, chipRadius, chipPaint)
            paint.reset(); paint.isAntiAlias = true
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = s(2f)
            paint.color = Color.rgb(235, 255, 255)
            c.drawRoundRect(chip, chipRadius, chipRadius, paint)
            val sparkColor = Color.rgb(210, 245, 250)
            drawStar(c, chip.left - s(12f), (chip.top + chip.bottom) / 2f, s(6f), sparkColor)
            drawStar(c, chip.right + s(12f), (chip.top + chip.bottom) / 2f, s(6f), sparkColor)
        } else {
            paint.reset(); paint.isAntiAlias = true
            paint.style = Paint.Style.FILL
            paint.color = pal.glow
            c.drawRoundRect(chip, chipRadius, chipRadius, paint)
        }
        rarityTextPaint.color = pal.chipTextColor
        drawTextTopLeft(c, labelText, chip.left + s(10f), chip.top + s(3f), rarityTextPaint)

        // 6. Title -- foil (glow + outline + gradient fill) for EPIC and up,
        // plain flat ink for NORMAL/RARE.
        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = titleTypeface
            textSize = s(50f)
        }
        val foil = CardStyle.foilTitle(rarity)
        val titleX = sx(CardLayout.HEADER.left + 26f)
        val titleTop = sy(CardLayout.HEADER.top + 46f)
        if (foil != null) {
            drawFoilText(c, titleX, titleTop, title, titlePaint, foil.colors, foil.outline, foil.glow, foil.vertical, s(4f), s(5f))
        } else {
            titlePaint.color = pal.text
            drawTextTopLeft(c, title, titleX, titleTop, titlePaint)
        }

        // 7. Info panel.
        translucentPanel(c, info, s(24f), pal.panel, headerAlpha, pal.glow, s(2f))
        val statPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = statTypeface
            textSize = s(28f)
            color = pal.text
        }
        drawTextTopLeft(c, stat, sx(CardLayout.INFO.left + 26f), sy(CardLayout.INFO.top + 26f), statPaint)

        val quotePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = titleTypeface
            textSize = s(36f)
            color = pal.text
        }
        val wrapWidth = s(CardLayout.INFO.width() - 52f)
        val quoteLines = wrapLines("“$quote”", quotePaint, wrapWidth)
        var qy = sy(CardLayout.INFO.top + 68f)
        val lineHeight = s(44f)
        for (line in quoteLines) {
            drawTextTopLeft(c, line, sx(CardLayout.INFO.left + 26f), qy, quotePaint)
            qy += lineHeight
        }
        val diamondCx = (info.left + info.right) / 2f
        val diamondCy = qy + s(22f)
        val dr = s(7f)
        paint.reset(); paint.isAntiAlias = true
        paint.style = Paint.Style.FILL
        paint.color = pal.text
        val diamondPath = Path().apply {
            moveTo(diamondCx, diamondCy - dr)
            lineTo(diamondCx + dr, diamondCy)
            lineTo(diamondCx, diamondCy + dr)
            lineTo(diamondCx - dr, diamondCy)
            close()
        }
        c.drawPath(diamondPath, paint)

        // 8. Case tag + logo, footer row inside the info panel. The case
        // number is a fixed placeholder carried over unchanged from every
        // confirmed mockup render (CASE #4821 on all 5 rarities) -- not a
        // real per-share incident id; wiring a real one in is a follow-up,
        // not part of this visual-design port.
        val caseTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = sansBoldTypeface
            textSize = s(22f)
            color = pal.text
        }
        val caseText = "CASE #4821"
        val caseTextWidth = caseTextPaint.measureText(caseText)
        val caseBox = RectF(
            sx(CardLayout.INFO.left + 46f), sy(CardLayout.INFO.bottom - 58f),
            sx(CardLayout.INFO.left + 46f) + caseTextWidth + s(28f), sy(CardLayout.INFO.bottom - 58f) + s(40f)
        )
        paint.reset(); paint.isAntiAlias = true
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = s(2f)
        paint.color = pal.glow
        c.drawRoundRect(caseBox, s(10f), s(10f), paint)
        drawTextTopLeft(c, caseText, caseBox.left + s(14f), caseBox.top + s(8f), caseTextPaint)

        assetBitmap("logo/logo_ko.png")?.let { logo ->
            val maxW = s(140f); val maxH = s(44f)
            val logoScale = min(maxW / logo.width, maxH / logo.height)
            val lw2 = logo.width * logoScale; val lh2 = logo.height * logoScale
            val lx = info.right - s(24f) - lw2
            val ly = caseBox.top + (s(40f) - lh2) / 2f
            c.drawBitmap(logo, null, RectF(lx, ly, lx + lw2, ly + lh2), paint)
        }

        // 9. Emblem -- medallion shell, size-corrected per rarity so the
        // visible ring reads consistently despite each source PNG having a
        // different own-canvas fill ratio (CardStyle.TcgPalette.medalFix doc).
        val medSize = ed * pal.medalFix
        assetBitmap(medallionAsset(rarity))?.let { medallion ->
            val medRect = RectF(ecx - medSize / 2f, ecy - medSize / 2f, ecx + medSize / 2f, ecy + medSize / 2f)
            c.drawBitmap(medallion, null, medRect, paint)
        }

        if (pal.fx >= 1) {
            emblemSparkles(c, ecx, ecy, medSize * 0.62f, pal.glow, if (pal.fx == 1) 6 else 9, if (pal.fx == 1) 5f to 9f else 6f to 12f)
        }

        val symbolAsset = raritySymbolAsset(rarity)
        if (symbolAsset != null) {
            assetBitmap(symbolAsset)?.let { sym ->
                val symD = ed * 0.5f
                val symScale = min(symD / sym.width, symD / sym.height)
                val sw = sym.width * symScale; val sh = sym.height * symScale
                val symRect = RectF(ecx - sw / 2f, ecy - sh / 2f, ecx + sw / 2f, ecy + sh / 2f)
                c.drawBitmap(sym, null, symRect, paint)
            }
        } else {
            // HIDDEN -- director: "히든 앰블렘이랑 타이틀은 좀 더 히든스럽게".
            // A quiet, mysterious treatment instead of the epic/legendary
            // sparkle-celebration look: a soft double glow ring behind the
            // medallion, a bright core glow behind the glyph, and a scatter
            // of small dots orbiting close to the ring.
            radialGlow(c, ecx, ecy, ed * 1.15f, Color.rgb(30, 120, 150), s(34f), 110)
            val ringR = medSize * 0.62f
            paint.reset(); paint.isAntiAlias = true
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = s(2f)
            paint.color = Color.rgb(120, 220, 235)
            c.drawCircle(ecx, ecy, ringR, paint)
            paint.strokeWidth = s(1f)
            paint.color = Color.argb(120, 120, 220, 235)
            c.drawCircle(ecx, ecy, ringR + s(10f), paint)

            paint.reset(); paint.isAntiAlias = true
            paint.style = Paint.Style.FILL
            paint.color = Color.rgb(200, 240, 245)
            for (i in 0 until 10) {
                val ang = (2 * PI / 10) * i + 0.2
                val px = ecx + (ringR + s(16f)) * cos(ang).toFloat()
                val py = ecy + (ringR + s(16f)) * sin(ang).toFloat() * 0.95f
                c.drawCircle(px, py, s(2f), paint)
            }

            val glyph = "?"
            val glyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = sansBoldTypeface
                textSize = s(90f)
            }
            val gw = glyphPaint.measureText(glyph)
            val glyphX = ecx - gw / 2f
            val glyphTop = ecy - s(55f)
            val glyphBaseline = glyphTop - glyphPaint.ascent()

            val glowPaint = Paint(glyphPaint).apply {
                style = Paint.Style.FILL
                color = Color.rgb(150, 225, 240)
                alpha = 255
                maskFilter = BlurMaskFilter(s(6f), BlurMaskFilter.Blur.NORMAL)
            }
            c.drawText(glyph, glyphX, glyphBaseline, glowPaint)

            glyphPaint.style = Paint.Style.FILL
            glyphPaint.color = Color.rgb(232, 246, 250)
            c.drawText(glyph, glyphX, glyphBaseline, glyphPaint)
        }
    }

    // -- foil text / glow / sparkle helpers --------------------------------

    /**
     * TCG-style foil card-name text: a soft glow behind everything, a solid
     * dark outline (a thick stroke pass), then a gradient fill on top --
     * `Canvas.drawText` only paints glyph pixels regardless of the Paint
     * used, so the gradient fill naturally lands only on the glyphs
     * themselves with no separate masking step (unlike the PIL mockup,
     * which had to rasterize an explicit alpha mask to get the same clip).
     *
     * [vertical] samples the gradient top-to-bottom across the text's own
     * bounding box (every letter shaded identically, for legibility on
     * light EPIC/LEGENDARY panels); otherwise left-to-right (HIDDEN's
     * rainbow sweep, safe against its dark panel -- see CardStyle.kt).
     */
    private fun drawFoilText(
        canvas: Canvas,
        x: Float,
        yTop: Float,
        text: String,
        basePaint: Paint,
        colors: IntArray,
        outlineColor: Int,
        glowColor: Int,
        vertical: Boolean,
        outlineWidth: Float,
        glowBlur: Float
    ) {
        val baseline = yTop - basePaint.ascent()

        val glowPaint = Paint(basePaint).apply {
            style = Paint.Style.FILL
            color = glowColor
            alpha = 200
            maskFilter = BlurMaskFilter(glowBlur, BlurMaskFilter.Blur.NORMAL)
        }
        canvas.drawText(text, x, baseline, glowPaint)

        val outlinePaint = Paint(basePaint).apply {
            style = Paint.Style.STROKE
            strokeWidth = outlineWidth
            color = outlineColor
            maskFilter = null
            alpha = 255
        }
        canvas.drawText(text, x, baseline, outlinePaint)

        val bounds = Rect()
        basePaint.getTextBounds(text, 0, text.length, bounds)
        val gradientShader = if (vertical) {
            LinearGradient(0f, baseline + bounds.top, 0f, baseline + bounds.bottom, colors, null, Shader.TileMode.CLAMP)
        } else {
            LinearGradient(x + bounds.left, 0f, x + bounds.right, 0f, colors, null, Shader.TileMode.CLAMP)
        }
        val fillPaint = Paint(basePaint).apply {
            style = Paint.Style.FILL
            shader = gradientShader
            maskFilter = null
            alpha = 255
        }
        canvas.drawText(text, x, baseline, fillPaint)
    }

    private fun drawTextTopLeft(canvas: Canvas, text: String, x: Float, yTop: Float, paint: Paint) {
        canvas.drawText(text, x, yTop - paint.ascent(), paint)
    }

    private fun wrapLines(text: String, paint: Paint, maxWidth: Float): List<String> {
        val words = text.split(" ")
        val lines = mutableListOf<String>()
        var cur = ""
        for (w in words) {
            val trial = if (cur.isEmpty()) w else "$cur $w"
            if (paint.measureText(trial) <= maxWidth || cur.isEmpty()) {
                cur = trial
            } else {
                lines.add(cur)
                cur = w
            }
        }
        if (cur.isNotEmpty()) lines.add(cur)
        return lines
    }

    // NOTE on all the Paint(...).apply{} blocks in this file: never write
    // `prop = prop` (or `this.prop = prop`) where the RHS name is a bare
    // identifier that also happens to be a Paint property name (color,
    // alpha, strokeWidth, shader, ...) -- inside `apply`, an unqualified
    // name matching the receiver's own property shadows an outer
    // parameter/local of the same name, so the RHS silently reads the
    // receiver's own (unset/copied) value instead of the intended
    // argument. Every helper below deliberately gives its parameters
    // names that can't collide with a Paint property for this reason.
    private fun translucentPanel(canvas: Canvas, box: RectF, radius: Float, fillColor: Int, fillAlpha: Int, outlineColor: Int, outlineWidth: Float) {
        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = fillColor
            alpha = fillAlpha
        }
        canvas.drawRoundRect(box, radius, radius, fillPaint)
        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = outlineWidth
            color = outlineColor
        }
        canvas.drawRoundRect(box, radius, radius, strokePaint)
    }

    private fun radialGlow(canvas: Canvas, cx: Float, cy: Float, radius: Float, tint: Int, blur: Float, opacity: Int) {
        val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = tint
            alpha = opacity
            maskFilter = BlurMaskFilter(blur, BlurMaskFilter.Blur.NORMAL)
        }
        canvas.drawCircle(cx, cy, radius, glowPaint)
    }

    /** An 8-point sparkle-star shape (main axis points at r, diagonals at 0.28r) -- matches sim_tcg_v16.py's draw_star. */
    private fun drawStar(canvas: Canvas, cx: Float, cy: Float, r: Float, fillColor: Int) {
        val path = Path().apply {
            moveTo(cx, cy - r)
            lineTo(cx + r * 0.28f, cy - r * 0.28f)
            lineTo(cx + r, cy)
            lineTo(cx + r * 0.28f, cy + r * 0.28f)
            lineTo(cx, cy + r)
            lineTo(cx - r * 0.28f, cy + r * 0.28f)
            lineTo(cx - r, cy)
            lineTo(cx - r * 0.28f, cy - r * 0.28f)
            close()
        }
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL; color = fillColor }
        canvas.drawPath(path, paint)
    }

    /** A ring of sparkle stars around the emblem, escalating with fx level -- kept close to the emblem so it doesn't compete with the frame's own border decoration. */
    private fun emblemSparkles(canvas: Canvas, cx: Float, cy: Float, ringR: Float, color: Int, count: Int, sizeRange: Pair<Float, Float>) {
        val alphaColor = Color.argb(235, Color.red(color), Color.green(color), Color.blue(color))
        for (i in 0 until count) {
            val ang = (2 * PI / count) * i + 0.4
            val px = cx + ringR * cos(ang).toFloat()
            val py = cy + ringR * sin(ang).toFloat() * 0.9f
            val r = sizeRange.first + (sizeRange.second - sizeRange.first) * ((i * 37) % 10) / 10f
            drawStar(canvas, px, py, r, alphaColor)
        }
    }

    // -- layout ------------------------------------------------------------

    /** Fits the largest rect of the card's own 1024:1536 aspect inside the given bounds, centered -- the card renders edge-to-edge within this rect. */
    private fun cardAlignedRect(left: Float, top: Float, right: Float, bottom: Float): RectF {
        val cardAspect = CardLayout.W / CardLayout.H
        val availW = right - left
        val availH = bottom - top
        var w = availW
        var h = w / cardAspect
        if (h > availH) {
            h = availH
            w = h * cardAspect
        }
        val cardLeft = left + (availW - w) / 2f
        val cardTop = top + (availH - h) / 2f
        return RectF(cardLeft, cardTop, cardLeft + w, cardTop + h)
    }

    // -- asset lookup -------------------------------------------------------

    private fun assetBitmap(path: String): Bitmap? = runCatching {
        context.assets.open("visual/$path").use { BitmapFactory.decodeStream(it) }
    }.getOrNull()

    private fun frameBgAsset(rarity: Rarity): String = "cards/frame_bg/${rarity.name.lowercase()}.webp"

    private fun medallionAsset(rarity: Rarity): String = "cards/medallions/${rarity.name.lowercase()}.webp"

    private fun raritySymbolAsset(rarity: Rarity): String? = when (rarity) {
        Rarity.NORMAL -> "brand/rarity_symbols/rarity_normal.png"
        Rarity.RARE -> "brand/rarity_symbols/rarity_rare.png"
        Rarity.EPIC -> "brand/rarity_symbols/rarity_epic.png"
        Rarity.LEGENDARY -> "brand/rarity_symbols/rarity_legendary.png"
        Rarity.HIDDEN -> null
    }

    // backgrounds/share/<size>/bg_<rarity>_<square|vertical>.png -- the
    // outer canvas backdrop, independent of the TCG card face itself.
    // HIDDEN's two visual families (CardStyle.isOpalHidden) map to the
    // pack's two HIDDEN backgrounds by tone: hidden_01 is the pale
    // iridescent/opal one, hidden_02 is the deep-navy starfield one.
    private fun backgroundAsset(rarity: Rarity, opal: Boolean, format: Format): String {
        val size = if (format == Format.STORY) "1080x1920" else "1080x1080"
        val suffix = if (format == Format.STORY) "vertical" else "square"
        val rarityName = when (rarity) {
            Rarity.NORMAL -> "normal"
            Rarity.RARE -> "rare"
            Rarity.EPIC -> "epic"
            Rarity.LEGENDARY -> "legendary"
            Rarity.HIDDEN -> if (opal) "hidden_01" else "hidden_02"
        }
        return "backgrounds/share/$size/bg_${rarityName}_$suffix.png"
    }

    private fun commonBackgroundAsset(format: Format): String {
        val size = if (format == Format.STORY) "1080x1920" else "1080x1080"
        val suffix = if (format == Format.STORY) "vertical" else "square"
        return "backgrounds/share/$size/bg_common_$suffix.png"
    }

    // Same incident -> illustration mapping the pre-redesign renderer used
    // (unrelated to the card-face visual redesign -- the art window just
    // needs *a* bitmap to cover-fit). v0.31/v0.32: per-rarity illustration
    // variants, all 12 types x 4 rarities have their own file.
    private val rarityIllustrationVariants: Set<String> = setOf(
        "QUICK_EXIT_NORMAL", "QUICK_EXIT_RARE", "QUICK_EXIT_EPIC", "QUICK_EXIT_LEGENDARY",
        "REENTRY_NORMAL", "REENTRY_RARE", "REENTRY_EPIC", "REENTRY_LEGENDARY",
        "REGULAR_NORMAL", "REGULAR_RARE", "REGULAR_EPIC", "REGULAR_LEGENDARY",
        "RETURN_TO_START_NORMAL", "RETURN_TO_START_RARE", "RETURN_TO_START_EPIC", "RETURN_TO_START_LEGENDARY",
        "PATROL_NORMAL", "PATROL_RARE", "PATROL_EPIC", "PATROL_LEGENDARY",
        "ESCAPE_FAILED_NORMAL", "ESCAPE_FAILED_RARE", "ESCAPE_FAILED_EPIC", "ESCAPE_FAILED_LEGENDARY",
        "FIRST_CONTACT_NORMAL", "FIRST_CONTACT_RARE", "FIRST_CONTACT_EPIC", "FIRST_CONTACT_LEGENDARY",
        "NIGHT_PATROL_NORMAL", "NIGHT_PATROL_RARE", "NIGHT_PATROL_EPIC", "NIGHT_PATROL_LEGENDARY",
        "APP_WANDERING_NORMAL", "APP_WANDERING_RARE", "APP_WANDERING_EPIC", "APP_WANDERING_LEGENDARY",
        "HUNDRED_VISITS_NORMAL", "HUNDRED_VISITS_RARE", "HUNDRED_VISITS_EPIC", "HUNDRED_VISITS_LEGENDARY",
        "DIGITAL_LOST_NORMAL", "DIGITAL_LOST_RARE", "DIGITAL_LOST_EPIC", "DIGITAL_LOST_LEGENDARY",
        "DAWN_SURVIVOR_NORMAL", "DAWN_SURVIVOR_RARE", "DAWN_SURVIVOR_EPIC", "DAWN_SURVIVOR_LEGENDARY",
    )

    private fun incidentIllustrationAsset(type: IncidentType, rarity: Rarity): String {
        val base = incidentIllustrationBase(type)
        val key = "${type.name}_${rarity.name}"
        return if (rarityIllustrationVariants.contains(key)) {
            val dot = base.lastIndexOf('.')
            base.substring(0, dot) + "_${rarity.name.lowercase()}" + base.substring(dot)
        } else {
            base
        }
    }

    private fun incidentIllustrationBase(type: IncidentType): String = when (type) {
        IncidentType.QUICK_EXIT -> "incidents/card_ready/incident_quick_exit.webp"
        IncidentType.REENTRY -> "incidents/card_ready/incident_reentry.webp"
        IncidentType.REGULAR -> "incidents/card_ready/incident_regular.webp"
        IncidentType.RETURN_TO_START -> "incidents/card_ready/incident_return_to_start.webp"
        IncidentType.PATROL -> "incidents/card_ready/incident_patrol.webp"
        IncidentType.ESCAPE_FAILED -> "incidents/card_ready/incident_escape_failed.webp"
        IncidentType.FIRST_CONTACT -> "incidents/card_ready/incident_first_contact.webp"
        IncidentType.NIGHT_PATROL -> "incidents/card_ready/incident_night_patrol.webp"
        IncidentType.APP_WANDERING -> "incidents/card_ready/incident_app_wandering.webp"
        IncidentType.HUNDRED_VISITS -> "incidents/card_ready/incident_hundred_visits.webp"
        IncidentType.DIGITAL_LOST -> "incidents/card_ready/incident_digital_lost.webp"
        IncidentType.DAWN_SURVIVOR -> "incidents/card_ready/incident_dawn_survivor.webp"
        IncidentType.HIDDEN_LOOP -> "incidents/card_ready/incident_hidden_loop.webp"
        IncidentType.HIDDEN_NIGHT_ACTIVITY -> "incidents/card_ready/incident_hidden_night_activity.webp"
    }

    // -- generic bitmap helpers ---------------------------------------------

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
}
