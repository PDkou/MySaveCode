package com.howling.openedagain.ui

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.provider.MediaStore
import com.howling.openedagain.core.DetectedIncident
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ShareCardRenderer(private val context: Context) {
    enum class Format(val width: Int, val height: Int) { SQUARE(1080, 1080), STORY(1080, 1920) }

    fun render(incident: DetectedIncident, title: String, punchline: String, detail: String, format: Format): Bitmap {
        val p = CardStyle.palette(incident.rarity)
        val bitmap = Bitmap.createBitmap(format.width, format.height, Bitmap.Config.ARGB_8888)
        val c = Canvas(bitmap)
        c.drawColor(p.background)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val margin = 78f
        val top = if (format == Format.STORY) 330f else 110f
        val bottom = if (format == Format.STORY) format.height - 330f else format.height - 110f
        val rect = RectF(margin, top, format.width - margin, bottom)
        paint.style = Paint.Style.FILL; paint.color = android.graphics.Color.WHITE
        c.drawRoundRect(rect, 46f, 46f, paint)
        paint.style = Paint.Style.STROKE; paint.strokeWidth = 9f; paint.color = p.border
        c.drawRoundRect(rect, 46f, 46f, paint)

        paint.style = Paint.Style.FILL
        paint.color = p.accent; paint.textSize = 42f; paint.isFakeBoldText = true
        c.drawText(incident.rarity.name, margin + 56f, top + 82f, paint)
        paint.color = p.title; paint.textSize = 78f
        c.drawText(title, margin + 56f, top + 190f, paint)
        paint.color = p.body; paint.textSize = 42f; paint.isFakeBoldText = false
        drawWrapped(c, detail, margin + 56f, top + 285f, rect.width() - 112f, 58f, paint)

        paint.isFakeBoldText = true; paint.textSize = 50f; paint.color = p.title
        drawWrapped(c, "“$punchline”", margin + 56f, bottom - 185f, rect.width() - 112f, 64f, paint)

        paint.isFakeBoldText = false; paint.textSize = 34f; paint.color = p.accent
        c.drawText(context.getString(com.howling.openedagain.R.string.app_name), margin + 56f, bottom - 72f, paint)
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
