package com.cimentacion.cartografo;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int PICK = 7;
    private WebView web;
    private ValueCallback<Uri[]> pending;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#13181a"));
        w.setNavigationBarColor(Color.parseColor("#13181a"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#13181a"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setBuiltInZoomControls(false);

        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pending != null) pending.onReceiveValue(null);
                pending = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Abrir mapa"), PICK);
                } catch (Exception e) {
                    pending = null;
                    return false;
                }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(web);
        if (b != null) web.restoreState(b);
        else web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK && pending != null) {
            Uri[] r = null;
            if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
            pending.onReceiveValue(r);
            pending = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle o) {
        super.onSaveInstanceState(o);
        web.saveState(o);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void toast(final String m) {
        runOnUiThread(() -> Toast.makeText(this, m, Toast.LENGTH_SHORT).show());
    }

    class Bridge {
        @JavascriptInterface
        public String saveFile(String name, String mime, String b64) {
            try {
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                String where;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentResolver cr = getContentResolver();
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Cartografo");
                    Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (u == null) throw new Exception("sin acceso a Descargas");
                    try (OutputStream os = cr.openOutputStream(u)) { os.write(bytes); }
                    where = "Descargas/Cartografo/" + name;
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Cartografo");
                    if (!dir.exists() && !dir.mkdirs()) dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    File f = new File(dir, name);
                    try (FileOutputStream fo = new FileOutputStream(f)) { fo.write(bytes); }
                    where = f.getAbsolutePath();
                }
                toast("Guardado en " + where);
                return "guardado · " + where;
            } catch (Exception e) {
                toast("Error al guardar: " + e.getMessage());
                return "error al guardar";
            }
        }

        @JavascriptInterface
        public void copy(String t) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("tabla", t));
                Toast.makeText(MainActivity.this, "Copiado", Toast.LENGTH_SHORT).show();
            });
        }
    }
}
