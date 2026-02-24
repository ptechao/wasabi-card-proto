export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // WasabiCard API 設定
  wasabiApiUrl: process.env.WASABI_API_URL ?? "https://sandbox-api-merchant.wasabicard.com",
  wasabiApiKey: process.env.WASABI_API_KEY ?? "",
  wasabiPrivateKey: process.env.WASABI_PRIVATE_KEY ?? "",
  wasabiPublicKey: process.env.WASABI_PUBLIC_KEY ?? "",
};
