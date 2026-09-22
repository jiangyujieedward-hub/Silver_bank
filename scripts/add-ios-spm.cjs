// Capacitor 7 CLI lowercases the SPM option before comparing it to 'SPM'.
// Use its actual SPM setup path without installing CocoaPods or changing dependencies.
const path=require('node:path');
const {loadConfig}=require('@capacitor/cli/dist/config');
const {addCommand}=require('@capacitor/cli/dist/tasks/add');
(async()=>{const c=await loadConfig();c.ios.packageManager=Promise.resolve('SPM');c.cli.assets.ios.platformTemplateArchive='ios-spm-template.tar.gz';c.cli.assets.ios.platformTemplateArchiveAbs=path.resolve(c.cli.assetsDirAbs,'ios-spm-template.tar.gz');await addCommand(c,'ios');})();
