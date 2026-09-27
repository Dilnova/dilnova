/**
 * Server environment validation and configuration re-export.
 * Canonical implementation has been centralized into @/shared/config/env.
 */
export {
  productionServerEnvSchema,
  validateServerEnv,
  getServerConfig,
  env,
  type ProductionServerEnv,
  type ServerConfig,
} from "@/shared/config/env";
