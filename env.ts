const requiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

export const env = {
  // From Blob Storage Integration
  BLOB_READ_WRITE_TOKEN: requiredEnv("BLOB_READ_WRITE_TOKEN"),

  // From Upstash Search Integration
  UPSTASH_SEARCH_REST_TOKEN: requiredEnv("UPSTASH_SEARCH_REST_TOKEN"),
  UPSTASH_SEARCH_REST_URL: requiredEnv("UPSTASH_SEARCH_REST_URL"),

  // ACC (Autodesk Construction Cloud) OAuth
  ACC_CLIENT_ID: requiredEnv("ACC_CLIENT_ID"),
  ACC_CLIENT_SECRET: requiredEnv("ACC_CLIENT_SECRET"),
  ACC_CALLBACK_URL: requiredEnv("ACC_CALLBACK_URL"),

  // Upstash Redis (sessions)
  UPSTASH_REDIS_REST_URL: requiredEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: requiredEnv("UPSTASH_REDIS_REST_TOKEN"),
};
