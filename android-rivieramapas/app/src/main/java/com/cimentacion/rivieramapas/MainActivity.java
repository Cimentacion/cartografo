package com.cimentacion.rivieramapas;

import android.app.Activity;
import android.content.ContentValues;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

// EDITOR DE MAPAS de Riviera Cop. Es el mismo juego por dentro (para poder probar los mapas tal cual),
// pero arranca en mapas.html. Se actualiza solo con el mismo "pack" del juego (game.zip de GitHub).
public class MainActivity extends Activity {
    private static final String HOST = "rivieramapas.app.local";
    private static final String PACKV_URL = "https://github.com/Cimentacion/cartografo/releases/download/rivieracop/pack.txt";
    private static final String PACK_URL = "https://github.com/Cimentacion/cartografo/releases/download/rivieracop/game.zip";
    private WebView web;
    private volatile boolean packBusy = false;
    private boolean checked = false;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.setStatusBarColor(Color.BLACK);
        w.setNavigationBarColor(Color.BLACK);
        if (Build.VERSION.SDK_INT >= 28) w.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        web.addJavascriptInterface(new Bridge(), "RCMaps");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                if (!checked) { checked = true; v.postDelayed(MainActivity.this::checkPack, 1500); }
            }
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if (!HOST.equals(r.getUrl().getHost())) return null;
                String path = r.getUrl().getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/mapas.html";
                try {
                    File pf = new File(packDir(), path.substring(1));
                    InputStream in = packOk() && pf.isFile() && pf.getCanonicalPath().startsWith(packDir().getCanonicalPath()) ? new FileInputStream(pf) : getAssets().open("game" + path);
                    Map<String, String> h = new HashMap<>();
                    h.put("Access-Control-Allow-Origin", "*");
                    h.put("Cache-Control", "no-cache");
                    return new WebResourceResponse(mime(path), "utf-8", 200, "OK", h, in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(), null);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest req) { req.deny(); }
        });
        setContentView(web);
        immersive();
        if (b != null) web.restoreState(b);
        else web.loadUrl("https://" + HOST + "/mapas.html");
    }

    private void js(String code) { runOnUiThread(() -> { try { web.evaluateJavascript(code, null); } catch (Throwable t) { } }); }

    class Bridge {
        // guarda el mapa como archivo en Descargas (para tener copia fuera de la app)
        @JavascriptInterface public boolean saveFile(String name, String text) {
            try {
                String safe = name.replaceAll("[\\\\/:*?\"<>|]", "_");
                byte[] data = text.getBytes(StandardCharsets.UTF_8);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                    v.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/RivieraMapas");
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (u == null) return false;
                    try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(data); }
                } else {
                    File dir = new File(getExternalFilesDir(null), "RivieraMapas"); dir.mkdirs();
                    try (FileOutputStream o = new FileOutputStream(new File(dir, safe))) { o.write(data); }
                }
                return true;
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public int pack() { return curPack(); }
        @JavascriptInterface public void reloadGame() { runOnUiThread(() -> web.reload()); }
    }

    // ---------- packs del juego (se actualiza solo, como el juego) ----------
    private File packDir() { return new File(getFilesDir(), "pack"); }
    private int assetInt(String name) {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(getAssets().open(name)))) { return Integer.parseInt(r.readLine().trim()); } catch (Exception e) { return 0; }
    }
    private int filePack() { return getSharedPreferences("rcm", MODE_PRIVATE).getInt("pack", 0); }
    private boolean packOk() { return filePack() > assetInt("game/pack.txt") && new File(packDir(), "mapas.html").isFile(); }
    private int curPack() { return Math.max(filePack(), assetInt("game/pack.txt")); }
    private static int readInt(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url + "?t=" + System.currentTimeMillis()).openConnection();
        c.setInstanceFollowRedirects(true); c.setConnectTimeout(8000); c.setReadTimeout(8000);
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()))) { return Integer.parseInt(r.readLine().trim()); }
    }
    private void checkPack() {
        packBusy = true;
        new Thread(() -> {
            try {
                int remote = readInt(PACKV_URL);
                if (remote <= curPack()) return;
                File tmp = new File(getFilesDir(), "pack_new"), old = new File(getFilesDir(), "pack_old");
                del(tmp); del(old);
                HttpURLConnection c = (HttpURLConnection) new URL(PACK_URL + "?t=" + System.currentTimeMillis()).openConnection();
                c.setInstanceFollowRedirects(true); c.setConnectTimeout(15000); c.setReadTimeout(30000);
                String root = tmp.getCanonicalPath();
                try (ZipInputStream z = new ZipInputStream(c.getInputStream())) {
                    ZipEntry e; byte[] buf = new byte[65536];
                    while ((e = z.getNextEntry()) != null) {
                        File f = new File(tmp, e.getName());
                        if (!f.getCanonicalPath().startsWith(root)) continue;
                        if (e.isDirectory()) { f.mkdirs(); continue; }
                        f.getParentFile().mkdirs();
                        try (FileOutputStream o = new FileOutputStream(f)) { int n; while ((n = z.read(buf)) > 0) o.write(buf, 0, n); }
                    }
                }
                if (!new File(tmp, "mapas.html").isFile()) throw new Exception("pack incompleto");
                File cur = packDir();
                if (cur.exists() && !cur.renameTo(old)) del(cur);
                if (!tmp.renameTo(cur)) throw new Exception("no se pudo instalar");
                del(old);
                getSharedPreferences("rcm", MODE_PRIVATE).edit().putInt("pack", remote).apply();
                js("window.rcPack&&window.rcPack('done'," + remote + ")");
            } catch (Exception e) { }
            packBusy = false;
        }).start();
    }
    private static void del(File f) {
        if (!f.exists()) return;
        File[] l = f.listFiles();
        if (l != null) for (File x : l) del(x);
        f.delete();
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg")) return "image/jpeg";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".ogg")) return "audio/ogg";
        return "application/octet-stream";
    }
    private void immersive() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
