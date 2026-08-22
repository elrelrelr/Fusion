package app.fusion.social;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Fusion — actividad principal.
 * Extiende el cliente de Capacitor (no lo reemplaza) para conceder el
 * micrófono al WebView sin romper el selector de archivos ni el puente JS.
 */
public class MainActivity extends BridgeActivity {

    private static final int REQ_MIC = 4201;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            }

            getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        for (String res : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                                    || PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                                request.grant(request.getResources());
                                return;
                            }
                        }
                        super_onPermissionRequest(request);
                    });
                }

                private void super_onPermissionRequest(PermissionRequest request) {
                    request.deny();
                }
            });
        } catch (Throwable t) {
            // Nunca dejar la app en negro por un extra opcional.
            android.util.Log.e("Fusion", "no se pudo configurar el WebChromeClient", t);
        }
    }
}
