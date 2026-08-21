import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useServerStore } from "@/features/server/application/useServerStore";
import { ServerFormValues } from "../domain/schema";

export const useServerGeneralLogic = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext<ServerFormValues>();
  const { servers } = useServerStore();

  // --- 1. 监听表单字段 ---
  const currentIcon = watch("icon");
  const currentTheme = watch("theme") || "sapphire";
  const currentProvider = watch("provider");
  const tags = watch("tags") || [];
  const enableExpiration = watch("enableExpiration");
  const expireDate = watch("expireDate");

  // --- 2. 派生数据 (Memoized Data) ---
  const existingProviders = useMemo(() => {
    const set = new Set(servers.map(s => s.provider).filter(Boolean));
    return Array.from(set);
  }, [servers]);

  const existingTags = useMemo(() => {
    const set = new Set<string>();
    servers.forEach(s => s.tags?.forEach(t => set.add(t)));
    return Array.from(set);
  }, [servers]);

  // --- 3. 交互状态 ---
  const [openProvider, setOpenProvider] = useState(false);
  const [openTags, setOpenTags] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // --- 4. 事件处理 ---
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.length >= 2) return;
    
    if (!tags.includes(trimmed)) {
      setValue("tags", [...tags, trimmed], { shouldDirty: true });
    }
    setOpenTags(false);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue("tags", tags.filter(t => t !== tagToRemove), { shouldDirty: true });
  };

  const handleProviderSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    setValue("provider", trimmed === currentProvider ? "" : trimmed, { shouldDirty: true });
    setOpenProvider(false);
  };

  const handleIconSelect = (iconKey: string) => {
    setValue("icon", iconKey);
  };

  const handleThemeSelect = (themeKey: string) => {
    setValue("theme", themeKey, { shouldDirty: true });
  };

  const handleExpirationToggle = (checked: boolean) => {
    setValue("enableExpiration", checked);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setValue("expireDate", date);
  };

  return {
    register,
    errors,
    setValue, // 🟢 [修复] 必须将 setValue 暴露出去，ServerGeneralInfo 才能解构使用
    values: {
      icon: currentIcon,
      theme: currentTheme,
      provider: currentProvider,
      tags,
      enableExpiration,
      expireDate
    },
    data: {
      existingProviders,
      existingTags
    },
    state: {
      openProvider,
      setOpenProvider,
      openTags,
      setOpenTags,
      tagInput,
      setTagInput
    },
    actions: {
      addTag: handleAddTag,
      removeTag: handleRemoveTag,
      selectProvider: handleProviderSelect,
      selectIcon: handleIconSelect,
      selectTheme: handleThemeSelect,
      toggleExpiration: handleExpirationToggle,
      selectDate: handleDateSelect
    }
  };
};
