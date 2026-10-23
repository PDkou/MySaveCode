package com.howlingcreativestudio.drawary;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.provider.OpenableColumns;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Turns a picture the person picked in the system photo picker into a JPEG the page can always draw: the phone's own
 * decoder reads it (JPEG, PNG, WebP, HEIC/HEIF, with the camera's rotation applied), it is scaled down to at most
 * MAX_SIDE pixels on its longest side, and saved as a JPEG. Pictures kept in the app's database stay a sensible size.
 */
final class PhotoReader {
    static final int MAX_SIDE = 2048;
    static final int QUALITY = 85;

    private PhotoReader() { }

    static byte[] toJpeg(Context context, Uri uri) throws IOException {
        ContentResolver resolver = context.getContentResolver();
        Bitmap decoded = ImageDecoder.decodeBitmap(ImageDecoder.createSource(resolver, uri), (decoder, info, source) -> {
            int width = info.getSize().getWidth();
            int height = info.getSize().getHeight();
            int longest = Math.max(width, height);
            if (longest > MAX_SIDE) {
                float scale = (float) MAX_SIDE / longest;
                decoder.setTargetSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
            }
            decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE); // a software bitmap can be drawn on and compressed
        });
        Bitmap flat = decoded;
        if (decoded.hasAlpha()) { // JPEG has no transparency: put the picture on white
            flat = Bitmap.createBitmap(decoded.getWidth(), decoded.getHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(flat);
            canvas.drawColor(Color.WHITE);
            canvas.drawBitmap(decoded, 0, 0, null);
            decoded.recycle();
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (!flat.compress(Bitmap.CompressFormat.JPEG, QUALITY, out)) throw new IOException("Could not save the picture as a JPEG");
            return out.toByteArray();
        } finally {
            flat.recycle();
        }
    }

    /** The picture's file name from the picker, with a .jpg ending (what it is saved as). */
    static String jpegName(Context context, Uri uri, int index) {
        String name = null;
        try (Cursor cursor = context.getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0);
        } catch (RuntimeException e) {
            // no name: use a numbered one
        }
        if (name == null || name.trim().isEmpty()) name = "photo" + (index + 1);
        int dot = name.lastIndexOf('.');
        if (dot > 0) name = name.substring(0, dot);
        return name + ".jpg";
    }
}
