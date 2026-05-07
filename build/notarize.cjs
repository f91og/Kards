const path = require('path');
const { notarize } = require('@electron/notarize');

module.exports = async function notarizing(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  if (process.env.SKIP_NOTARIZATION === '1') {
    console.warn('Skipping notarization because SKIP_NOTARIZATION=1.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const profile = process.env.NOTARYTOOL_PROFILE;
  const appleApiKey = process.env.APPLE_API_KEY;
  const appleApiKeyId = process.env.APPLE_API_KEY_ID;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;

  if (appleApiKey && appleApiKeyId && appleApiIssuer) {
    await notarize({
      appPath,
      appleApiKey,
      appleApiKeyId,
      appleApiIssuer,
    });
    return;
  }

  if (profile) {
    await notarize({
      appPath,
      keychainProfile: profile,
    });
    return;
  }

  console.warn(
    'Skipping notarization because neither NOTARYTOOL_PROFILE nor APPLE_API_KEY/APPLE_API_KEY_ID/APPLE_API_ISSUER are set.',
  );
};
