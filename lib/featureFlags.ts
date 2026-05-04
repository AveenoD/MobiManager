/**
 * Feature flags — server-side switches driven by env vars (S11: product rails default ON).
 *
 * Env key pattern: FEATURE_<SNAKE_UPPER> (e.g. FEATURE_CUSTOMER_RECALL).
 * Set to `0` or `false` to disable a shipped behaviour without redeploying code.
 */

const FLAG_PREFIX = 'FEATURE_';

const FLAG_DEFAULTS = {
  observabilityV2: process.env.NODE_ENV !== 'production',
  customerRecall: true,
  dictionaryApis: true,
  crossScriptSearch: true,
  aiOcrV2: true,
  atomicEntitlement: true,
  refreshTokenRotation: true,
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
