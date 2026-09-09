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
import android.graphics.Rect
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

        // Full-bleed backdrop. v0.18-v0.21 tiled bg_pattern_beige.png (a
        // 445x535 tile that turned out not to be seamless) with
        // TileMode.MIRROR to hide the seam while keeping the paw/hat
        // pattern -- a real fix, but still a mirrored-repeat look rather
        // than the "one full-canvas image" the director asked design for
        // (docs/ASSET_REQUESTS_FOR_DESIGN.md #4). Design replied with
        // exactly that: a single, non-tiled background per rarity per
        // format (backgrounds/share/<size>/bg_<rarity>_<square|vertical>.png,
        // e.g. bg_normal_square.png), each already sized to match this
        // renderer's own canvas exactly (1080x1080 / 1080x1920) and toned to
        // the rarity's own frame-interior color from the request spec, plus
        // a bg_common_* fallback in the same beige family as the old tile.
        // drawCover (not a raw drawBitmap) still guards against any future
        // asset that isn't an exact pixel match to the canvas.
        val backdrop = assetBitmap(backgroundAsset(incident.rarity, opal, format))
            ?: assetBitmap(commonBackgroundAsset(format))
        if (backdrop != null) {
            drawCover(c, backdrop, RectF(0f, 0f, format.width.toFloat(), format.height.toFloat()), paint)
        } else {
            c.drawColor(Color.rgb(250, 245, 232))
        }

        // For SQUARE, outerTop/outerBottom (not margin) was the binding
        // constraint: frameAlignedRect fits the frame's ~0.8 aspect ratio
        // inside a 1:1 canvas, which is height-limited, so a large top/
        // bottom margin (110f = 10.2% of the canvas) shrank the whole card
        // -- it ended up only 688x860 inside a 1080x1080 canvas, with big
        // (18%) empty margins on the left/right that made the card look
        // small (reported on a real device even after the background-scale
        // and text-position bugs above were already fixed). Cut both
        // margins for SQUARE specifically -- STORY's large outerTop/
        // outerBottom (330f) stays as-is; that one is intentional, not a
        // bug: Instagram Stories overlays its own UI (progress bar,
        // username, reply box) in those exact zones, so a story-format
        // export needs that clearance or the app's own content gets
        // covered by the platform's chrome.
        val margin = if (format == Format.STORY) 78f else 50f
        val outerTop = if (format == Format.STORY) 330f else 50f
        val outerBottom = if (format == Format.STORY) format.height - 330f else format.height - 50f
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
        // pad was a fixed 56f (8.1% of this card's width) from the very
        // first version of this renderer, and every fix since v0.15 tuned
        // contentTop/footerTop/punchWidth around it without ever
        // rechecking it against the frame art itself. Pixel-measuring the
        // frame's LEFT border (where the border stroke ends and the actual
        // cream/gold interior begins, checked on both frame_normal.png and
        // frame_legendary.png -- same template, consistent result) puts
        // that at ~13.5% of the card's width, not 8.1% -- every text
        // element anchored at `rect.left + pad` (title, detail, punchline,
        // logo) has been starting slightly on top of the border stripe
        // instead of clearly inside it. 14% clears it with a small margin.
        val pad = rect.width() * 0.14f
        val contentTop = rect.top + rect.height() * 0.22f
        // footerTop (MONI's scene-box bottom) used to be a fixed
        // `rect.bottom - 120f`, which put MONI's bottom-anchored, mostly
        // width-constrained image tall enough to still have pixels at the
        // punchline's row below -- a real exported card showed MONI's legs
        // and the punchline text drawn right on top of each other. Reserve
        // a real fraction of the card's own height for the punchline+footer
        // strip instead of a fixed pixel count, so MONI's box always ends
        // above it regardless of format (SQUARE vs STORY have very
        // different absolute heights). 34% leaves room for a 3-line quote
        // (the measured worst case at the narrower, magnifier-safe width
        // below) plus the footer row; every character pose used here stays
        // width-constrained by drawContain even at this shorter box height,
        // so none of them actually render smaller.
        val footerTop = rect.bottom - rect.height() * 0.34f
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
        // v0.23: the sceneBox here is portrait (~0.7 aspect, tuned for the
        // old square-ish character cutouts) but every incident illustration
        // is landscape (1200x675 or 1672x941, ~1.78 aspect) -- a naive
        // drawContain() shrinks the WHOLE canvas to fit the box's width,
        // and 'overlay' illustrations only use a small centered fraction of
        // that canvas (the rest is transparent padding meant for a much
        // wider box in index.html), so the actual character ended up
        // tiny. Fixed per render_mode (see incidentIllustrationAsset()'s
        // comment): 'overlay' art is trimmed to its opaque pixel bounds
        // first (drops the wasted transparent margin, never crops real
        // content) then drawContain-ed; 'scene' art has no transparent
        // margin to trim (it's a full painted background, same as
        // index.html's background-size:cover treatment for scene mode), so
        // it's drawCover-ed instead -- cropped to fill the box completely,
        // verified against several scene illustrations that the centered
        // crop keeps the main subject in frame.
        assetBitmap(incidentIllustrationAsset(incident.type, incident.rarity))?.let { art ->
            val sceneBox = RectF(sceneLeft, contentTop, rect.right - 28f, footerTop)
            if (isSceneIllustration(incident.type)) {
                drawCover(c, art, sceneBox, paint)
            } else {
                val trimmed = opaqueBounds(art)?.let { b ->
                    Bitmap.createBitmap(art, b.left, b.top, b.width(), b.height())
                } ?: art
                drawContain(c, trimmed, sceneBox, paint)
            }
        }

        paint.isFakeBoldText = true; paint.textSize = 38f; paint.color = p.title
        // Earlier fixes here (v0.15/v0.16) treated this as "text runs past
        // the plain border" and just backed the wrap width off the border
        // edge (~87% of card width). That missed the real obstacle: the
        // frame's magnifier ornament in the bottom-right corner is much
        // bigger than the plain border and its left edge sweeps inward as
        // you go down -- pixel-measured on frame_normal.png at the actual
        // row band this text occupies (roughly 75-85% down the card), it
        // intrudes as far as ~64% of the card's width, well short of the
        // ~87% border-only estimate. A wide punchline line was rendering
        // straight through it (confirmed via a Chromium re-render of the
        // real asset). 55% keeps every line clear of the magnifier with
        // real margin at every row it can reach, verified against all 14
        // punch{} strings in index.html (3 lines worst-case at this width
        // and the smaller 38px size below -- footerTop's 34% reserve above
        // has room for exactly that). Defined relative to the corrected
        // `pad` above (62% right edge minus pad) so fixing the left inset
        // didn't silently push this back into the magnifier's reach.
        val punchWidth = rect.width() * 0.62f - pad
        // Starts right below footerTop (MONI's box bottom) instead of a
        // fixed rect.bottom-165f -- that fixed offset was what let it land
        // inside MONI's vertical span in the first place. drawWrapped
        // returns where its last line actually landed, so the logo/caption
        // row below can anchor off the real text height (1-3 lines) instead
        // of assuming one line.
        val punchEndY = drawWrapped(c, "“$punchline”", rect.left + pad, footerTop + 50f, punchWidth, 46f, paint)

        // Wordmark logo instead of a plain app-name text label, matching the
        // language actually selected in-app (not the device locale) -- text
        // fallback if the logo asset can't be decoded.
        val logoTop = punchEndY + 30f
        val logo = assetBitmap(if (lang == "ja") "logo/logo_jp.png" else "logo/logo_ko.png")
        val captionY = logoTop + 24f
        if (logo != null) {
            drawLeftAligned(c, logo, rect.left + pad, logoTop, 28f, paint)
        } else {
            paint.isFakeBoldText = false; paint.textSize = 30f; paint.color = p.accent
            c.drawText(context.getString(com.howling.openedagain.R.string.app_name), rect.left + pad, captionY, paint)
        }
        paint.isFakeBoldText = false; paint.textSize = 30f; paint.color = p.accent
        paint.textAlign = Paint.Align.RIGHT
        // Anchored at leftColRight, not rect.right - pad: the frame's own
        // magnifier ornament (bottom-right corner -- see punchWidth's
        // comment above for how far it actually reaches) sat exactly where
        // a corner-pinned label would go and covered it. leftColRight keeps
        // this label clear of that ornament across every rarity (same
        // frame template).
        // captionY (like logoTop) is anchored off the punchline's actual
        // wrapped height rather than a fixed rect.bottom offset -- see
        // punchEndY above.
        c.drawText("MONI CASE FILE", leftColRight, captionY, paint)
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

    // backgrounds/share/<size>/bg_<rarity>_<square|vertical>.png -- design's
    // v0.19 asset pack (docs/ASSET_REQUESTS_FOR_DESIGN.md #4). HIDDEN's two
    // visual families (CardStyle.isOpalHidden) map to the pack's two HIDDEN
    // backgrounds by tone, confirmed against the pack's own preview sheet:
    // hidden_01 is the pale iridescent/opal one (this renderer's "opal"
    // family), hidden_02 is the deep-navy starfield one (the "anomaly"
    // family) -- opposite index from frameAsset()'s hidden_01/02, which
    // names its files the other way around; each mapping is verified
    // against its own asset's actual look, not assumed to match the other.
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

    // Same incident -> pose mapping as index.html's incidentVisual(), minus
    // the background half (the share card gets its background from the
    // rarity frame art instead).
    //
    // v0.14 asset pack: character/additional/ merged into character/basic/;
    // character/expressions/* was fully replaced with a new "_phone" set
    // (old exp_suspicious.png is gone); moni_sit_phone.png/moni_sleep.png
    // were dropped for good (source-sheet contamination found during the
    // design pipeline's re-crop pass, see docs/DEVELOPMENT_HISTORY.md v0.14).
    // v0.23: replaced the 6-7 shared generic character poses with the 14
    // dedicated per-IncidentType illustrations from the final visual asset
    // handoff (docs/UI_VISUAL_DIRECTION_REQUEST.md gap #1, resolved -- same
    // files index.html's incidentVisual() now uses). Unlike index.html,
    // which has a separate background layer to distinguish 'overlay' vs
    // 'scene' render_mode (see art/handoff/2026-09-09-final-visual-assets/
    // ASSET_MANIFEST.json), this renderer has only the one scene box, so
    // both modes are drawn the same way here via drawContain() -- there's
    // no second layer for a 'scene' illustration to be composited onto or
    // instead of.
    // v0.31: per-rarity illustration variants (docs/ASSET_REQUESTS_FOR_DESIGN.md
    // item 6, 2026-09-09) -- mirrors index.html's RARITY_ILLUSTRATION_VARIANTS/
    // incidentArt() exactly, same empty-for-now set (no variant files exist
    // yet, so every lookup falls back to incidentIllustrationBase()'s single
    // per-type file with zero behavior change). Add "TYPE_RARITY" entries
    // here in lockstep with index.html's set when design delivers files --
    // HIDDEN_LOOP/HIDDEN_NIGHT_ACTIVITY never need one (always Rarity.HIDDEN).
    private val rarityIllustrationVariants: Set<String> = setOf(
        // "QUICK_EXIT_LEGENDARY", "QUICK_EXIT_EPIC", ...
    )

    private fun incidentIllustrationAsset(type: IncidentType, rarity: Rarity): String {
        val base = incidentIllustrationBase(type)
        val key = "${type.name}_${rarity.name}"
        return if (rarityIllustrationVariants.contains(key)) {
            base.removeSuffix(".png") + "_${rarity.name.lowercase()}.png"
        } else {
            base
        }
    }

    private fun incidentIllustrationBase(type: IncidentType): String = when (type) {
        IncidentType.QUICK_EXIT -> "incidents/card_ready/incident_quick_exit.png"
        IncidentType.REENTRY -> "incidents/card_ready/incident_reentry.png"
        IncidentType.REGULAR -> "incidents/card_ready/incident_regular.png"
        IncidentType.RETURN_TO_START -> "incidents/card_ready/incident_return_to_start.png"
        IncidentType.PATROL -> "incidents/card_ready/incident_patrol.png"
        IncidentType.ESCAPE_FAILED -> "incidents/card_ready/incident_escape_failed.png"
        IncidentType.FIRST_CONTACT -> "incidents/card_ready/incident_first_contact.png"
        IncidentType.NIGHT_PATROL -> "incidents/card_ready/incident_night_patrol.png"
        IncidentType.APP_WANDERING -> "incidents/card_ready/incident_app_wandering.png"
        IncidentType.HUNDRED_VISITS -> "incidents/card_ready/incident_hundred_visits.png"
        IncidentType.DIGITAL_LOST -> "incidents/card_ready/incident_digital_lost.png"
        IncidentType.DAWN_SURVIVOR -> "incidents/card_ready/incident_dawn_survivor.png"
        IncidentType.HIDDEN_LOOP -> "incidents/card_ready/incident_hidden_loop.png"
        IncidentType.HIDDEN_NIGHT_ACTIVITY -> "incidents/card_ready/incident_hidden_night_activity.png"
    }

    // Mirrors ASSET_MANIFEST.json's render_mode field (see
    // art/handoff/2026-09-09-final-visual-assets/docs/ASSET_MANIFEST.json
    // and index.html's incidentVisual(), which encodes the same data) --
    // 'scene' illustrations are a complete painted background with no
    // transparent margin, 'overlay' ones are a transparent character/prop
    // composition meant to sit over something else.
    private fun isSceneIllustration(type: IncidentType): Boolean = when (type) {
        IncidentType.REGULAR, IncidentType.APP_WANDERING, IncidentType.DAWN_SURVIVOR,
        IncidentType.HIDDEN_LOOP, IncidentType.HIDDEN_NIGHT_ACTIVITY -> true
        else -> false
    }

    /** Returns the smallest rect enclosing every non-fully-transparent pixel in [bmp], or null if it's all transparent. */
    private fun opaqueBounds(bmp: Bitmap): Rect? {
        val w = bmp.width; val h = bmp.height
        val pixels = IntArray(w * h)
        bmp.getPixels(pixels, 0, w, 0, 0, w, h)
        var minX = w; var minY = h; var maxX = -1; var maxY = -1
        for (y in 0 until h) {
            val row = y * w
            for (x in 0 until w) {
                if ((pixels[row + x] ushr 24) > 10) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                }
            }
        }
        return if (maxX >= minX && maxY >= minY) Rect(minX, minY, maxX + 1, maxY + 1) else null
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
