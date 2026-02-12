
export const zh = {
  translation: {
    menu: {
      home: "仪表盘",
      servers: "服务器",
      snippets: "代码库",
      tools: "工具箱",
      keys: "密钥管理",
      settings: "设置"
    },

    theme: {
      dark: "暗黑模式",
      light: "亮色模式",
      switch: "切换主题"
    },

    sidebar: {
      collapse: "收起侧边栏",
      expand: "展开侧边栏"
    },
    "backup": {
      "progress": {
        "preparing": "正在准备...",
        "compressing": "正在压缩数据...",
        "uploading": "正在上传至云端...",
        "downloading": "正在下载备份...",
        "analyzing": "正在解析备份文件...",
        "extracting": "正在解压并恢复...",
        "complete": "操作完成！"
      }
  },
    app: {
      title: "我的终端"
    },
    common: {
      password: "密码",
      default: "默认",
      unlock: "解锁",
      menu: "菜单",
      search: "搜索",
      filters: "筛选",
      loading: "加载中...",
      confirm: "确定",
      cancel: "取消",
      delete: "删除",
      edit: "编辑",
      save: "保存",
      create: "创建",
      actions: "操作",
      clearSearch: "清除搜索条件",
      processing: "处理中...",
      export: "导出",
      import: "导入",
      searchPlaceholder: "搜索...",
      grid_view: "网格视图",
      list_view: "列表视图",
      all: "全部",
      newItem: "新建",
      add: "添加",
      testing: "测试中...",
      testConnection: "测试连接",
      close: "关闭",
      change: "切换",
      loadFile: "本地导入",
      reset: "重置",
      optional: "可选",
      pickDate: "选择日期",
      copied: "已复制",
      connect: "连接",
      clickToExpand: "点击展开",
      deleteProxy: "删除代理",
      searchTags: "搜索标签",
      noTagsFound: "未找到标签",
      selectTags: "选择标签",
      selected: "选择",
      clear: "清除",
      exportAll: "导出所有",
      authRequired: "需要身份验证",
      authDesc: "请输入密码",
      deleteProxyConfirm: "您确定要删除此代理配置吗？此操作无法撤销。",
      size: {
        small: "小",
        medium: "中",
        large: "大",
      }
    },

    dashboard: {
      emoji: {
      rules: {
        newYear: "新年快乐！",
        christmas: "圣诞快乐！",
        morning: "早上好，喝杯咖啡吧",
        lunch: "午饭时间到了",
        afternoon: "努力工作中...",
        evening: "晚上好",
        lateNight: "熬夜中，注意身体",
        default: "准备出发"
      }
    },
      settings: {
      showEmoji: "显示每日表情",
      resetSponsors: "重置已隐藏的赞助卡片"
    },
      sponsor:{
        hallOfFame: "感谢",
        supportProject: "支持项目",
        joinBackers: "支持者",
        donateViewAll: "查看所有支持者",
        thankYou: "衷心感谢所有大家对本项目的支持与赞助！",
        becomeSponsor: "成为支持者",
      },
      quickConnect:{
        hint: "格式: user@host or user@host:port",
        title: "开始连接",
        error: "连接初始化失败",
        connecting: "正在连接 {{host}}...",
        invalidFormat: "格式无效。请使用：user@host:port",
        disclaimerTitle: "担保免责声明",
      }


    },
    

    server: {
      errorTrust: "无法信任主机密钥",
      locked_connect: "请解锁密钥库以连接。",
      errorTerminal: "打开终端失败：{{message}}",
      verify: {
        title: "新主机确认",
        desc: "无法确认主机的真实性。正在首次连接到此服务器。",
        warning: "为防止 MITM 攻击，请验证此指纹是否与服务器的密钥匹配。",
        trust: "信任并连接",
      },
      sshlog:{
        failed: "连接失败",
        connecting: "正在连接...",
        tunnel: "建立安全隧道",
        init: "正在初始化...",
      },
      logs:{
        saveError: "储存指纹失败",
        trusted: "主机密钥已信任。正在保存到 known_hosts 目录...",
        preflight: "正在启动验证...",
        preflightError: "指纹校对失败",
      },
      vault: {
        locked_add: "请解锁 密钥库 以添加服务器。",
        locked_edit: "请解锁 密钥库 以编辑详细信息。",
      },
      deleteKeyUsedWarning: "被其他服务器使用的凭据：",
      delete:{
        title: "删除服务器？",
        confirm: "你确定要删除服务器 “{{name}}” 吗？此操作无法撤销。",
        deletePassword: "同时删除关联的密码",
        deleteKey: "同时删除关联的密钥",
      },
      list: {
            searchPlaceholder: "搜索服务器名称、IP...",
            add: "添加服务器",
            copyIp: "复制IP",
            empty: "未找到符合您条件的服务器。",
      },
      status:{
        expired: "已经过期",
        daysLeft: "剩余{{count}}天",

      },
      columns:{
        name: "服务器名称",
        ip: "服务器地址",
        expiration: "过期时间",
        tags: "标签",
        actions: "操作"
      },
      sort: {
            newest: "创建时间 (最新)",
            oldest: "创建时间 (最早)",
            nameAsc: "名称 (A-Z)",
            idDesc: "ID (倒序)",
            idAsc: "ID (正序)"
      },
      form: {
        titleNew: "新建服务器",
        titleEdit: "编辑服务器",
        name: "服务器名称",
        namePlaceholder: "例如：生产环境数据库",
        icon: "图标",
        provider: "服务商",
        selectProvider: "选择服务商...",
        tags: "标签",
        sort: "排序权重",
        enableExpiration: "到期时间",
        host:"地址",
        port:"端口",
        connectionMode: "代理",
        password: "密码",
        username:"用户名",
        passphrase: "密钥密码",
        privateKey: "密钥信息",
        credentials: "认证",
        passwordPlaceholder: "输入密码",
        sortPriority: "优先级",
        authType: "认证类型",
        tagPlaceholder: "输入标签",
        createProvider: "新建",
        testSuccess: "连接成功！",
        checkRequired: "请检查必填字段。",
        testFailed: "连接失败: {{error}}",
        saveError: "保存失败: {{message}}",
        saveSuccess: "保存成功",
        existing: "提供商",
          vault:{
            locked_save: "请解锁密钥库以保存安全凭证。",
            select:"从密钥库选择",
            keyReady:"Key准备就绪",
            associated: "保险库验证完毕",
            key: "密钥登录",
            password: "密码登录",
            selectKeyTitle: "选择密钥",
            noKeysFound: "在 Vault 中未找到任何私钥",
            searchKeys: "搜索密钥...",
          },
          tabs: {
            basic: "基础设置",
            advanced: "高级设置"
          },
          select_proxyplaceholder: "选择代理...",
          select_proxylabel: "选择代理配置",
          list_proxyempty: "没有匹配类型代理",
          timeout: "连接超时",
          timeoutDesc: "最大等待时间（秒）。",
          keepalive: "保活间隔",
          keepaliveDesc: "保活间隔秒数（设为 0 以禁用）。",
          reconnect: "自动重连",
          reconnectDesc: "如果断开连接，则自动重试。",
          retries: "重试次数",
          retriesDesc: "最大尝试次数",
      }
  },

    terminal: {
      connecting: "正在连接服务器...",
      reconnectAuth:"Session过期",
      reconnectDesc:"这是临时连接，请输入密码以连接。",
      welcome: {
        title:"服务器列表",
        subtitle:"快速开始吧",
      },
      tabs: {
        reconnect: "重新连接",
        split: "添加至分屏",
        unsplit: "取消分屏",
        close: "关闭当前标签",
        closeOthers: "关闭其他标签",
        closeAll: "关闭所有标签",
        rename: "重命名",
      }
    },
    cmd: {
      collapseFileManager: "收起文件管理器",
      expandFileManager: "展开文件管理器",
      library: "命令记录",
      snippets: "代码片段",
      history: "命令历史",
      searchPlaceholder: "搜索...",
      snippetsnotFound: "空",
      commonrun: "粘贴并立即运行",
      commoninsert: "填充到输入框",
      commonloading: "历史记录载入中...",
      typeCommand: "输入命令...",
      historynoSession: "没有可用session",
      broadcastOn: "广播开",
      broadcastOff:"广播关",
      commondelete:"删除",
      historyempty:"空",
    },

    monitor: {
      "connecting": "正在连接监控服务...",
      collapse: "收起",
      expand: "展开",
      title: "系统监控",
      loading: "加载中...",
      total: "总计",
      disabled: "未启用",
      moreInfo: "更多信息",
      copied: "已复制!",
      usage: "使用率",
      openAdvanced: "高级仪表盘(未完工)",
      "common": {
      "loading": "加载中…",
      "empty": "-"
    },
      process: {
      title: "进程监控",
      total: "进程总数",
      name: "进程名称"
    },
      "cpu": {
      "title": "CPU 处理器",
      "model": "处理器型号",
      "cores_label": "物理核心",
      "threads_label": "逻辑线程",
      "load_1m": "1分钟负载",
      "load_5m": "5分钟负载",
      "load_15m": "15分钟负载",
      "user": "用户态",
      "system": "内核态",
      "iowait": "IO 等待",
      "idle": "空闲",
      "per_core": "每个核心的使用率"
    },
   "mem": {
      "title": "内存",
      "swaput": "交换分区（已用 / 总计）",
      "cache": "缓存",
      "buffers": "缓冲区",
      "free": "空闲内存",
      "available_hint": "可用内存包含缓存和缓冲区。"
    },
      "disk": {
      "title": "存储",
      "capacity_usage": "已用 / 总量",
      "removable": "可移动磁盘",
      "free": "剩余"
    },
      info: {
        title: "系统信息",
        uptime: "已运行",
        distro: "发行版",
        kernel: "内核",
        arch: "架构",
        timezone: "时区"
      },
      network: {
        title: "网络监控",
        tcp_conns: "TCP 连接数",
        realtime: "实时速率",
        rx_total: "接收总流量",
        tx_total: "发送总流量",
        interfaces: "网卡详情"
    }
    },
keys: {
  empty: "未找到密钥",
  searchPlaceholder: "搜索密钥",
  add: "添加密钥",
    action: {
      add: "添加凭据",
      edit: "编辑凭据",
      importFile: "导入文件"
    },
    label: {
      remarkName: "备注名称",
      username: "用户名",
      password: "密码",
      "privateKey": "私钥",
      "passwordContent": "密码内容",
      "passphrase": "密码短语"
    },
    placeholder: {
      remarkName: "例如：生产环境数据库",
      username: "可选",
      privateKey: "在此粘贴您的私钥内容",
      passphrase: "可选（仅当私钥已加密时）",
      setPwd: "设置密码",
      enterPwd: "输入密码",
      confirmPwd: "确认密码",
    },
    "msg": {
      "noPassphrase": "未设置密码短语"
    },
    error: {
      pwdMismatch: "密码不匹配",
      pwdShort: "密码必须至少包含 6 个字符",
      wrongPwd: "密码错误",
    },
    setup: {
      title: "设置主密码",
      unlock_title: "解锁保险库",
      desc: "您的密钥已使用主密码加密。请设置一个以继续。",
      unlock_desc: "请输入您的主密码以访问您的密钥。"
    },
    delete:{
      title: "删除凭据",
      confirm: "您确定要删除此凭据吗？此操作无法撤销。",
      warning: "已经关联 {{count}} 台服务器",
      impact: "删除此密钥将断开与以下对象的连接：",
    },
  },
    fs: {
      nav: {
        protected: "系统保护",
        back: "后退",
        forward: "前进",
        up: "返回上一级"
      },
      context: {
        new: "新建",
        newFile: "新建文件",
        newFolder: "新建文件夹",
        openTerminal: "在此处打开终端",
        openBuiltin: "内置编辑器打开",
        openLocal: "本地打开",
        copyPath: "复制路径",
        rename: "重命名",
        download: "下载",
        copy: "复制",
        cut: "移动",
        permissions: "修改权限",
        delete: "删除",
        paste: "粘贴",
        pasteInto: "粘贴到此处",
        upload: "上传文件",
        permission: "修改权限",
      },
      placeholder: {
        file: "example.txt",
        folder: "新建文件夹"
      },
      msg: {
        createSuccess: "创建成功",
        renameSuccess: "重命名成功",
        deleteSuccess: "删除成功",
        pathCopied: "路径已复制",
        copyFailed: "复制失败",
        termPathUpdated: "终端路径已更新",
        copied: "已复制到剪贴板",
        cut: "已剪切 (移动)",
        pasteSuccess: "粘贴完成",
        uploading: "正在上传...",
        uploadSuccess: "上传成功",
        uploadFailed: "上传失败",
        downloading: "正在下载...",
        downloadSuccess: "下载成功",
        downloadFailed: "下载失败",
        chmodSuccess: "权限修改成功",
      },
      perm:{
        prop_file: "目标",
        scope: "对象",
        owner: "所有者",
        group: "用户组",
        others: "其他用户",
        dir: "文件夹",
        read: "读取",
        write: "写入",
        execute: "执行",
        recursive: "递归到子目录和文件",
        octal: "权限码",

      },
      dialog:
      {
        deleteConfirm: "!!删除后无法恢复!!",
        enterName: "名称"
      },
      error: {
        generic: "操作失败",
        exist: "目标已存在",
        notFound: "路径或文件不存在",
        permission: "权限不足",
        timeout: "操作超时",
        folderCopy: "暂不支持文件夹复制",
        folderDownload: "暂不支持文件夹下载"
      },
      action: {
        refresh: "刷新",
        upload: "上传文件",
        cancel: "取消",
        trackingOn: "目录跟随开",
        trackingOff: "目录跟随关",
      },
      view: {
        showHidden: "显示隐藏文件",
        hideHidden: "不显示隐藏文件"
      },
      transfer: {
        manager: "传输管理",
        title: "文件传输",
        to: "位置",
        open_folder: "打开文件位置",
        empty: "没有传输记录",
        clear: "清空历史记录"
      },
      col: {
        name: "名称",
        size: "大小",
        perm: "权限",
        owner: "拥有者",
        date: "修改日期"
      },
      status: {
        pending: "等待中",
        processing: "进行中",
        completed: "已完成",
        error: "错误",
        canceled: "已取消",
        noConnection: "未连接",
        connectTip: "请连接 SSH 服务器以管理文件"
      },
      empty: "此文件夹为空"
    },
    snippet:{
      copy_hint:"点击复制",
      search_placeholder: "搜索代码库",
      empty_state: "代码库空",
      label: "新增代码块",
      fields:{
        title:"标题",
        title_placeholder: "输入标题",
        edit_title: "编辑代码",
        new_title: "新增代码",
        tags: "标签",
        language: "语言类型",
        code: "代码",
        code_placeholder: "在此输入代码",
        tagsPlaceholder: "选择标签...",
      },
      delete_title: "删除代码片段？",
      delete_confirm: "您确定要删除此代码片段吗？此操作无法撤销。"
    },
   tools: {
    placeholder: {
      title: "工具箱",
      subtitle: "通过强大的实用程序扩展您的工作流",
      footer: "有特定的工具想法吗？",
      request: "反馈功能建议"
    },
    upcoming: {
      docker: {
        title: "Docker 管理",
        desc: "可视化容器状态、日志监控及一键生命周期管理。"
      },
      network: {
        title: "路由测试",
        desc: "专业的 MTR、延时分析及全局网络路径追踪工具。"
      },
      security: {
        title: "安全审计",
        desc: "服务器漏洞扫描、端口检测及合规性报告生成。"
      },
      monitoring: {
        title: "实时监控",
        desc: "动态资源占用图表及自定义指标预警通知。"
      }
    }
  }, 
    settings: {
    title: "设置",
    itemsCount: "{{count}} 项设置",
    noResults: "未找到相关设置",
    nav: {
      general: "常规",
      appearance: "外观",
      terminal: "终端",
      connection: "连接",
      security: "安全",
      backup: "数据",
      about: "关于"
    },
    general: {
      deviceName: "设备名",
      deviceNameDesc: "用于识别此设备上的备份",
      language: "界面语言",
      languageDesc: "更改应用程序显示的语言",
      autoUpdate: "自动更新",
      autoUpdateDesc: "自动检查并下载新版本",
      launchAtStartup: "开机自动启动",
      launchAtStartupDesc: "系统登录时自动启动应用",
      minimizeToTray: "最小化到系统托盘",
      minimizeToTrayDesc: "最小化时隐藏任务栏图标，仅显示在托盘",
      closeBehavior: "关闭主窗口时",
      closeBehaviorDesc: "点击窗口关闭按钮（X）时的行为",
        languageOptions: {
          auto: "跟随系统"
      },
        behavior: {
          quit: "退出程序",
          minimize: "最小化到托盘"
      },
      },
    appearance: {
          universal: "通用背景设置",
          appTheme: "外观主题",
          syncTerminalTheme: "终端配色跟随",
          syncTerminalThemeDesc: "终端配色自动跟随主题跟换",
          lightTerminalTheme: "亮色模式终端配色",
          darkTerminalTheme: "暗色模式终端配色",
          terminalTheme: "终端配色",
          manageThemes:"配色方案",
          manageThemesDesc: "管理配色方案",
          highlightRules: "高亮规则",
          uiFont: "UI字体",
          uiFontDesc: "从系统中选择字体",
          searchFont: "搜索字体...",
          overlay: "遮罩颜色",
          overlayOpacity: "遮罩透明度",
          themeOptions: {
              system: "跟随系统",
              light: "浅色模式",
              dark: "深色模式"
          },
          noWallpaper: "无背景",
          changeWallpaper: "更换背景",
          syncBackground: "背景同步",
          syncBackgroundDesc: "让背景同步主题色",
          blur: "背景模糊度",
          brightness: "背景亮度",
          saved: "背景设置成功",
          error: "背景设置失败",
          imageTooLarge: "图片最大10MB",
          fontRestored: "已恢复默认字体",
          fontApplied: "字体已应用: {{font}}",
          systemDefault: "系统默认"
    },
    terminal: {
      preview: "实时预览",
      rendererType: "渲染引擎",
      rendererTypeDesc: "选择终端的前端绘制方式",
      renderer: {
        webgl: "WebGL (GPU加速 - 推荐)",
        canvas: "Canvas (兼容性好)",
        dom: "DOM (慢 - 仅调试)"
      },
        theme: "配色方案",
        fontSize: "字体大小",
        fontWeight: "字体粗细",
        lineHeight: "行间距",
        lineHeightDesc: "行高倍数，例如 1.0 或 1.2",
        fontFamily: "字体列表",
        fontFamilyDesc: "优先使用前面的字体，以逗号分隔",
        scrollback: "回滚缓冲区",
        scrollbackDesc: "保留的历史行数（越大越耗内存）",
        padding: "内容边距",
        paddingDesc: "终端内容与窗口边缘的距离 (px)",
        cursorStyle: "光标样式",
        cursor: {
            block: "方块 (Block)",
            underline: "下划线 (Underline)",
            bar: "竖线 (Bar)"
        }, 
      cursorBlink: "光标闪烁"   
    },
    security: {
      idleTimeout: "空闲自动锁定",
      idleTimeoutDesc: "当没有鼠标或键盘操作超过指定时间后，自动锁定应用。",
      lockShortcut: "快速锁定快捷键",
      lockShortcutDesc: "按下此组合键立即锁定 (例如: Ctrl+Shift+L)。"
    },
    proxy: {
      edit: "编辑代理",
      name: "代理名称",
      name_placeholder: "",
      type: "代理类型",
      host: "代理地址",
      port: "端口",
      auth_hint: "认证",
      username: "用户名",
      password: "密码",
      description: "安全地管理你的代理。密码使用你的主密钥进行加密。",
      add: "新增代理",
      empty: "没有代理配置",
    },
    connection: {
      proxies: "代理"
    },
    backup: {
      webdav: "WebDAV配置",
      auto: "自动备份",
      frequency: "备份周期",
      url: "地址",
      username: "用户名",
      password: "密码",
      secureStatus: "凭据已在本地安全存储",
      notConfigured: "凭据未保存。",
      saveAndTest: "保存&测试连接",
      cloudTitle: "WebDAV同步",
      localTitle: "本地备份",
      backupNow: "立即备份",
      history: "历史备份",
      restoreLatest: "立即恢复",
      restore: "立即恢复",
      unknownDevice: "未知设备",
      historyTitle: "云端记录",
      warningTitle: "警告：数据覆盖",
      warningDesc: "此操作将完全覆盖您当前的本地设置和数据库。未保存的更改将会丢失。您确定吗？",
      confirm: "确认恢复并覆盖",
      connected: "连接成功",
      saved: "凭据已在本地安全存储",
      missing: "请填写 URL 和用户名",
      fetching: "正在获取列表...",
      noBackups: "未找到备份",
      configureFirst: "请先配置 WebDAV",
      restoreSuccess: "恢复成功，请重启应用",
      restoreFailed: "恢复失败，错误代码：{{error}}",
      backupSuccess: "备份成功",
      backupFailed: "备份失败，错误代码：{{error}}",
      loadHistoryFailed: "载入备份历史失败，错误代码：{{error}}",
      savefile: "保存为 .zip 文件",
      restorefile: "从 .zip 文件恢复",
      exportFailed: "导出失败：{{error}}",

    },
    about: {
      version: "当前版本"
    }
  }
  }
    
}
