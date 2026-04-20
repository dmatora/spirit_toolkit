const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const appEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');
const initialShellEnvKeys = new Set(Object.keys(process.env));
const managedEnvKeys = new Set();

const readEnv = (filePath) => {
  try {
    return dotenv.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
};

const loadPrayerEnv = () => {
  const rootEnv = readEnv(rootEnvPath);
  const appEnv = readEnv(appEnvPath);

  managedEnvKeys.forEach((key) => {
    if (!initialShellEnvKeys.has(key)) {
      delete process.env[key];
    }
  });
  managedEnvKeys.clear();

  const assignManagedEnv = (key, value) => {
    if (initialShellEnvKeys.has(key)) {
      return;
    }

    process.env[key] = value;
    managedEnvKeys.add(key);
  };

  Object.entries(rootEnv).forEach(([key, value]) => {
    if (appEnv[key] === undefined) {
      assignManagedEnv(key, value);
    }
  });

  Object.entries(appEnv).forEach(([key, value]) => {
    assignManagedEnv(key, value);
  });
};

const getPrayerEnvPath = () => {
  if (fs.existsSync(appEnvPath)) {
    return appEnvPath;
  }
  return rootEnvPath;
};

const getPrayerEnvCacheKey = () =>
  [appEnvPath, rootEnvPath]
    .map((filePath) => {
      try {
        return `${filePath}:${fs.statSync(filePath).mtimeMs}`;
      } catch {
        return `${filePath}:missing`;
      }
    })
    .join('|');

module.exports = {
  getPrayerEnvCacheKey,
  getPrayerEnvPath,
  loadPrayerEnv,
};
