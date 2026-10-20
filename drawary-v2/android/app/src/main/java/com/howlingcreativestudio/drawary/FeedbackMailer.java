package com.howlingcreativestudio.drawary;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * "피드백 보내기": opens the person's mail app with the message already written (they read it and press send).
 * The address comes from the build (BuildConfig.FEEDBACK_EMAIL); while it is empty the share sheet opens instead.
 */
final class FeedbackMailer {
    private FeedbackMailer() {}

    /** True when a mail/share screen was opened, false when nothing on the phone could take it. */
    static boolean send(Context context, String json) throws JSONException, IOException {
        JSONObject f = new JSONObject(json);
        String type = f.optString("type");
        String message = f.optString("message");
        String reply = f.optString("email");
        String to = BuildConfig.FEEDBACK_EMAIL;

        StringBuilder body = new StringBuilder();
        body.append("[").append(type).append("]\n\n").append(message).append("\n\n---\n");
        if (!reply.isEmpty()) body.append("Reply to: ").append(reply).append('\n');
        body.append("Drawary ").append(BuildConfig.VERSION_NAME)
                .append(" / Android ").append(Build.VERSION.RELEASE)
                .append(" / ").append(Build.MANUFACTURER).append(' ').append(Build.MODEL);
        String subject = context.getString(R.string.feedback_subject);

        Uri attachment = null;
        String attachmentBase64 = f.optString("attachmentBase64");
        if (!attachmentBase64.isEmpty()) {
            File dir = AttachmentProvider.dir(context);
            File[] old = dir.listFiles();
            if (old != null) for (File o : old) o.delete();
            File file = new File(dir, FileSaver.safeName(f.optString("attachmentName", "screenshot.png")));
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(Base64.decode(attachmentBase64, Base64.DEFAULT));
            }
            attachment = AttachmentProvider.uriFor(context, file);
        }

        Intent intent;
        if (attachment == null && !to.isEmpty()) {
            intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"));
        } else {
            intent = new Intent(Intent.ACTION_SEND);
            intent.setType(attachment != null ? f.optString("attachmentMime", "image/png") : "text/plain");
            if (attachment != null) {
                intent.putExtra(Intent.EXTRA_STREAM, attachment);
                intent.setClipData(ClipData.newRawUri("", attachment));
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
        }
        if (!to.isEmpty()) intent.putExtra(Intent.EXTRA_EMAIL, new String[]{to});
        intent.putExtra(Intent.EXTRA_SUBJECT, subject);
        intent.putExtra(Intent.EXTRA_TEXT, body.toString());

        Intent chooser = Intent.createChooser(intent, context.getString(R.string.feedback_chooser));
        try {
            context.startActivity(chooser);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }
}
