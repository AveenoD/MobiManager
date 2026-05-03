/**
 * Feature flags — server-side on/off switches driven by env vars.
 *
 * Env key pattern: FEATURE_<SNAKE_UPPER> (e.g. FEATURE_CUSTOMER_RECALL).
 * Usage: `if (flags.customerRecall) { ... }`
 */

const FLAG_PREFIX = 'FEATURE_';

const FLAG_DEFAULTS = {
  observabilityV2: process.env.NODE_ENV !== 'production',
  customerRecall: false,
  dictionaryApis: false,
  i18nPersistence: false,
  crossScriptSearch: false,
  aiOcrV2: false,
  atomicEntitlement: false,
  refreshTokenRotation: false,
} as const;

export type FlagName = keyof typeof FLAG_DEFAULTS;

/** camelCase flag name → ENV suffix after FEATURE_ */
function flagNameToEnvSuffix(name: string): string {
  return name.replace(/([a-z\d])([A-Z])/g, '$1_$2').toUpperCase();
}

function readEnvBool(flagName: FlagName, defaultValue: boolean): boolean {
  const envKey = FLAG_PREFIX + flagNameToEnvSuffix(flagName);
  const val = process.env[envKey];
  if (val === undefined) return defaultValue;
  return val === '1' || val.toLowerCase() === 'true';
}

export const flags = Object.freeze({
  observabilityV2: readEnvBool('observabilityV2', FLAG_DEFAULTS.observabilityV2),
  customerRecall: readEnvBool('customerRecall', FLAG_DEFAULTS.customerRecall),
  dictionaryApis: readEnvBool('dictionaryApis', FLAG_DEFAULTS.dictionaryApis),
  i18nPersistence: readEnvBool('i18nPersistence', FLAG_DEFAULTS.i18nPersistence),
  crossScriptSearch: readEnvBool('crossScriptSearch', FLAG_DEFAULTS.crossScriptSearch),
  aiOcrV2: readEnvBool('aiOcrV2', FLAG_DEFAULTS.aiOcrV2),
  atomicEntitlement: readEnvBool('atomicEntitlement', FLAG_DEFAULTS.atomicEntitlement),
  refreshTokenRotation: readEnvBool('refreshTokenRotation', FLAG_DEFAULTS.refreshTokenRotation),
});

export function isFlagEnabled(name: FlagName): boolean {
  return flags[name] === true;
}

export function getFlagEnvKey(name: FlagName): string {
  return FLAG_PREFIX + flagNameToEnvSuffix(name);
}

export function getAllFlags(): Record<FlagName, boolean> {
  return { ...flags };
}
