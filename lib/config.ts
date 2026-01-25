/**
 * Verbatim Configuration Loader
 *
 * Loads configuration from config.yaml with environment variable overrides.
 * Falls back to config.example.yaml in development if config.yaml doesn't exist.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface VerbatimConfig {
  app: {
    name: string;
    url: string;
    environment: 'development' | 'production';
  };
  database: {
    path: string;
  };
  storage: {
    audio_path: string;
    exports_path: string;
    max_file_size_mb: number;
    cleanup_after_hours: number;
  };
  auth: {
    magic_link_expiry_minutes: number;
    session_expiry_days: number;
    rate_limit_magic_links_per_hour: number;
  };
  stripe: {
    secret_key: string;
    publishable_key: string;
    webhook_secret: string;
    prices: {
      creator: string;
      pro: string;
      unlimited: string;
    };
  };
  email: {
    provider: string;
    resend_api_key: string;
    from_address: string;
  };
  transcription: {
    default_model: string;
    max_duration_hours: number;
    concurrent_jobs_free: number;
    concurrent_jobs_paid: number;
  };
  rate_limits: {
    free_requests_per_min: number;
    paid_requests_per_min: number;
    api_requests_per_min: number;
  };
  security: {
    cors_origins: string[];
  };
  tiers: {
    [key: string]: {
      minutes: number;
      concurrent_jobs: number;
    };
  };
}

let cachedConfig: VerbatimConfig | null = null;

function findConfigFile(): string {
  const projectRoot = process.cwd();

  // Try config.yaml first
  const configPath = path.join(projectRoot, 'config.yaml');
  if (fs.existsSync(configPath)) {
    return configPath;
  }

  // Fall back to config.example.yaml in development
  const examplePath = path.join(projectRoot, 'config.example.yaml');
  if (fs.existsSync(examplePath)) {
    console.warn(
      '⚠️  Using config.example.yaml - copy to config.yaml for production'
    );
    return examplePath;
  }

  throw new Error(
    'No configuration file found. Copy config.example.yaml to config.yaml'
  );
}

function applyEnvironmentOverrides(config: VerbatimConfig): VerbatimConfig {
  // Override with environment variables if set
  const overrides: Record<string, (value: string) => void> = {
    VERBATIM_URL: (v) => (config.app.url = v),
    VERBATIM_ENV: (v) => (config.app.environment = v as 'development' | 'production'),
    DATABASE_PATH: (v) => (config.database.path = v),
    STRIPE_SECRET_KEY: (v) => (config.stripe.secret_key = v),
    STRIPE_PUBLISHABLE_KEY: (v) => (config.stripe.publishable_key = v),
    STRIPE_WEBHOOK_SECRET: (v) => (config.stripe.webhook_secret = v),
    RESEND_API_KEY: (v) => (config.email.resend_api_key = v),
    EMAIL_FROM: (v) => (config.email.from_address = v),
  };

  for (const [envVar, setter] of Object.entries(overrides)) {
    const value = process.env[envVar];
    if (value) {
      setter(value);
    }
  }

  return config;
}

export function loadConfig(): VerbatimConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = findConfigFile();
  const fileContents = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(fileContents) as VerbatimConfig;

  // Apply environment variable overrides
  cachedConfig = applyEnvironmentOverrides(config);

  return cachedConfig;
}

export function getConfig(): VerbatimConfig {
  return loadConfig();
}

// Helper functions for common config access patterns
export function isProduction(): boolean {
  return getConfig().app.environment === 'production';
}

export function isDevelopment(): boolean {
  return getConfig().app.environment === 'development';
}

export function getAppUrl(): string {
  return getConfig().app.url;
}

export function getTierConfig(tier: string) {
  const config = getConfig();
  return config.tiers[tier] || config.tiers.free;
}

export function getStripeConfig() {
  return getConfig().stripe;
}

export function getEmailConfig() {
  return getConfig().email;
}
