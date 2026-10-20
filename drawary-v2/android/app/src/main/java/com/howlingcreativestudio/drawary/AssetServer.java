package com.howlingcreativestudio.drawary;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Serves the web app (assets/www/) from the virtual address https://appassets.androidplatform.net/ so the page runs
 * on a secure origin (needed for crypto.subtle, used by the PIN) without any file:// access and without the network.
 * Anything that is not that address is answered with an empty 403: the page cannot reach other servers.
 */
final class AssetServer {
    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/index.html";

    private static final String CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
            + "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; media-src 'self' blob:; "
            + "object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'";

    private final AssetManager assets;
    private String shim;

    AssetServer(AssetManager assets) {
        this.assets = assets;
    }

    static boolean isAppOrigin(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && HOST.equalsIgnoreCase(uri.getHost());
    }

    static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "utf-8", 403, "Blocked", headers(false),
                new ByteArrayInputStream(new byte[0]));
    }

    WebResourceResponse serve(Uri uri) {
        String path = uri.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return notFound();
        try {
            boolean isIndex = path.equals("/index.html");
            InputStream in = assets.open("www" + path, AssetManager.ACCESS_STREAMING);
            if (isIndex) {
                String html = new String(readAll(in), StandardCharsets.UTF_8);
                return new WebResourceResponse("text/html", "utf-8", 200, "OK", headers(true),
                        new ByteArrayInputStream(withShim(html).getBytes(StandardCharsets.UTF_8)));
            }
            String mime = mimeOf(path);
            boolean text = mime.startsWith("text/") || mime.contains("json") || mime.contains("javascript") || mime.contains("xml");
            return new WebResourceResponse(mime, text ? "utf-8" : null, 200, "OK", headers(false), in);
        } catch (IOException e) {
            return notFound();
        }
    }

    private String withShim(String html) throws IOException {
        if (shim == null) shim = new String(readAll(assets.open("native_shim.js")), StandardCharsets.UTF_8);
        int head = html.indexOf("<head");
        int at = head < 0 ? -1 : html.indexOf('>', head);
        String tag = "<script>" + shim + "</script>";
        return at < 0 ? tag + html : html.substring(0, at + 1) + tag + html.substring(at + 1);
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers(false),
                new ByteArrayInputStream(new byte[0]));
    }

    private static Map<String, String> headers(boolean page) {
        Map<String, String> h = new HashMap<>();
        h.put("X-Content-Type-Options", "nosniff");
        if (page) h.put("Content-Security-Policy", CSP);
        return h;
    }

    static byte[] readAll(InputStream in) throws IOException {
        try (InputStream src = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = src.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    static String mimeOf(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        int dot = p.lastIndexOf('.');
        String ext = dot < 0 ? "" : p.substring(dot + 1);
        switch (ext) {
            case "html": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "webp": return "image/webp";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "svg": return "image/svg+xml";
            case "gif": return "image/gif";
            case "ico": return "image/x-icon";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "otf": return "font/otf";
            case "txt": return "text/plain";
            default: return "application/octet-stream";
        }
    }
}
