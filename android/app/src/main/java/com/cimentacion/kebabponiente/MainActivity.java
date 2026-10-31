package com.cimentacion.kebabponiente;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/* El juego va dentro (assets/game), pero al abrir mira si hay una versión más nueva publicada en GitHub
   y la descarga: así la APK se actualiza sola cada vez que se cambia el juego, sin reinstalar. */
public class MainActivity extends Activity {
    private static final String BASE = "https://github.com/Cimentacion/cartografo/releases/download/kebab/";
    private WebView web;
    private int curVer = 0;
    private long lastCheck = 0;
    private volatile boolean checking = false;

    private SharedPreferences prefs() { return getSharedPreferences("kp", MODE_PRIVATE); }
    private File updFile() { return new File(getFilesDir(), "game.html"); }
    private int bundledVer() {
        try (InputStream in = getAssets().open("game/version.txt")) {
            return Integer.parseInt(new BufferedReader(new InputStreamReader(in)).readLine().trim());
        } catch (Exception e) { return 0; }
    }
    private void loadGame() {
        int b = bundledVer(), u = prefs().getInt("upd_ver", 0);
        if (u > b && updFile().length() > 500000) { curVer = u; web.loadUrl("file://" + updFile().getAbsolutePath()); }
        else { curVer = b; web.loadUrl("file:///android_asset/game/index.html"); }
    }
    private static String fetchText(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true); c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setUseCaches(false);
        try (InputStream in = c.getInputStream()) { return new BufferedReader(new InputStreamReader(in)).readLine().trim(); }
        finally { c.disconnect(); }
    }
    private void checkUpdate() {
        long now = System.currentTimeMillis();
        if (checking || now - lastCheck < 5 * 60 * 1000) return;
        lastCheck = now; checking = true;
        new Thread(() -> {
            try {
                int remote = Integer.parseInt(fetchText(BASE + "version.txt?t=" + System.currentTimeMillis()));
                int have = Math.max(curVer, prefs().getInt("upd_ver", 0));
                if (remote > have) {
                    File tmp = new File(getFilesDir(), "game.tmp");
                    HttpURLConnection c = (HttpURLConnection) new URL(BASE + "kebab-poniente.html").openConnection();
                    c.setInstanceFollowRedirects(true); c.setConnectTimeout(10000); c.setReadTimeout(30000);
                    try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
                        byte[] buf = new byte[65536]; int n; while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    } finally { c.disconnect(); }
                    if (tmp.length() > 500000 && tmp.renameTo(updFile())) {
                        prefs().edit().putInt("upd_ver", remote).apply();
                        runOnUiThread(() -> web.evaluateJavascript("try{KP_updateReady()}catch(e){}", null));
                    } else tmp.delete();
                } else if (remote > curVer && prefs().getInt("upd_ver", 0) > curVer) {
                    runOnUiThread(() -> web.evaluateJavascript("try{KP_updateReady()}catch(e){}", null));
                }
            } catch (Exception e) { /* sin red: seguimos con lo que hay */ }
            checking = false;
        }).start();
    }

    public class Bridge {
        @JavascriptInterface public void share(String text) {
            Intent i = new Intent(Intent.ACTION_SEND); i.setType("text/plain"); i.putExtra(Intent.EXTRA_TEXT, text);
            runOnUiThread(() -> startActivity(Intent.createChooser(i, "Enviar sugerencias")));
        }
        @JavascriptInterface public void applyUpdate() { runOnUiThread(() -> loadGame()); }
        @JavascriptInterface public int version() { return curVer; }
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.setStatusBarColor(Color.BLACK);
        w.setNavigationBarColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#06070a"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        s.setSupportZoom(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest r) { r.deny(); }
        });
        web.addJavascriptInterface(new Bridge(), "KPAndroid");
        setContentView(web);
        hideBars();
        if (b != null) { web.restoreState(b); curVer = b.getInt("cur_ver", 0); }
        else loadGame();
        checkUpdate();
    }

    private void hideBars() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideBars(); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); o.putInt("cur_ver", curVer); }
    @Override protected void onPause() { super.onPause(); web.evaluateJavascript("try{setPause(true)}catch(e){}", null); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); hideBars(); checkUpdate(); }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){try{if(overlay==='pause'){return 'exit'}setPause(true);return overlay==='pause'?'paused':'exit'}catch(e){return 'exit'}})()", v -> { if (v == null || v.contains("exit")) finish(); });
    }
}
