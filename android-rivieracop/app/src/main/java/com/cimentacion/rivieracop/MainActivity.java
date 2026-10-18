package com.cimentacion.rivieracop;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.HashMap;
import java.util.Map;

// El juego va dentro de la app (no necesita githack ni ninguna web).
// Se sirve desde un origen https falso para que funcionen los módulos JS, los sensores y WebRTC.
public class MainActivity extends Activity {
    private static final String HOST = "rivieracop.app.local";
    // ANUNCIOS: identificadores de la cuenta de AdMob del dueño del juego.
    // (el ID de aplicación va en AndroidManifest.xml)
    private static final String REWARDED_ID = "ca-app-pub-8476753448483324/9135966364";
    private static final String INTER_ID = "ca-app-pub-8476753448483324/3461712711";
    // ACTUALIZACIONES: número de compilación de la última versión publicada en GitHub
    // La app solo hay que reinstalarla si cambia la parte de Android (native.txt). El juego en sí (html, js, texturas)
    // se descarga como "pack" (game.zip) y se instala solo, sin pasar por el instalador de Android.
    private static final String VERSION_URL = "https://github.com/Cimentacion/cartografo/releases/download/rivieracop/native.txt";
    private static final String PACKV_URL = "https://github.com/Cimentacion/cartografo/releases/download/rivieracop/pack.txt";
    private static final String PACK_URL = "https://github.com/Cimentacion/cartografo/releases/download/rivieracop/game.zip";
    private static final String APK_URL = "https://github.com/Cimentacion/cartografo/releases/download/rivieracop/rivieracop.apk";
    private WebView web;
    private RewardedAd rewarded; private InterstitialAd inter;
    private volatile boolean packBusy = false;
    private boolean wantRewarded = false, earned = false, checked = false, updating = false;

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

