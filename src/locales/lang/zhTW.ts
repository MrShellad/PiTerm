export const zhTW = {
  translation: {
    menu: {
      home: "儀表板",
      servers: "伺服器",
      snippets: "程式碼庫",
      tools: "工具箱",
      keys: "金鑰管理",
      settings: "設定"
    },

    theme: {
      dark: "深色模式",
      light: "淺色模式",
      switch: "切換主題"
    },

    sidebar: {
      collapse: "收合側邊欄",
      expand: "展開側邊欄"
    },

    app: {
      title: "我的終端機"
    },

    common: {
      password: "密碼",
      default: "預設",
      unlock: "解除鎖定",
      menu: "選單",
      search: "搜尋",
      filters: "篩選",
      loading: "載入中...",
      confirm: "確認",
      cancel: "取消",
      delete: "刪除",
      edit: "編輯",
      save: "儲存",
      create: "建立",
      actions: "操作",
      clearSearch: "清除搜尋條件",
      processing: "處理中...",
      export: "匯出",
      import: "匯入",
      searchPlaceholder: "搜尋...",
      grid_view: "格狀檢視",
      list_view: "清單檢視",
      all: "全部",
      newItem: "新增",
      add: "新增",
      testing: "測試中...",
      testConnection: "測試連線",
      close: "關閉",
      change: "切換",
      loadFile: "本機匯入",
      reset: "重設",
      optional: "選填",
      pickDate: "選擇日期",
      copied: "已複製",
      connect: "連線",
      clickToExpand: "點擊以展開",
      deleteProxy: "刪除代理",
      searchTags: "搜尋標籤",
      noTagsFound: "找不到標籤",
      selectTags: "選擇標籤",
      selected: "已選取",
      clear: "清除",
      exportAll: "全部匯出",
      authRequired: "需要驗證",
      authDesc: "請輸入密碼",
      deleteProxyConfirm: "確定要刪除此代理設定嗎？此操作無法復原。",
      size: {
        small: "小",
        medium: "中",
        large: "大"
      }
    },

    dashboard: {
      emoji: {
        rules: {
          newYear: "新年快樂！",
          christmas: "聖誕快樂！",
          morning: "早安，來杯咖啡吧",
          lunch: "午餐時間到了",
          afternoon: "努力工作中...",
          evening: "晚上好",
          lateNight: "熬夜中，請注意身體",
          default: "準備出發"
        }
      },
      settings: {
        showEmoji: "顯示每日表情",
        resetSponsors: "重設已隱藏的贊助卡片"
      },
      sponsor: {
        hallOfFame: "感謝",
        supportProject: "支持專案",
        joinBackers: "支持者",
        donateViewAll: "查看所有支持者",
        thankYou: "衷心感謝所有對本專案的支持與贊助！",
        becomeSponsor: "成為支持者"
      },
      quickConnect: {
        hint: "格式：user@host 或 user@host:port",
        title: "開始連線",
        error: "連線初始化失敗",
        connecting: "正在連線 {{host}}...",
        invalidFormat: "格式無效，請使用：user@host:port",
        disclaimerTitle: "免責聲明"
      }
    },
        server: {
      errorTrust: "無法信任主機金鑰",
      locked_connect: "請解除金鑰庫鎖定後再進行連線。",
      errorTerminal: "開啟終端機失敗：{{message}}",

      verify: {
        title: "新主機確認",
        desc: "無法確認主機的真實性，這是首次連線到此伺服器。",
        warning: "為防止 MITM 攻擊，請確認此指紋是否與伺服器金鑰相符。",
        trust: "信任並連線"
      },

      sshlog: {
        failed: "連線失敗",
        connecting: "連線中...",
        tunnel: "建立安全通道",
        init: "初始化中..."
      },

      logs: {
        saveError: "儲存指紋失敗",
        trusted: "主機金鑰已信任，正在儲存至 known_hosts...",
        preflight: "正在啟動驗證...",
        preflightError: "指紋比對失敗"
      },

      vault: {
        locked_add: "請解除金鑰庫鎖定以新增伺服器。",
        locked_edit: "請解除金鑰庫鎖定以編輯詳細資訊。"
      },

      deleteKeyUsedWarning: "以下憑證仍被其他伺服器使用：",

      delete: {
        title: "刪除伺服器？",
        confirm: "確定要刪除伺服器「{{name}}」嗎？此操作無法復原。",
        deletePassword: "同時刪除關聯的密碼",
        deleteKey: "同時刪除關聯的金鑰"
      },

      list: {
        searchPlaceholder: "搜尋伺服器名稱、IP...",
        add: "新增伺服器",
        copyIp: "複製 IP",
        empty: "找不到符合條件的伺服器。"
      },

      status: {
        expired: "已過期",
        daysLeft: "剩餘 {{count}} 天"
      },

      columns: {
        name: "伺服器名稱",
        ip: "伺服器位址",
        expiration: "到期時間",
        tags: "標籤",
        actions: "操作"
      },

      sort: {
        newest: "建立時間（最新）",
        oldest: "建立時間（最早）",
        nameAsc: "名稱（A–Z）",
        idDesc: "ID（遞減）",
        idAsc: "ID（遞增）"
      },

      form: {
        titleNew: "新增伺服器",
        titleEdit: "編輯伺服器",
        name: "伺服器名稱",
        namePlaceholder: "例如：正式環境資料庫",
        icon: "圖示",
        theme: "卡片配色",
        provider: "服務供應商",
        selectProvider: "選擇服務供應商...",
        tags: "標籤",
        sort: "排序權重",
        enableExpiration: "到期時間",
        host: "位址",
        port: "連接埠",
        connectionMode: "代理",
        password: "密碼",
        username: "使用者名稱",
        passphrase: "金鑰密碼",
        privateKey: "金鑰資訊",
        credentials: "認證",
        passwordPlaceholder: "輸入密碼",
        sortPriority: "優先順序",
        authType: "認證類型",
        tagPlaceholder: "輸入標籤",
        createProvider: "新增",
        testSuccess: "連線成功！",
        checkRequired: "請檢查必填欄位。",
        testFailed: "連線失敗：{{error}}",
        saveError: "儲存失敗：{{message}}",
        saveSuccess: "儲存成功",
        existing: "服務供應商",

        vault: {
          locked_save: "請解除金鑰庫鎖定以儲存安全憑證。",
          select: "從金鑰庫選擇",
          keyReady: "金鑰準備就緒",
          associated: "金鑰庫驗證完成",
          key: "金鑰登入",
          password: "密碼登入",
          selectKeyTitle: "選擇金鑰",
          noKeysFound: "在金鑰庫中找不到任何私密金鑰",
          searchKeys: "搜尋金鑰..."
        },

        tabs: {
          basic: "基本設定",
          advanced: "進階設定"
        },

        select_proxyplaceholder: "選擇代理...",
        select_proxylabel: "選擇代理設定",
        list_proxyempty: "沒有符合類型的代理",
        timeout: "連線逾時",
        timeoutDesc: "最大等待時間（秒）",
        keepalive: "Keepalive 間隔",
        keepaliveDesc: "間隔秒數（設為 0 以停用）",
        reconnect: "自動重新連線",
        reconnectDesc: "連線中斷時自動重新嘗試。",
        retries: "重試次數",
        retriesDesc: "最大嘗試次數"
      }
    },
        terminal: {
      connecting: "正在連線至伺服器...",
      reconnectAuth: "工作階段已過期",
      reconnectDesc: "這是臨時連線，請輸入密碼以繼續。",
      welcome: {
        title: "伺服器列表",
        subtitle: "快速開始吧"
      },
      tabs: {
        reconnect: "重新連線",
        split: "加入分割畫面",
        unsplit: "取消分割畫面",
        close: "關閉目前分頁",
        closeOthers: "關閉其他分頁",
        closeAll: "關閉所有分頁",
        rename: "重新命名"
      }
    },

    cmd: {
      collapseFileManager: "收合檔案管理器",
      expandFileManager: "展開檔案管理器",
      library: "命令記錄",
      snippets: "程式碼片段",
      history: "命令歷史",
      searchPlaceholder: "搜尋...",
      snippetsnotFound: "空",
      commonrun: "貼上並立即執行",
      commoninsert: "填入輸入框",
      commonloading: "命令歷史載入中...",
      typeCommand: "輸入命令...",
      historynoSession: "沒有可用的工作階段",
      broadcastOn: "廣播開啟",
      broadcastOff: "廣播關閉",
      commondelete: "刪除",
      historyempty: "空"
    },
        monitor: {
      collapse: "收合",
      expand: "展開",
      title: "系統監控",
      loading: "載入中...",
      total: "總計",
      disabled: "未啟用",
      moreInfo: "更多資訊",
      copied: "已複製！",
      openAdvanced: "進階儀表板（未完成）",
      cpu: {
        title: "CPU 處理器",
        totalUsage: "總使用率",
        cores: "{{count}} 核心",
        history: "最近 60 秒使用率趨勢"
      },
      memory: {
        title: "記憶體",
        ramUsage: "記憶體使用量",
        ram: "實體記憶體",
        swap: "交換空間（Swap）"
      },
      disk: {
        title: "磁碟儲存",
        details: "磁碟詳細資訊",
        usage: "空間使用量",
        free: "可用",
        read: "讀取",
        write: "寫入"
      },
      info: {
        title: "系統資訊",
        uptime: "已運行時間",
        distro: "發行版",
        kernel: "核心",
        arch: "架構",
        timezone: "時區"
      },
      network: {
        title: "網路流量",
        details: "網卡介面詳細資訊",
        realtime: "即時網速",
        total: "總計"
      }
    },

    keys: {
      empty: "找不到金鑰",
      searchPlaceholder: "搜尋金鑰",
      add: "新增金鑰",
      action: {
        add: "新增憑證",
        edit: "編輯憑證",
        importFile: "匯入檔案"
      },
      label: {
        remarkName: "備註名稱",
        username: "使用者名稱",
        password: "密碼",
        privateKey: "私密金鑰",
        passwordContent: "密碼內容",
        passphrase: "密碼短語"
      },
      placeholder: {
        remarkName: "例如：正式環境資料庫",
        username: "選填",
        privateKey: "在此貼上您的私密金鑰內容",
        passphrase: "選填（僅當私密金鑰已加密時）",
        setPwd: "設定密碼",
        enterPwd: "輸入密碼",
        confirmPwd: "確認密碼"
      },
      msg: {
        noPassphrase: "未設定密碼短語"
      },
      error: {
        pwdMismatch: "密碼不一致",
        pwdShort: "密碼至少需要 6 個字元",
        wrongPwd: "密碼錯誤"
      },
      setup: {
        title: "設定主密碼",
        unlock_title: "解除金鑰庫鎖定",
        desc: "您的金鑰已使用主密碼加密，請先設定以繼續。",
        unlock_desc: "請輸入主密碼以存取您的金鑰。"
      },
      delete: {
        title: "刪除憑證",
        confirm: "確定要刪除此憑證嗎？此操作無法復原。",
        warning: "已關聯 {{count}} 台伺服器",
        impact: "刪除此金鑰將中斷與以下項目的連線："
      }
    },
        fs: {
      nav: {
        back: "返回",
        forward: "前進",
        up: "回到上一層"
      },
      context: {
        new: "新增",
        newFile: "新增檔案",
        newFolder: "新增資料夾",
        openTerminal: "在此處開啟終端機",
        openBuiltin: "使用內建編輯器開啟",
        openLocal: "在本機開啟",
        copyPath: "複製路徑",
        rename: "重新命名",
        download: "下載",
        copy: "複製",
        cut: "移動",
        permissions: "修改權限",
        delete: "刪除",
        paste: "貼上",
        pasteInto: "貼上至此處",
        upload: "上傳檔案",
        permission: "修改權限"
      },
      placeholder: {
        file: "example.txt",
        folder: "新增資料夾"
      },
      msg: {
        createSuccess: "建立成功",
        renameSuccess: "重新命名成功",
        deleteSuccess: "刪除成功",
        pathCopied: "路徑已複製",
        copyFailed: "複製失敗",
        termPathUpdated: "終端機路徑已更新",
        copied: "已複製至剪貼簿",
        cut: "已剪下（移動）",
        pasteSuccess: "貼上完成",
        uploading: "正在上傳...",
        uploadSuccess: "上傳成功",
        uploadFailed: "上傳失敗",
        downloading: "正在下載...",
        downloadSuccess: "下載成功",
        downloadFailed: "下載失敗",
        chmodSuccess: "權限修改成功"
      },
      perm: {
        prop_file: "目標",
        scope: "範圍",
        owner: "擁有者",
        group: "群組",
        others: "其他使用者",
        dir: "資料夾",
        read: "讀取",
        write: "寫入",
        execute: "執行",
        recursive: "遞迴套用至子目錄與檔案",
        octal: "權限碼"
      },
      dialog: {
        deleteConfirm: "!! 刪除後無法復原 !!",
        enterName: "名稱"
      },
      error: {
        generic: "操作失敗",
        exist: "目標已存在",
        notFound: "找不到路徑或檔案",
        permission: "權限不足",
        timeout: "操作逾時",
        folderCopy: "目前不支援資料夾複製",
        folderDownload: "目前不支援資料夾下載"
      },
      action: {
        refresh: "重新整理",
        upload: "上傳檔案",
        cancel: "取消"
      },
      view: {
        showHidden: "顯示隱藏檔案",
        hideHidden: "不顯示隱藏檔案"
      },
      transfer: {
        manager: "傳輸管理",
        title: "檔案傳輸",
        to: "位置",
        open_folder: "開啟檔案位置",
        empty: "沒有傳輸紀錄",
        clear: "清除歷史紀錄"
      },
      col: {
        name: "名稱",
        size: "大小",
        perm: "權限",
        owner: "擁有者",
        date: "修改日期"
      },
      status: {
        pending: "等待中",
        processing: "處理中",
        completed: "已完成",
        error: "錯誤",
        canceled: "已取消",
        noConnection: "未連線",
        connectTip: "請先連線至 SSH 伺服器以管理檔案"
      },
      empty: "此資料夾為空"
    },

    snippet: {
      copy_hint: "點擊複製",
      search_placeholder: "搜尋程式碼庫",
      empty_state: "程式碼庫是空的",
      label: "新增程式碼區塊",
      fields: {
        title: "標題",
        title_placeholder: "輸入標題",
        edit_title: "編輯程式碼",
        new_title: "新增程式碼",
        tags: "標籤",
        language: "語言類型",
        code: "程式碼",
        code_placeholder: "在此輸入程式碼",
        tagsPlaceholder: "選擇標籤..."
      },
      delete_title: "刪除程式碼片段？",
      delete_confirm: "確定要刪除此程式碼片段嗎？此操作無法復原。"
    },

    tools: {
      placeholder: {
        title: "工具箱",
        subtitle: "透過強大的實用工具擴展您的工作流程",
        footer: "有特定的工具想法嗎？",
        request: "回饋功能建議"
      },
      upcoming: {
        docker: {
          title: "Docker 管理",
          desc: "視覺化容器狀態、日誌監控及一鍵生命週期管理。"
        },
        network: {
          title: "路由測試",
          desc: "專業的 MTR、延遲分析與全域網路路徑追蹤工具。"
        },
        security: {
          title: "安全稽核",
          desc: "伺服器弱點掃描、連接埠檢測與合規報告產生。"
        },
        monitoring: {
          title: "即時監控",
          desc: "動態資源使用圖表與自訂指標警示通知。"
        }
      }
    },

    settings: {
      title: "設定",
      itemsCount: "{{count}} 項設定",
      noResults: "找不到相關設定",
      nav: {
        general: "一般",
        appearance: "外觀",
        terminal: "終端機",
        connection: "連線",
        security: "安全",
        backup: "資料",
        about: "關於"
      },

      general: {
        deviceName: "裝置名稱",
        deviceNameDesc: "用於識別此裝置的備份",
        language: "介面語言",
        languageDesc: "變更應用程式顯示的語言",
        autoUpdate: "自動更新",
        autoUpdateDesc: "自動檢查並下載新版本",
        launchAtStartup: "開機自動啟動",
        launchAtStartupDesc: "系統登入時自動啟動應用程式",
        minimizeToTray: "最小化至系統匣",
        minimizeToTrayDesc: "最小化時隱藏工作列圖示，僅顯示於系統匣",
        closeBehavior: "關閉主視窗時",
        closeBehaviorDesc: "點擊視窗關閉按鈕（X）時的行為",
        languageOptions: {
          auto: "跟隨系統"
        },
        behavior: {
          quit: "結束程式",
          minimize: "最小化至系統匣"
        }
      },

      appearance: {
        universal: "通用背景設定",
        appTheme: "外觀主題",
        syncTerminalTheme: "終端機配色同步",
        syncTerminalThemeDesc: "終端機配色自動跟隨主題變更",
        lightTerminalTheme: "淺色模式終端機配色",
        darkTerminalTheme: "深色模式終端機配色",
        terminalTheme: "終端機配色",
        manageThemes: "配色方案",
        manageThemesDesc: "管理配色方案",
        highlightRules: "高亮規則",
        uiFont: "UI 字型",
        uiFontDesc: "從系統中選擇字型",
        searchFont: "搜尋字型...",
        overlay: "遮罩顏色",
        overlayOpacity: "遮罩透明度",
        themeOptions: {
          system: "跟隨系統",
          light: "淺色模式",
          dark: "深色模式"
        },
        lightThemeScheme: "亮色主題方案",
        lightThemeSchemeDesc: "配置亮色模式下的配色方案",
        lightThemeOptions: {
          default: "預設 (冷灰)",
          claude: "Claude 淺色 (Parchment)"
        },
        noWallpaper: "無背景",
        changeWallpaper: "更換背景",
        syncBackground: "背景同步",
        syncBackgroundDesc: "讓背景與主題色同步",
        blur: "背景模糊度",
        brightness: "背景亮度",
        saved: "背景設定成功",
        error: "背景設定失敗",
        imageTooLarge: "圖片大小上限為 10MB",
        fontRestored: "已還原預設字型",
        fontApplied: "字型已套用：{{font}}",
        systemDefault: "系統預設"
      },

      terminal: {
        preview: "即時預覽",
        rendererType: "渲染引擎",
        rendererTypeDesc: "選擇終端機的前端繪製方式",
        renderer: {
          webgl: "WebGL（GPU 加速－推薦）",
          canvas: "Canvas（相容性佳）",
          dom: "DOM（較慢－僅供除錯）"
        },
        theme: "配色方案",
        fontSize: "字型大小",
        fontWeight: "字型粗細",
        lineHeight: "行距",
        lineHeightDesc: "行高倍率，例如 1.0 或 1.2",
        fontFamily: "字型列表",
        fontFamilyDesc: "以逗號分隔，前者優先",
        scrollback: "回捲緩衝區",
        scrollbackDesc: "保留的歷史行數（數值越大越耗記憶體）",
        padding: "內容邊距",
        paddingDesc: "終端機內容與視窗邊緣的距離（px）",
        cursorStyle: "游標樣式",
        cursor: {
          block: "方塊（Block）",
          underline: "底線（Underline）",
          bar: "直線（Bar）"
        },
        cursorBlink: "游標閃爍"
      },

      security: {
        idleTimeout: "閒置自動鎖定",
        idleTimeoutDesc: "超過指定時間未操作時，自動鎖定應用程式。",
        lockShortcut: "快速鎖定快捷鍵",
        lockShortcutDesc: "按下此組合鍵立即鎖定（例如：Ctrl+Shift+L）。",
        pinManager: "主密碼 (PIN)",
        pinManagerDesc: "修改或管理用於保險庫及敏感資訊加密的主密碼 (PIN)。",
        changePin: "修改 PIN 碼",
        oldPin: "目前 PIN 碼",
        newPin: "新 PIN 碼",
        confirmPin: "確認新 PIN 碼",
        pinLengthError: "PIN 碼長度必須至少為 6 位",
        pinMismatchError: "兩次輸入的新 PIN 碼不一致",
        oldPinIncorrect: "目前 PIN 碼不正確",
        changeSuccess: "主密碼修改成功",
        changeFailed: "修改主密碼失敗",
        uninitializedWarning: "主密碼未設定。請先前往【金鑰管理】初始化保險庫。",
        goToKeys: "前往金鑰管理"
      },

      proxy: {
        edit: "編輯代理",
        name: "代理名稱",
        name_placeholder: "",
        type: "代理類型",
        host: "代理位址",
        port: "連接埠",
        auth_hint: "認證",
        username: "使用者名稱",
        password: "密碼",
        description: "安全地管理您的代理。密碼會使用主金鑰進行加密。",
        add: "新增代理",
        empty: "沒有代理設定"
      },

      connection: {
        proxies: "代理"
      },

      backup: {
        webdav: "WebDAV 設定",
        auto: "自動備份",
        frequency: "備份週期",
        url: "位址",
        username: "使用者名稱",
        password: "密碼",
        secureStatus: "憑證已安全儲存在本機",
        notConfigured: "憑證尚未儲存。",
        saveAndTest: "儲存並測試連線",
        cloudTitle: "WebDAV 同步",
        localTitle: "本機備份",
        backupNow: "立即備份",
        history: "備份歷史",
        restoreLatest: "立即還原",
        restore: "立即還原",
        unknownDevice: "未知裝置",
        historyTitle: "雲端紀錄",
        warningTitle: "警告：資料覆寫",
        warningDesc: "此操作將完全覆寫目前的本機設定與資料庫，未儲存的變更將會遺失。確定要繼續嗎？",
        confirm: "確認還原並覆寫",
        connected: "連線成功",
        saved: "憑證已安全儲存",
        missing: "請填寫 URL 與使用者名稱",
        fetching: "正在取得清單...",
        noBackups: "找不到備份",
        configureFirst: "請先設定 WebDAV",
        restoreSuccess: "還原成功，請重新啟動應用程式",
        restoreFailed: "還原失敗，錯誤代碼：${e}",
        backupSuccess: "備份成功",
        backupFailed: "備份失敗，錯誤代碼：${e}",
        loadHistoryFailed: "載入備份歷史失敗，錯誤代碼：${e}",
        savefile: "儲存為 .zip 檔案",
        restorefile: "從 .zip 檔案還原"
      },

      about: {
        version: "目前版本",
        microsoftStore: "微軟商店",
        microsoftStoreDesc: "在微軟商店中為 PiTerm 評分或檢查更新",
        openInStore: "在商店中開啟"
      }
    }
  }
};
