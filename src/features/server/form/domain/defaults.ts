import { ServerFormValues } from "./schema";

export const DEFAULT_SERVER_FORM_VALUES: Partial<ServerFormValues> = {
  port: 22,
  os: "linux",
  icon: "server",
  theme: "sapphire",
  connectionType: "direct",
  authType: "password",
  passwordSource: "manual",
  keySource: "manual",
  tags: [],
  sort: 0,
  enableExpiration: false,
  is_pinned: false, // [新增] 默认不收藏

  connectTimeout: 10,
  keepAliveInterval: 60,
  autoReconnect: false,
  maxReconnects: 3,
};