        web.addJavascriptInterface(new Bridge(), "RCApp");
        try { MobileAds.initialize(this, st -> { loadRewarded(); loadInter(); }); } catch (Throwable t) { }
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                if (!checked) { checked = true; v.postDelayed(MainActivity.this::checkUpdate, 2500); v.postDelayed(MainActivity.this::checkPack, 1500); }
            }
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if (!HOST.equals(r.getUrl().getHost())) return null;
                String path = r.getUrl().getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
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
        else web.loadUrl("https://" + HOST + "/index.html");
    }

    // ---------- puente con el juego ----------
    private void js(String code) { runOnUiThread(() -> { try { web.evaluateJavascript(code, null); } catch (Throwable t) { } }); }
    class Bridge {
        @JavascriptInterface public void showRewarded() { runOnUiThread(MainActivity.this::doRewarded); }
        @JavascriptInterface public void showInterstitial() { runOnUiThread(MainActivity.this::doInter); }
        @JavascriptInterface public int version() { return myVersion(); }
        @JavascriptInterface public void update() { runOnUiThread(MainActivity.this::startUpdate); }
        @JavascriptInterface public int pack() { return curPack(); }
        @JavascriptInterface public void checkNow() { if (!packBusy) checkPack(); }
        @JavascriptInterface public void reloadGame() { runOnUiThread(() -> web.reload()); }
    }

    // ---------- anuncios (AdMob) ----------
    private void loadRewarded() {
        try {
            RewardedAd.load(this, REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
                @Override public void onAdLoaded(RewardedAd ad) { rewarded = ad; if (wantRewarded) doRewarded(); }
                @Override public void onAdFailedToLoad(LoadAdError e) { rewarded = null; if (wantRewarded) { wantRewarded = false; js("window.rcAdDone&&window.rcAdDone(false," + org.json.JSONObject.quote(e.getCode() + ": " + e.getMessage()) + ")"); } }
            });
        } catch (Throwable t) { }
    }
    private void doRewarded() {
        if (rewarded == null) { wantRewarded = true; loadRewarded(); return; }
        wantRewarded = false; earned = false;
        RewardedAd ad = rewarded; rewarded = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { js("window.rcAdDone&&window.rcAdDone(" + earned + ")"); loadRewarded(); immersive(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError e) { js("window.rcAdDone&&window.rcAdDone(false," + org.json.JSONObject.quote(e.getCode() + ": " + e.getMessage()) + ")"); loadRewarded(); }
        });
        ad.show(this, item -> earned = true);
    }
    private void loadInter() {
        try {
            InterstitialAd.load(this, INTER_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
                @Override public void onAdLoaded(InterstitialAd ad) { inter = ad; }
                @Override public void onAdFailedToLoad(LoadAdError e) { inter = null; }
            });
        } catch (Throwable t) { }
    }
    private void doInter() {
        if (inter == null) { loadInter(); return; }
        InterstitialAd ad = inter; inter = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { loadInter(); immersive(); }
        });
        ad.show(this);
    }

    // ---------- packs del juego (actualización sin reinstalar) ----------
    private File packDir() { return new File(getFilesDir(), "pack"); }
    private int assetInt(String name) {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(getAssets().open(name)))) { return Integer.parseInt(r.readLine().trim()); } catch (Exception e) { return 0; }
    }
    private int filePack() { return getSharedPreferences("rc", MODE_PRIVATE).getInt("pack", 0); }
    // el pack descargado solo vale si es más nuevo que el juego que trae la propia app
    private boolean packOk() { return filePack() > assetInt("game/pack.txt") && new File(packDir(), "index.html").isFile(); }
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
                js("window.rcPack&&window.rcPack('start'," + remote + ")");
                File tmp = new File(getFilesDir(), "pack_new"), old = new File(getFilesDir(), "pack_old");
                del(tmp); del(old);
                HttpURLConnection c = (HttpURLConnection) new URL(PACK_URL + "?t=" + System.currentTimeMillis()).openConnection();
                c.setInstanceFollowRedirects(true); c.setConnectTimeout(15000); c.setReadTimeout(30000);
                long total = c.getContentLengthLong(), done = 0; int last = -1;
                String root = tmp.getCanonicalPath();
                try (ZipInputStream z = new ZipInputStream(c.getInputStream())) {
                    ZipEntry e; byte[] buf = new byte[65536];
                    while ((e = z.getNextEntry()) != null) {
                        File f = new File(tmp, e.getName());
                        if (!f.getCanonicalPath().startsWith(root)) continue; // nada fuera de la carpeta
                        if (e.isDirectory()) { f.mkdirs(); continue; }
                        f.getParentFile().mkdirs();
                        try (FileOutputStream o = new FileOutputStream(f)) {
                            int n;
                            while ((n = z.read(buf)) > 0) { o.write(buf, 0, n); done += n; }
                        }
                        int pct = total > 0 ? (int) Math.min(99, done * 100 / (total * 2)) : -1;
                        if (pct / 10 != last) { last = pct / 10; js("window.rcPack&&window.rcPack('prog'," + pct + ")"); }
                    }
                }
                if (!new File(tmp, "index.html").isFile()) throw new Exception("pack incompleto");
                File cur = packDir();
                if (cur.exists() && !cur.renameTo(old)) del(cur);
                if (!tmp.renameTo(cur)) throw new Exception("no se pudo instalar");
                del(old);
                getSharedPreferences("rc", MODE_PRIVATE).edit().putInt("pack", remote).apply();
                js("window.rcPack&&window.rcPack('done'," + remote + ")");
            } catch (Exception e) {
                js("window.rcPack&&window.rcPack('err',0)");
            }
            packBusy = false;
        }).start();
    }
    private static void del(File f) {
        if (!f.exists()) return;
        File[] l = f.listFiles();
        if (l != null) for (File x : l) del(x);
        f.delete();
    }

    // ---------- actualizador de la app (solo cuando cambia la parte de Android) ----------
    private int myVersion() { return assetInt("native.txt"); }
    private void checkUpdate() {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(VERSION_URL + "?t=" + System.currentTimeMillis()).openConnection();
                c.setInstanceFollowRedirects(true); c.setConnectTimeout(8000); c.setReadTimeout(8000);
                BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()));
                int remote = Integer.parseInt(r.readLine().trim());
                r.close();
                if (remote > myVersion()) js("window.rcUpdate&&window.rcUpdate(" + remote + "," + myVersion() + ")");
            } catch (Exception e) { }
        }).start();
    }
    private void startUpdate() {
        if (updating) return;
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            js("window.rcUpdateMsg&&window.rcUpdateMsg('perm')");
            try { startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()))); } catch (Exception e) { }
            return;
        }
        updating = true;
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(APK_URL).openConnection();
                c.setInstanceFollowRedirects(true); c.setConnectTimeout(15000); c.setReadTimeout(30000);
                long total = c.getContentLengthLong();
                PackageInstaller pi = getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams sp = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                int id = pi.createSession(sp);
                PackageInstaller.Session ses = pi.openSession(id);
                try (InputStream in = c.getInputStream(); OutputStream out = ses.openWrite("rivieracop", 0, total > 0 ? total : -1)) {
                    byte[] buf = new byte[65536]; long done = 0; int n, last = -1;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n); done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        if (pct != last && pct % 5 == 0) { last = pct; js("window.rcUpdateMsg&&window.rcUpdateMsg('prog'," + pct + ")"); }
                    }
                    ses.fsync(out);
                }
                Intent i = new Intent(this, MainActivity.class).setAction("RC_INSTALL");
                PendingIntent p = PendingIntent.getActivity(this, 7, i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
                ses.commit(p.getIntentSender());
                ses.close();
                js("window.rcUpdateMsg&&window.rcUpdateMsg('install')");
            } catch (Exception e) {
                js("window.rcUpdateMsg&&window.rcUpdateMsg('err')");
            }
            updating = false;
        }).start();
    }
    @Override
    protected void onNewIntent(Intent it) {
        super.onNewIntent(it);
        if (!"RC_INSTALL".equals(it.getAction())) return;
        int st = it.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = it.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) { confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(confirm); }
        } else if (st != PackageInstaller.STATUS_SUCCESS) js("window.rcUpdateMsg&&window.rcUpdateMsg('err')");
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg")) return "image/jpeg";
        return "application/octet-stream";
    }

    private void immersive() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override
    public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override
    protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override
    protected void onPause() { super.onPause(); web.onPause(); }
    @Override
    protected void onResume() { super.onResume(); web.onResume(); }
    @Override
    public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
