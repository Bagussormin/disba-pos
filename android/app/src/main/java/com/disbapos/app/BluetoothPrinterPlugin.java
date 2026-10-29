package com.disbapos.app;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(alias = "bluetoothConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT })
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void print(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {
            requestPermissionForAlias("bluetoothConnect", call, "bluetoothPermissionCallback");
            return;
        }
        choosePrinterAndPrint(call);
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {
            call.reject("Izin Bluetooth diperlukan untuk mencetak. Izinkan DISBA POS mengakses perangkat Bluetooth.");
            return;
        }
        choosePrinterAndPrint(call);
    }

    private void choosePrinterAndPrint(PluginCall call) {
        Context context = getContext();
        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = manager != null ? manager.getAdapter() : BluetoothAdapter.getDefaultAdapter();

        if (adapter == null) {
            call.reject("Perangkat ini tidak mendukung Bluetooth.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Aktifkan Bluetooth tablet terlebih dahulu.");
            return;
        }

        try {
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            if (bonded == null || bonded.isEmpty()) {
                call.reject("Belum ada printer/perangkat Bluetooth yang dipasangkan di pengaturan Android.");
                return;
            }

            List<BluetoothDevice> devices = new ArrayList<>(bonded);
            String[] labels = new String[devices.size()];
            for (int i = 0; i < devices.size(); i++) {
                BluetoothDevice device = devices.get(i);
                String name = device.getName();
                labels[i] = (name == null || name.trim().isEmpty() ? "Printer Bluetooth" : name)
                    + " (" + device.getAddress() + ")";
            }

            getActivity().runOnUiThread(() -> new AlertDialog.Builder(getActivity())
                .setTitle("Pilih Printer Bluetooth")
                .setItems(labels, (dialog, which) -> printToDevice(call, devices.get(which)))
                .setNegativeButton("Batal", (dialog, which) -> call.reject("Cetak dibatalkan."))
                .setOnCancelListener(dialog -> call.reject("Pemilihan printer dibatalkan."))
                .show());
        } catch (SecurityException e) {
            call.reject("Izin Bluetooth belum diberikan.", e);
        }
    }

    private void printToDevice(PluginCall call, BluetoothDevice device) {
        JSArray blocks = call.getArray("content");
        if (blocks == null) {
            call.reject("Konten struk tidak tersedia.");
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                OutputStream out = socket.getOutputStream();
                out.write(new byte[] { 0x1B, 0x40 }); // ESC @ initialize

                for (int i = 0; i < blocks.length(); i++) {
                    JSONObject block = blocks.getJSONObject(i);
                    String type = block.optString("type", "text");

                    if ("divider".equals(type)) {
                        out.write(new byte[] { 0x1B, 0x61, 0x00 });
                        out.write("--------------------------------\n".getBytes(StandardCharsets.UTF_8));
                    } else if ("feed".equals(type)) {
                        int lines = Math.max(1, Math.min(8, block.optInt("lines", 3)));
                        for (int j = 0; j < lines; j++) out.write(0x0A);
                    } else {
                        String align = block.optString("align", "left");
                        byte alignByte = "center".equalsIgnoreCase(align) ? (byte) 1
                            : "right".equalsIgnoreCase(align) ? (byte) 2 : (byte) 0;
                        out.write(new byte[] { 0x1B, 0x61, alignByte });
                        boolean bold = block.optBoolean("bold", false);
                        out.write(new byte[] { 0x1B, 0x45, (byte) (bold ? 1 : 0) });
                        String size = block.optString("size", "normal");
                        out.write(new byte[] { 0x1D, 0x21, (byte) ("large".equalsIgnoreCase(size) ? 0x11 : 0x00) });
                        String text = block.optString("text", "");
                        out.write(text.getBytes(StandardCharsets.UTF_8));
                        out.write(0x0A);
                        out.write(new byte[] { 0x1B, 0x45, 0x00, 0x1D, 0x21, 0x00 });
                    }
                }

                out.write(new byte[] { 0x1B, 0x61, 0x00, 0x0A, 0x0A, 0x0A });
                out.flush();
                socket.close();

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Struk dikirim langsung ke printer Bluetooth.");
                call.resolve(result);
            } catch (Exception e) {
                try { if (socket != null) socket.close(); } catch (Exception ignored) {}
                call.reject("Gagal mencetak via Bluetooth: " + e.getMessage(), e);
            }
        }).start();
    }
}
