import UIKit
import Security
@main
class Check: UIResponder, UIApplicationDelegate {
 func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
  let key: [String:Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:"timebank.selftest."+UUID().uuidString,kSecAttrAccount as String:"test"]
  var read=key;read[kSecReturnData as String]=true;read[kSecMatchLimit as String]=kSecMatchLimitOne
  var result:CFTypeRef?;let empty=SecItemCopyMatching(read as CFDictionary,&result)
  var add=key;add[kSecValueData as String]=Data("test-value".utf8);add[kSecAttrAccessible as String]=kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
  let created=SecItemAdd(add as CFDictionary,nil)
  let fetched=SecItemCopyMatching(read as CFDictionary,&result)
  let updated=SecItemUpdate(key as CFDictionary,[kSecValueData as String:Data("updated".utf8)] as CFDictionary)
  let removed=SecItemDelete(key as CFDictionary)
  print("KEYCHAIN_CHECK empty=\(empty) add=\(created) read=\(fetched) update=\(updated) remove=\(removed)")
  fflush(stdout);exit(created == errSecSuccess && fetched == errSecSuccess && updated == errSecSuccess && removed == errSecSuccess && empty == errSecItemNotFound ? 0:1)
 }
}
