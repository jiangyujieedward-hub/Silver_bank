package community.neighbour.timebank;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {
    private static final String ALIAS="neighbour.timebank.session";
    private SharedPreferences prefs(){return getContext().getSharedPreferences("secure-session", Context.MODE_PRIVATE);}
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if(!store.containsAlias(ALIAS)){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey)store.getKey(ALIAS,null);
    }
    @PluginMethod public void get(PluginCall call){
        try {
            String saved=prefs().getString("token",null); if(saved==null){call.resolve(new JSObject());return;}
            String[] parts=saved.split("\\."); Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));
            String value=new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8);
            JSObject out=new JSObject();out.put("value",value);call.resolve(out);
        } catch(Exception e){prefs().edit().remove("token").commit();call.resolve(new JSObject());}
    }
    @PluginMethod public void set(PluginCall call){
        String value=call.getString("value");if(value==null){call.reject("Missing session.");return;}
        try {Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
            String encrypted=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+"."+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
            if(!prefs().edit().putString("token",encrypted).commit())throw new Exception();call.resolve();
        }catch(Exception e){call.reject("Unable to save secure sign-in information.");}
    }
    @PluginMethod public void remove(PluginCall call){if(prefs().edit().remove("token").commit())call.resolve();else call.reject("Unable to clear sign-in information.");}
    @PluginMethod public void copy(PluginCall call){String value=call.getString("value");if(value==null){call.reject("Missing recovery key.");return;}
        ClipboardManager clipboard=(ClipboardManager)getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("Time Bank recovery key",value));call.resolve();}
}
