import { z } from "zod";

// 枚举定义
export const AuthTypeEnum = z.enum(["password", "key"]);
export const ConnectionTypeEnum = z.enum(["direct", "http", "socks5"]);
export const KeySourceEnum = z.enum(["manual", "store"]);

// 核心 Schema
export const serverFormSchema = z.object({
  id: z.string().optional(),
  
  // 基础信息
  name: z.string().min(1),
  // [修改] 移除 .default()，因为 useServerFormLogic 已经保证了默认值
  icon: z.string(), 
  os: z.string(),
  provider: z.string().optional(),
  theme: z.string().optional(),
  sort: z.number(),

  // [新增] 数据库字段：是否置顶/收藏
  is_pinned: z.union([z.number(), z.boolean()]).optional(),

  tags: z.array(z.string()).max(2),
  
  // 连接信息
  host: z.string().min(1),
  // [修改] 移除 .default()
  port: z.number().min(1).max(65535),
  username: z.string().min(1),
  connectionType: ConnectionTypeEnum,
  proxyId: z.string().optional().nullable(),
  
  // 认证策略 (UI状态)
  authType: AuthTypeEnum,
  
  // 密码相关
  passwordSource: KeySourceEnum,
  passwordId: z.string().optional(),
  password: z.string().optional(), 
  
  // 密钥相关
  keySource: KeySourceEnum,
  keyId: z.string().optional(),
  privateKey: z.string().optional(), 
  passphrase: z.string().optional(),
  
  // 过期设置
  enableExpiration: z.boolean(),
  expireDate: z.date().optional().nullable(),
  // 🟢 [新增] 高级设置
  connectTimeout: z.number().min(1).max(300).default(10),       // 默认 10秒
  keepAliveInterval: z.number().min(0).max(3600).default(60),   // 默认 60秒 (0表示关闭)
  autoReconnect: z.boolean().default(false),                    // 默认 关闭
  maxReconnects: z.number().min(0).max(20).default(3),          // 默认 3次
});

export type ServerFormValues = z.infer<typeof serverFormSchema>;
export type useFormContext = z.infer<typeof serverFormSchema>;