package com.howlingcreativestudio.drawary;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Locale;

/**
 * Lets the mail app read the one screenshot that goes with a feedback mail (read-only, only files in cache/feedback/,
 * and only for apps the send intent explicitly grants).
 */
public class AttachmentProvider extends ContentProvider {
    static final String DIR = "feedback";

    static Uri uriFor(Context context, File file) {
        return new Uri.Builder().scheme("content").authority(context.getPackageName() + ".attachments")
                .appendPath(DIR).appendPath(file.getName()).build();
    }

    static File dir(Context context) {
        File d = new File(context.getCacheDir(), DIR);
        if (!d.exists()) d.mkdirs();
        return d;
    }

    private File resolve(Uri uri) throws FileNotFoundException {
        java.util.List<String> segments = uri.getPathSegments();
        if (segments.size() != 2 || !DIR.equals(segments.get(0))) throw new FileNotFoundException();
        try {
            File base = dir(getContext()).getCanonicalFile();
            File file = new File(base, segments.get(1)).getCanonicalFile();
            if (!base.equals(file.getParentFile()) || !file.isFile()) throw new FileNotFoundException();
            return file;
        } catch (IOException e) {
            throw new FileNotFoundException();
        }
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new SecurityException("read only");
        return ParcelFileDescriptor.open(resolve(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        try {
            File file = resolve(uri);
            MatrixCursor cursor = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
            cursor.addRow(new Object[]{file.getName(), file.length()});
            return cursor;
        } catch (FileNotFoundException e) {
            return null;
        }
    }

    @Override
    public String getType(Uri uri) {
        String name = uri.getLastPathSegment() == null ? "" : uri.getLastPathSegment().toLowerCase(Locale.ROOT);
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    @Override public boolean onCreate() { return true; }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { throw new UnsupportedOperationException(); }
}
