const fs = require('fs');
const path = require('path');

const KEPT_LOCALES = new Set(['en.lproj', 'en_GB.lproj', 'ja.lproj']);

function findAppBundle(appOutDir) {
  const directAppPath = appOutDir.endsWith('.app') ? appOutDir : null;
  if (directAppPath && fs.existsSync(directAppPath)) {
    return directAppPath;
  }

  const entry = fs.readdirSync(appOutDir).find((name) => name.endsWith('.app'));
  return entry ? path.join(appOutDir, entry) : null;
}

function removeUnusedLocales(resourcesDir) {
  for (const entry of fs.readdirSync(resourcesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.endsWith('.lproj')) continue;
    if (KEPT_LOCALES.has(entry.name)) continue;

    fs.rmSync(path.join(resourcesDir, entry.name), { recursive: true, force: true });
  }
}

module.exports = async (context) => {
  const appBundlePath = findAppBundle(context.appOutDir);
  if (!appBundlePath) return;

  const frameworkResourcesPath = path.join(
    appBundlePath,
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
    'Versions',
    'A',
    'Resources',
  );

  if (fs.existsSync(frameworkResourcesPath)) {
    removeUnusedLocales(frameworkResourcesPath);
  }
};
