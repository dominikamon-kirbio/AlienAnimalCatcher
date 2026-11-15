package io.github.dominikamon_kirbio.alienanimalcatcher;

import android.app.Activity;
import android.hardware.input.InputManager;
import android.os.Build;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

public final class GameActivity extends Activity implements InputManager.InputDeviceListener {
    private WebView game;
    private InputManager inputManager;
    private int controllerId = -1;
    private int keyButtons;
    private int hatButtons;
    private float x, y, trigger;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        game = new WebView(this);
        game.setBackgroundColor(0xff100e1c);
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setUserAgentString(settings.getUserAgentString() + " AlienAnimalCatcherAndroid");

        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        game.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }
        });
        setContentView(game);
        game.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                var cutout = insets.getDisplayCutout();
                view.setPadding(cutout.getSafeInsetLeft(), cutout.getSafeInsetTop(),
                        cutout.getSafeInsetRight(), cutout.getSafeInsetBottom());
            } else {
                view.setPadding(0, 0, 0, 0);
            }
            return insets;
        });
        inputManager = getSystemService(InputManager.class);
        inputManager.registerInputDeviceListener(this, null);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::navigateBack);
        }
        game.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        immersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    protected void onPause() {
        if (game != null) {
            resetController();
            game.evaluateJavascript("window.alienAndroid?.suspend()", null);
            game.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
    }

    @Override
    protected void onDestroy() {
        inputManager.unregisterInputDeviceListener(this);
        game.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        navigateBack();
    }

    private void navigateBack() {
        game.evaluateJavascript("window.alienAndroid?.back()", result -> {
            if (!"true".equals(result)) finish();
        });
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int index = gamepadButton(event.getKeyCode());
        if (index < 0 || (!event.isFromSource(InputDevice.SOURCE_GAMEPAD)
                && !event.isFromSource(InputDevice.SOURCE_JOYSTICK)
                && !event.isFromSource(InputDevice.SOURCE_DPAD))) {
            return super.dispatchKeyEvent(event);
        }
        if (event.getAction() == KeyEvent.ACTION_DOWN || event.getAction() == KeyEvent.ACTION_UP) {
            takeController(event.getDeviceId());
            if (event.getAction() == KeyEvent.ACTION_DOWN) keyButtons |= 1 << index;
            else keyButtons &= ~(1 << index);
            sendController();
        }
        return true;
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if (!event.isFromSource(InputDevice.SOURCE_JOYSTICK) || event.getAction() != MotionEvent.ACTION_MOVE)
            return super.dispatchGenericMotionEvent(event);
        takeController(event.getDeviceId());
        x = event.getAxisValue(MotionEvent.AXIS_X);
        y = event.getAxisValue(MotionEvent.AXIS_Y);
        trigger = Math.max(event.getAxisValue(MotionEvent.AXIS_RTRIGGER), event.getAxisValue(MotionEvent.AXIS_GAS));
        float horizontal = event.getAxisValue(MotionEvent.AXIS_HAT_X);
        float vertical = event.getAxisValue(MotionEvent.AXIS_HAT_Y);
        hatButtons = (horizontal < -.5f ? 1 << 14 : horizontal > .5f ? 1 << 15 : 0)
                | (vertical < -.5f ? 1 << 12 : vertical > .5f ? 1 << 13 : 0);
        sendController();
        return true;
    }

    private void takeController(int deviceId) {
        if (controllerId != deviceId) {
            resetController();
            controllerId = deviceId;
        }
    }

    private void resetController() {
        controllerId = -1;
        keyButtons = hatButtons = 0;
        x = y = trigger = 0;
    }

    private void sendController() {
        game.evaluateJavascript("window.alienAndroid?.controller(" + x + "," + y + ","
                + (keyButtons | hatButtons) + "," + trigger + ")", null);
    }

    private int gamepadButton(int key) {
        return switch (key) {
            case KeyEvent.KEYCODE_BUTTON_A -> 0;
            case KeyEvent.KEYCODE_BUTTON_B -> 1;
            case KeyEvent.KEYCODE_BUTTON_X -> 2;
            case KeyEvent.KEYCODE_BUTTON_Y -> 3;
            case KeyEvent.KEYCODE_BUTTON_R1 -> 5;
            case KeyEvent.KEYCODE_BUTTON_R2 -> 7;
            case KeyEvent.KEYCODE_BUTTON_START -> 9;
            case KeyEvent.KEYCODE_DPAD_UP -> 12;
            case KeyEvent.KEYCODE_DPAD_DOWN -> 13;
            case KeyEvent.KEYCODE_DPAD_LEFT -> 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT -> 15;
            default -> -1;
        };
    }

    @Override public void onInputDeviceAdded(int deviceId) {}
    @Override public void onInputDeviceChanged(int deviceId) {}

    @Override
    public void onInputDeviceRemoved(int deviceId) {
        if (deviceId == controllerId) {
            resetController();
            game.evaluateJavascript("window.alienAndroid?.disconnect()", null);
        }
    }
}
