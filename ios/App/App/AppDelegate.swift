import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

import Security

class TimeBankBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureSessionPlugin())
    }
}

@objc(SecureSessionPlugin)
class SecureSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "SecureSessionPlugin"
    let jsName = "SecureSession"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copy", returnType: CAPPluginReturnPromise)
    ]
    private var key: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "community.neighbour.timebank.session",
         kSecAttrAccount as String: "member"]
    }
    @objc func get(_ call: CAPPluginCall) {
        var query = key
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { call.resolve([:]); return }
        guard status == errSecSuccess, let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
            call.reject("Unable to read secure sign-in information."); return
        }
        call.resolve(["value": value])
    }
    @objc func set(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), let data = value.data(using: .utf8) else { call.reject("Missing session."); return }
        var query = key
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let update = SecItemUpdate(key as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        let status = update == errSecItemNotFound ? SecItemAdd(query as CFDictionary, nil) : update
        if status == errSecSuccess { call.resolve() } else { call.reject("Unable to save secure sign-in information.") }
    }
    @objc func remove(_ call: CAPPluginCall) {
        let status = SecItemDelete(key as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound { call.resolve() } else { call.reject("Unable to remove secure sign-in information.") }
    }
    @objc func copy(_ call: CAPPluginCall) {
        guard let value = call.getString("value") else { call.reject("Missing recovery key."); return }
        DispatchQueue.main.async {
            UIPasteboard.general.setItems([["public.utf8-plain-text": value]], options: [.localOnly: true, .expirationDate: Date().addingTimeInterval(600)])
            call.resolve()
        }
    }
}
