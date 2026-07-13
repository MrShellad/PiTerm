import { useState, useEffect, useRef } from "react";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";

/**
 * 模块级内存缓存：path → Blob URL
 * 同一图片路径在整个应用生命周期内只需读取一次
 */
const blobCache = new Map<string, string>();

/**
 * 将本地文件路径转换为可显示的 URL (Blob URL)，
 * 并通过内存缓存和 Image 预解码消除重复加载延迟。
 * 
 * @param path data/background/xxx.png 或 Base64 字符串
 * @returns { src, isReady } — src 为可用 URL，isReady 在图片完全解码可渲染时为 true
 */
export function useLocalImage(path: string | undefined | null): { src: string | null; isReady: boolean } {
  const [src, setSrc] = useState<string | null>(() => {
    // 同步初始化：如果缓存中已有该路径的 Blob URL，直接使用
    if (path && blobCache.has(path)) return blobCache.get(path)!;
    if (path && (path.startsWith("data:") || path.startsWith("http"))) return path;
    return null;
  });
  const [isReady, setIsReady] = useState<boolean>(() => {
    // 如果初始就有缓存命中，直接标记就绪
    if (path && blobCache.has(path)) return true;
    if (path && (path.startsWith("data:") || path.startsWith("http"))) return true;
    return !path; // 无壁纸时也标记为就绪
  });

  // 用于防止组件卸载后 setState
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // 1. 空值处理 — 无壁纸路径
    if (!path) {
      setSrc(null);
      setIsReady(true); // 无壁纸 = 已就绪
      return;
    }

    // 2. 兼容旧数据 (Base64) 或网络图片 (http)
    if (path.startsWith("data:") || path.startsWith("http")) {
      setSrc(path);
      setIsReady(true);
      return;
    }

    // 3. 检查内存缓存
    if (blobCache.has(path)) {
      setSrc(blobCache.get(path)!);
      setIsReady(true);
      return;
    }

    // 4. 读取本地文件 → Blob → Image 预解码
    let active = true;

    const load = async () => {
      try {
        // 读取 AppConfig 下的文件 (例如: data/background/bg_123.png)
        const bytes = await readFile(path, { baseDir: BaseDirectory.AppConfig });
        if (!active || !mountedRef.current) return;

        const blob = new Blob([bytes]);
        const objectUrl = URL.createObjectURL(blob);

        // 缓存到模块级 Map，后续同路径不再读取
        blobCache.set(path, objectUrl);

        // 使用 Image 预解码，确保 CSS backgroundImage 能立即渲染无闪烁
        const img = new Image();
        img.onload = () => {
          if (active && mountedRef.current) {
            setSrc(objectUrl);
            setIsReady(true);
          }
        };
        img.onerror = () => {
          // 图片解码失败也标记就绪（降级到渐变背景）
          if (active && mountedRef.current) {
            setSrc(null);
            setIsReady(true);
          }
        };
        img.src = objectUrl;
      } catch (error) {
        console.error("Failed to load background image:", error);
        if (active && mountedRef.current) {
          setSrc(null);
          setIsReady(true); // 加载失败也标记就绪
        }
      }
    };

    load();

    return () => {
      active = false;
      // 注意：不再 revoke blob URL，因为缓存需要保留
      // Blob URL 会在页面卸载时自动释放
    };
  }, [path]);

  return { src, isReady };
}