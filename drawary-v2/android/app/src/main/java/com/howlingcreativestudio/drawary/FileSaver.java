package com.howlingcreativestudio.drawary;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;

import java.io.IOException;
import java.io.OutputStream;

/** Writes a file the person asked for (backup, CSV) to Download/Drawary through MediaStore: no storage permission. */
final class FileSaver {
    static final String PLACE = "Download/Drawary";

    private FileSaver() {}

    static String save(Context context, String fileName, String mimeType, byte[] bytes) throws IOException {
        ContentResolver resolver = context.getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName(fileName));
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Drawary");
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IOException("Could not create the file");
        try {
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IOException("Could not open the file");
                out.write(bytes);
            }
            ContentValues done = new ContentValues();
            done.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, done, null, null);
        } catch (IOException | RuntimeException e) {
            resolver.delete(uri, null, null);
            throw e;
        }
        return PLACE;
    }

    /** Keeps letters, digits and the usual punctuation of a file name; never a path. */
    static String safeName(String name) {
        String n = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (n.length() > 120) n = n.substring(0, 120);
        return n.isEmpty() || n.equals(".") || n.equals("..") ? "drawary" : n;
    }
}
