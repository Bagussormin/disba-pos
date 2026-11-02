
package com.disbapos.app;

import android.Manifest;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.io.OutputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "bluetoothConnect",
            strings = { Manifest.permission.BLUETOOTH_CONNECT }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "DISBA_BT";

    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void print(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {

            requestPermissionForAlias(
                "bluetoothConnect",
                call,
                "bluetoothPermissionCallback"
            );
            return;
        }

        choosePrinterAndPrint(call);
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && getPermissionState("bluetoothConnect") != PermissionState.GRANTED) {

            call.reject("Izin Bluetooth diperlukan untuk mencetak.");
            return;
        }

        choosePrinterAndPrint(call);
    }

    private void choosePrinterAndPrint(PluginCall call) {
        Context context = getContext();

        BluetoothManager manager =
            (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);

        BluetoothAdapter adapter = manager != null
            ? manager.getAdapter()
            : BluetoothAdapter.getDefaultAdapter();

        if (adapter == null) {
            call.reject("Perangkat ini tidak mendukung Bluetooth.");
            return;
        }

        try {
            if (!adapter.isEnabled()) {
                call.reject("Aktifkan Bluetooth tablet terlebih dahulu.");
                return;
            }

            Set<BluetoothDevice> bonded = adapter.getBondedDevices();

            if (bonded == null || bonded.isEmpty()) {
                call.reject("Belum ada printer Bluetooth yang dipasangkan.");
                return;
            }

            List<BluetoothDevice> devices = new ArrayList<>(bonded);
            String[] labels = new String[devices.size()];

            for (int i = 0; i < devices.size(); i++) {
                BluetoothDevice device = devices.get(i);
                String name = device.getName();

                labels[i] =
                    (name == null || name.trim().isEmpty()
                        ? "Printer Bluetooth"
                        : name)
                    + " (" + device.getAddress() + ")";
            }

            getActivity().runOnUiThread(() ->
                new AlertDialog.Builder(getActivity())
                    .setTitle("Pilih Printer Bluetooth")
                    .setItems(labels, (dialog, which) ->
                        printToDevice(call, devices.get(which))
                    )
                    .setNegativeButton("Batal", (dialog, which) ->
                        call.reject("Cetak dibatalkan.")
                    )
                    .setOnCancelListener(dialog ->
                        call.reject("Pemilihan printer dibatalkan.")
                    )
                    .show()
            );

        } catch (SecurityException e) {
            Log.e(TAG, "Kesalahan izin Bluetooth", e);
            call.reject("Izin Bluetooth belum diberikan.", e);
        } catch (Exception e) {
            Log.e(TAG, "Gagal membaca perangkat Bluetooth", e);
            call.reject("Gagal membaca perangkat Bluetooth: " + e.getMessage(), e);
        }
    }

    private BluetoothSocket connectPrinter(BluetoothDevice device)
        throws Exception {

        BluetoothSocket socket = null;

        try {
            Log.i(TAG, "Mencoba koneksi SPP standar...");

            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();

            Log.i(TAG, "Koneksi SPP standar berhasil.");
            return socket;

        } catch (Exception firstError) {
            Log.w(TAG, "SPP standar gagal: " + firstError.getMessage());

            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception ignored) {
                }
            }
        }

        try {
            Log.i(TAG, "Mencoba koneksi RFCOMM kanal 1...");

            Method method = device.getClass().getMethod(
                "createRfcommSocket",
                int.class
            );

            socket = (BluetoothSocket) method.invoke(device, 1);
            socket.connect();

            Log.i(TAG, "Koneksi RFCOMM kanal 1 berhasil.");
            return socket;

        } catch (Exception secondError) {
            Log.e(TAG, "Koneksi RFCOMM kanal 1 gagal.", secondError);

            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception ignored) {
                }
            }

            throw secondError;
        }
    }

    private void writeText(OutputStream out, JSONObject block)
        throws Exception {

        String align = block.optString("align", "left");

        byte alignByte =
            "center".equalsIgnoreCase(align) ? (byte) 1
            : "right".equalsIgnoreCase(align) ? (byte) 2
            : (byte) 0;

        out.write(new byte[] { 0x1B, 0x61, alignByte });

        boolean bold = block.optBoolean("bold", false);

        out.write(new byte[] {
            0x1B, 0x45, (byte) (bold ? 1 : 0)
        });

        String size = block.optString("size", "normal");

        out.write(new byte[] {
            0x1D,
            0x21,
            (byte) (
                "large".equalsIgnoreCase(size) ? 0x11 : 0x00
            )
        });

        String text = block.optString("text", "");

        out.write(text.getBytes(StandardCharsets.UTF_8));
        out.write(new byte[] { 0x0D, 0x0A });

        out.write(new byte[] {
            0x1B, 0x45, 0x00,
            0x1D, 0x21, 0x00
        });
    }

    private void printToDevice(PluginCall call, BluetoothDevice device) {
        JSArray blocks = call.getArray("content");

        if (blocks == null || blocks.length() == 0) {
            call.reject("Konten struk tidak tersedia atau kosong.");
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            OutputStream out = null;

            try {
                Log.i(TAG, "================================");
                Log.i(TAG, "MEMULAI CETAK DISBA POS");
                Log.i(TAG, "Printer: " + device.getName());
                Log.i(TAG, "Alamat: " + device.getAddress());
                Log.i(TAG, "Jumlah blok: " + blocks.length());

                socket = connectPrinter(device);
                out = socket.getOutputStream();

                Log.i(TAG, "OutputStream berhasil dibuat.");

                out.write(new byte[] { 0x1B, 0x40 });
                out.write(new byte[] { 0x1B, 0x61, 0x00 });

                for (int i = 0; i < blocks.length(); i++) {
                    JSONObject block = blocks.getJSONObject(i);
                    String type = block.optString("type", "text");

                    Log.i(
                        TAG,
                        "Blok " + (i + 1) + "/" + blocks.length()
                        + " - " + type
                    );

                    if ("divider".equals(type)) {
                        out.write(new byte[] { 0x1B, 0x61, 0x00 });
                        out.write(
                            "--------------------------------\r\n"
                                .getBytes(StandardCharsets.US_ASCII)
                        );

                    } else if ("feed".equals(type)) {
                        int lines = Math.max(
                            1,
                            Math.min(8, block.optInt("lines", 3))
                        );

                        for (int j = 0; j < lines; j++) {
                            out.write(new byte[] { 0x0D, 0x0A });
                        }

                    } else {
                        writeText(out, block);
                    }

                    Log.i(TAG, "Blok " + (i + 1) + " selesai.");
                }

                out.write(new byte[] {
                    0x1B, 0x61, 0x00,
                    0x0D, 0x0A,
                    0x0D, 0x0A,
                    0x0D, 0x0A
                });

                Log.i(TAG, "Mengirim flush...");
                out.flush();

                Log.i(TAG, "FLUSH BERHASIL.");

                // Beri waktu printer memproses seluruh data.
                Log.i(TAG, "Menunggu printer memproses data...");
                Thread.sleep(1000);
                Log.i(TAG, "Waktu tunggu selesai.");

                JSObject result = new JSObject();
                result.put("success", true);
                result.put(
                    "message",
                    "Data cetak berhasil dikirim melalui Bluetooth."
                );

                call.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "GAGAL MENCETAK: " + e.getMessage(), e);

                call.reject(
                    "Gagal mencetak via Bluetooth: " + e.getMessage(),
                    e
                );

            } finally {
                if (out != null) {
                    try {
                        out.close();
                    } catch (Exception e) {
                        Log.w(TAG, "Gagal menutup OutputStream.", e);
                    }
                }

                if (socket != null) {
                    try {
                        socket.close();
                    } catch (Exception e) {
                        Log.w(TAG, "Gagal menutup socket.", e);
                    }
                }

                Log.i(TAG, "Koneksi Bluetooth ditutup.");
                Log.i(TAG, "PROSES CETAK SELESAI.");
                Log.i(TAG, "================================");
            }
        }).start();
    }
}
