package com.cimentacion.vida;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

// TODA UNA VIDA. La app lleva el juego dentro (assets/index.html) y, cada vez que se abre,
// se baja la última versión de vida/index.html del repo. Si ha cambiado, la guarda y recarga.
// Todo se carga con la misma dirección base para que la partida guardada no se pierda al actualizar.
public class MainActivity extends Activity {
    private static final String JUEGO_URL = "https://raw.githubusercontent.com/Cimentacion/cartografo/main/vida/index.html";
    private static final String BASE = "https://todaunavida.app.local/";
    private WebView web;
    private String actual = "";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#EFE9D8"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Puente(), "AndroidApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (u.toString().startsWith(BASE)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }
        });
        setContentView(web);
        pantallaCompleta();

        actual = leerLocal();
        cargar(actual);
        new Thread(() -> {
            final String nuevo = descargar();
            if (nuevo == null || !nuevo.contains("</html>") || nuevo.equals(actual)) return;
            guardar(nuevo);
            runOnUiThread(() -> { actual = nuevo; cargar(nuevo); });
        }).start();
    }

    private void cargar(String html) {
        web.loadDataWithBaseURL(BASE, html, "text/html", "UTF-8", null);
    }

    private File copia() { return new File(getFilesDir(), "index.html"); }

    // La copia descargada manda, salvo que el APK instalado sea más nuevo que ella.
    private String leerLocal() {
        try {
            File f = copia();
            long apk = getPackageManager().getPackageInfo(getPackageName(), 0).lastUpdateTime;
            if (f.exists() && f.lastModified() > apk) return leer(new FileInputStream(f));
        } catch (Exception e) { }
        try { return leer(getAssets().open("index.html")); } catch (Exception e) { return "<html><body>No se pudo cargar el juego.</body></html>"; }
    }

    private String leer(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
        in.close();
        return new String(o.toByteArray(), StandardCharsets.UTF_8);
    }

    private String descargar() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(JUEGO_URL + "?t=" + System.currentTimeMillis()).openConnection();
            c.setConnectTimeout(6000);
            c.setReadTimeout(10000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            return leer(c.getInputStream());
        } catch (Exception e) { return null; }
    }

    private void guardar(String html) {
        try {
            File tmp = new File(getFilesDir(), "index.tmp");
            FileOutputStream o = new FileOutputStream(tmp);
            o.write(html.getBytes(StandardCharsets.UTF_8));
            o.close();
            tmp.renameTo(copia());
        } catch (Exception e) { }
    }

    private void pantallaCompleta() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override
    public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) pantallaCompleta();
    }

    @Override
    public void onBackPressed() {
        // Atrás: cierra la hoja de opciones si está abierta; si no, manda la app al fondo
        web.evaluateJavascript("(window.__atras?window.__atras():0)", r -> { if (!"1".equals(r)) moveTaskToBack(true); });
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }

    public class Puente {
        @JavascriptInterface public boolean app() { return true; }
    }
}
