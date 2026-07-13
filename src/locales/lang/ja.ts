export const ja = {
  translation: {
    menu: {
      home: "ダッシュボード",
      servers: "サーバー",
      snippets: "コードライブラリ",
      tools: "ツールボックス",
      keys: "キー管理",
      settings: "設定"
    },

    theme: {
      dark: "ダークモード",
      light: "ライトモード",
      switch: "テーマ切替"
    },

    sidebar: {
      collapse: "サイドバーを折りたたむ",
      expand: "サイドバーを展開"
    },

    app: {
      title: "マイターミナル"
    },

    common: {
      password: "パスワード",
      default: "デフォルト",
      unlock: "解除",
      menu: "メニュー",
      search: "検索",
      filters: "フィルター",
      loading: "読み込み中...",
      confirm: "確認",
      cancel: "キャンセル",
      delete: "削除",
      edit: "編集",
      save: "保存",
      create: "作成",
      actions: "操作",
      clearSearch: "検索条件をクリア",
      processing: "処理中...",
      export: "エクスポート",
      import: "インポート",
      searchPlaceholder: "検索...",
      grid_view: "グリッド表示",
      list_view: "リスト表示",
      all: "すべて",
      newItem: "新規",
      add: "追加",
      testing: "テスト中...",
      testConnection: "接続テスト",
      close: "閉じる",
      change: "切替",
      loadFile: "ローカルからインポート",
      reset: "リセット",
      optional: "任意",
      pickDate: "日付を選択",
      copied: "コピーしました",
      connect: "接続",
      clickToExpand: "クリックして展開",
      deleteProxy: "プロキシを削除",
      searchTags: "タグを検索",
      noTagsFound: "タグが見つかりません",
      selectTags: "タグを選択",
      selected: "選択済み",
      clear: "クリア",
      exportAll: "すべてエクスポート",
      authRequired: "認証が必要です",
      authDesc: "パスワードを入力してください",
      deleteProxyConfirm:
        "このプロキシ設定を削除してもよろしいですか？この操作は元に戻せません。",
      size: {
        small: "小",
        medium: "中",
        large: "大"
      }
    },

    dashboard: {
      emoji: {
        rules: {
          newYear: "あけましておめでとうございます！",
          christmas: "メリークリスマス！",
          morning: "おはようございます。コーヒーでもどうですか",
          lunch: "ランチの時間です",
          afternoon: "作業中...",
          evening: "こんばんは",
          lateNight: "夜更かし中。体調に気をつけてください",
          default: "準備完了"
        }
      },
      settings: {
        showEmoji: "毎日の絵文字を表示",
        resetSponsors: "非表示にしたスポンサーをリセット"
      },
      sponsor: {
        hallOfFame: "感謝",
        supportProject: "プロジェクトを支援",
        joinBackers: "支援者",
        donateViewAll: "すべての支援者を見る",
        thankYou:
          "本プロジェクトを支援・スポンサーしてくださった皆様に心より感謝します！",
        becomeSponsor: "支援者になる"
      },
      quickConnect: {
        hint: "形式: user@host または user@host:port",
        title: "接続開始",
        error: "接続の初期化に失敗しました",
        connecting: "{{host}} に接続中...",
        invalidFormat:
          "形式が無効です。user@host:port を使用してください。",
        disclaimerTitle: "免責事項"
      }
    },

    server: {
      errorTrust: "ホストキーを信頼できません",
      locked_connect: "接続するにはキー保管庫を解除してください。",
      errorTerminal: "ターミナルを開けませんでした: {{message}}",
      verify: {
        title: "新しいホストの確認",
        desc:
          "ホストの真正性を確認できません。これはこのサーバーへの初回接続です。",
        warning:
          "MITM 攻撃を防ぐため、指紋がサーバーのキーと一致するか確認してください。",
        trust: "信頼して接続"
      },
      sshlog: {
        failed: "接続失敗",
        connecting: "接続中...",
        tunnel: "安全なトンネルを確立中",
        init: "初期化中..."
      },
      logs: {
        saveError: "指紋の保存に失敗しました",
        trusted:
          "ホストキーを信頼しました。known_hosts に保存しています...",
        preflight: "検証を開始しています...",
        preflightError: "指紋の検証に失敗しました"
      },
      vault: {
        locked_add: "サーバーを追加するにはキー保管庫を解除してください。",
        locked_edit: "詳細を編集するにはキー保管庫を解除してください。"
      },
      deleteKeyUsedWarning: "他のサーバーで使用されている認証情報:",
      delete: {
        title: "サーバーを削除しますか？",
        confirm:
          "サーバー「{{name}}」を削除してもよろしいですか？この操作は元に戻せません。",
        deletePassword: "関連するパスワードも削除",
        deleteKey: "関連するキーも削除"
      },
      list: {
        searchPlaceholder: "サーバー名・IP を検索...",
        add: "サーバーを追加",
        copyIp: "IP をコピー",
        empty: "条件に一致するサーバーが見つかりません。"
      },
      status: {
        expired: "期限切れ",
        daysLeft: "残り {{count}} 日"
      },
      columns: {
        name: "サーバー名",
        ip: "サーバーアドレス",
        expiration: "有効期限",
        tags: "タグ",
        actions: "操作"
      },
      sort: {
        newest: "作成日（新しい順）",
        oldest: "作成日（古い順）",
        nameAsc: "名前（A–Z）",
        idDesc: "ID（降順）",
        idAsc: "ID（昇順）"
      },

      form: {
        titleNew: "サーバー新規作成",
        titleEdit: "サーバー編集",
        name: "サーバー名",
        namePlaceholder: "例：本番データベース",
        icon: "アイコン",
        provider: "プロバイダー",
        selectProvider: "プロバイダーを選択...",
        tags: "タグ",
        sort: "並び順",
        enableExpiration: "有効期限",
        host: "アドレス",
        port: "ポート",
        connectionMode: "プロキシ",
        password: "パスワード",
        username: "ユーザー名",
        passphrase: "キーパスフレーズ",
        privateKey: "秘密鍵",
        credentials: "認証情報",
        passwordPlaceholder: "パスワードを入力",
        sortPriority: "優先度",
        authType: "認証方式",
        tagPlaceholder: "タグを入力",
        createProvider: "作成",
        testSuccess: "接続に成功しました！",
        checkRequired: "必須項目を確認してください。",
        testFailed: "接続失敗: {{error}}",
        saveError: "保存に失敗しました: {{message}}",
        saveSuccess: "保存しました",
        existing: "プロバイダー",

        vault: {
          locked_save: "認証情報を保存するにはキー保管庫を解除してください。",
          select: "保管庫から選択",
          keyReady: "キー準備完了",
          associated: "保管庫の検証が完了しました",
          key: "キー認証",
          password: "パスワード認証",
          selectKeyTitle: "キーを選択",
          noKeysFound: "保管庫に秘密鍵が見つかりません",
          searchKeys: "キーを検索..."
        },

        tabs: {
          basic: "基本設定",
          advanced: "詳細設定"
        },

        select_proxyplaceholder: "プロキシを選択...",
        select_proxylabel: "プロキシ設定を選択",
        list_proxyempty: "一致するプロキシがありません",
        timeout: "接続タイムアウト",
        timeoutDesc: "最大待機時間（秒）",
        keepalive: "キープアライブ間隔",
        keepaliveDesc: "間隔（秒）。0 で無効",
        reconnect: "自動再接続",
        reconnectDesc: "切断時に自動で再試行します。",
        retries: "再試行回数",
        retriesDesc: "最大試行回数"
      }
    },

    terminal: {
      connecting: "サーバーに接続中...",
      reconnectAuth: "セッションの有効期限が切れました",
      reconnectDesc:
        "これは一時接続です。続行するにはパスワードを入力してください。",
      welcome: {
        title: "サーバー一覧",
        subtitle: "すぐに始めましょう"
      },
      tabs: {
        reconnect: "再接続",
        split: "分割表示に追加",
        unsplit: "分割解除",
        close: "現在のタブを閉じる",
        closeOthers: "他のタブを閉じる",
        closeAll: "すべて閉じる",
        rename: "名前を変更"
      }
    },

    cmd: {
      collapseFileManager: "ファイルマネージャーを折りたたむ",
      expandFileManager: "ファイルマネージャーを展開",
      library: "コマンド履歴",
      snippets: "コードスニペット",
      history: "コマンド履歴",
      searchPlaceholder: "検索...",
      snippetsnotFound: "空",
      commonrun: "貼り付けてすぐ実行",
      commoninsert: "入力欄に挿入",
      commonloading: "履歴を読み込み中...",
      typeCommand: "コマンドを入力...",
      historynoSession: "使用可能なセッションがありません",
      broadcastOn: "ブロードキャスト ON",
      broadcastOff: "ブロードキャスト OFF",
      commondelete: "削除",
      historyempty: "空"
    },

    monitor: {
      collapse: "折りたたむ",
      expand: "展開",
      title: "システムモニター",
      loading: "読み込み中...",
      total: "合計",
      disabled: "無効",
      moreInfo: "詳細",
      copied: "コピーしました！",
      openAdvanced: "高度なダッシュボード（未完成）",
      cpu: {
        title: "CPU",
        totalUsage: "総使用率",
        cores: "{{count}} コア",
        history: "過去 60 秒の使用率推移"
      },
      memory: {
        title: "メモリ",
        ramUsage: "メモリ使用量",
        ram: "物理メモリ",
        swap: "スワップ"
      },
      disk: {
        title: "ディスクストレージ",
        details: "ディスク詳細",
        usage: "使用量",
        free: "空き",
        read: "読み込み",
        write: "書き込み"
      },
      info: {
        title: "システム情報",
        uptime: "稼働時間",
        distro: "ディストリビューション",
        kernel: "カーネル",
        arch: "アーキテクチャ",
        timezone: "タイムゾーン"
      },
      network: {
        title: "ネットワークトラフィック",
        details: "インターフェース詳細",
        realtime: "リアルタイム速度",
        total: "合計"
      }
    },

    keys: {
      empty: "キーが見つかりません",
      searchPlaceholder: "キーを検索",
      add: "キーを追加",
      action: {
        add: "認証情報を追加",
        edit: "認証情報を編集",
        importFile: "ファイルをインポート"
      },
      label: {
        remarkName: "備考名",
        username: "ユーザー名",
        password: "パスワード",
        privateKey: "秘密鍵",
        passwordContent: "パスワード内容",
        passphrase: "パスフレーズ"
      },
      placeholder: {
        remarkName: "例：本番データベース",
        username: "任意",
        privateKey: "ここに秘密鍵を貼り付けてください",
        passphrase: "任意（鍵が暗号化されている場合）",
        setPwd: "パスワードを設定",
        enterPwd: "パスワードを入力",
        confirmPwd: "パスワードを確認"
      },
      msg: {
        noPassphrase: "パスフレーズ未設定"
      },
      error: {
        pwdMismatch: "パスワードが一致しません",
        pwdShort: "パスワードは 6 文字以上必要です",
        wrongPwd: "パスワードが正しくありません"
      },
      setup: {
        title: "マスターパスワード設定",
        unlock_title: "保管庫を解除",
        desc:
          "キーはマスターパスワードで暗号化されています。続行するには設定してください。",
        unlock_desc:
          "キーにアクセスするにはマスターパスワードを入力してください。"
      },
      delete: {
        title: "認証情報を削除",
        confirm:
          "この認証情報を削除してもよろしいですか？この操作は元に戻せません。",
        warning: "{{count}} 台のサーバーに関連付けられています",
        impact:
          "このキーを削除すると、以下との接続が切断されます："
      }
    },

    fs: {
      nav: {
        back: "戻る",
        forward: "進む",
        up: "上の階層へ"
      },
      context: {
        new: "新規",
        newFile: "新しいファイル",
        newFolder: "新しいフォルダー",
        openTerminal: "ここでターミナルを開く",
        openBuiltin: "内蔵エディタで開く",
        openLocal: "ローカルで開く",
        copyPath: "パスをコピー",
        rename: "名前を変更",
        download: "ダウンロード",
        copy: "コピー",
        cut: "移動",
        permissions: "権限を変更",
        delete: "削除",
        paste: "貼り付け",
        pasteInto: "ここに貼り付け",
        upload: "ファイルをアップロード",
        permission: "権限を変更"
      },
      placeholder: {
        file: "example.txt",
        folder: "新しいフォルダー"
      },
      msg: {
        createSuccess: "作成しました",
        renameSuccess: "名前を変更しました",
        deleteSuccess: "削除しました",
        pathCopied: "パスをコピーしました",
        copyFailed: "コピーに失敗しました",
        termPathUpdated: "ターミナルのパスを更新しました",
        copied: "クリップボードにコピーしました",
        cut: "切り取り（移動）しました",
        pasteSuccess: "貼り付け完了",
        uploading: "アップロード中...",
        uploadSuccess: "アップロード成功",
        uploadFailed: "アップロード失敗",
        downloading: "ダウンロード中...",
        downloadSuccess: "ダウンロード成功",
        downloadFailed: "ダウンロード失敗",
        chmodSuccess: "権限を変更しました"
      },
      perm: {
        prop_file: "対象",
        scope: "範囲",
        owner: "所有者",
        group: "グループ",
        others: "その他",
        dir: "フォルダー",
        read: "読み取り",
        write: "書き込み",
        execute: "実行",
        recursive: "再帰的に適用",
        octal: "権限コード"
      },
      dialog: {
        deleteConfirm: "!! 削除後は復元できません !!",
        enterName: "名前"
      },
      error: {
        generic: "操作に失敗しました",
        exist: "対象は既に存在します",
        notFound: "パスまたはファイルが見つかりません",
        permission: "権限がありません",
        timeout: "操作がタイムアウトしました",
        folderCopy: "フォルダーのコピーは未対応です",
        folderDownload: "フォルダーのダウンロードは未対応です"
      },
      action: {
        refresh: "更新",
        upload: "アップロード",
        cancel: "キャンセル"
      },
      view: {
        showHidden: "隠しファイルを表示",
        hideHidden: "隠しファイルを非表示"
      },
      transfer: {
        manager: "転送管理",
        title: "ファイル転送",
        to: "場所",
        open_folder: "保存先を開く",
        empty: "転送履歴がありません",
        clear: "履歴をクリア"
      },
      col: {
        name: "名前",
        size: "サイズ",
        perm: "権限",
        owner: "所有者",
        date: "更新日時"
      },
      status: {
        pending: "待機中",
        processing: "処理中",
        completed: "完了",
        error: "エラー",
        canceled: "キャンセル済み",
        noConnection: "未接続",
        connectTip:
          "ファイルを管理するには SSH サーバーに接続してください"
      },
      empty: "このフォルダーは空です"
    },

    snippet: {
      copy_hint: "クリックしてコピー",
      search_placeholder: "コードライブラリを検索",
      empty_state: "コードライブラリは空です",
      label: "コードブロックを追加",
      fields: {
        title: "タイトル",
        title_placeholder: "タイトルを入力",
        edit_title: "コードを編集",
        new_title: "新しいコード",
        tags: "タグ",
        language: "言語",
        code: "コード",
        code_placeholder: "ここにコードを入力",
        tagsPlaceholder: "タグを選択..."
      },
      delete_title: "スニペットを削除しますか？",
      delete_confirm:
        "このスニペットを削除してもよろしいですか？この操作は元に戻せません。"
    },

    tools: {
      placeholder: {
        title: "ツールボックス",
        subtitle: "強力なユーティリティでワークフローを拡張",
        footer: "ツールのアイデアはありますか？",
        request: "機能提案を送信"
      },
      upcoming: {
        docker: {
          title: "Docker 管理",
          desc:
            "コンテナの状態・ログを可視化し、ワンクリックでライフサイクル管理。"
        },
        network: {
          title: "ルートテスト",
          desc:
            "MTR、遅延分析、グローバル経路追跡ツール。"
        },
        security: {
          title: "セキュリティ監査",
          desc:
            "サーバー脆弱性スキャン、ポート検査、コンプライアンスレポート生成。"
        },
        monitoring: {
          title: "リアルタイム監視",
          desc:
            "動的リソースグラフとカスタムアラート通知。"
        }
      }
    },

    settings: {
      title: "設定",
      itemsCount: "{{count}} 件の設定",
      noResults: "設定が見つかりません",
      nav: {
        general: "一般",
        appearance: "外観",
        terminal: "ターミナル",
        connection: "接続",
        security: "セキュリティ",
        backup: "データ",
        about: "情報"
      },

      general: {
        deviceName: "デバイス名",
        deviceNameDesc: "このデバイスのバックアップ識別用",
        language: "言語",
        languageDesc: "アプリの表示言語を変更",
        autoUpdate: "自動更新",
        autoUpdateDesc: "新しいバージョンを自動確認・取得",
        launchAtStartup: "起動時に開始",
        launchAtStartupDesc: "ログイン時に自動起動",
        minimizeToTray: "トレイに最小化",
        minimizeToTrayDesc: "最小化時にタスクバーから非表示",
        closeBehavior: "ウィンドウを閉じたとき",
        closeBehaviorDesc: "閉じる（X）を押したときの動作",
        languageOptions: {
          auto: "システムに従う"
        },
        behavior: {
          quit: "アプリを終了",
          minimize: "トレイに最小化"
        }
      },

      appearance: {
        universal: "共通背景設定",
        appTheme: "アプリテーマ",
        syncTerminalTheme: "ターミナル配色を同期",
        syncTerminalThemeDesc: "テーマに合わせて自動同期",
        lightTerminalTheme: "ライトモード配色",
        darkTerminalTheme: "ダークモード配色",
        terminalTheme: "ターミナル配色",
        manageThemes: "配色管理",
        manageThemesDesc: "配色スキームを管理",
        highlightRules: "ハイライトルール",
        uiFont: "UI フォント",
        uiFontDesc: "システムフォントを選択",
        searchFont: "フォントを検索...",
        overlay: "オーバーレイ色",
        overlayOpacity: "オーバーレイ透明度",
        themeOptions: {
          system: "システム",
          light: "ライト",
          dark: "ダーク"
        },
        lightThemeScheme: "ライトテーマ設定",
        lightThemeSchemeDesc: "ライトモードで使用する配色を設定します",
        lightThemeOptions: {
          default: "デフォルト (クールグレー)",
          claude: "Claude ライト (Parchment)"
        },
        noWallpaper: "背景なし",
        changeWallpaper: "背景を変更",
        syncBackground: "背景を同期",
        syncBackgroundDesc: "テーマカラーと同期",
        blur: "背景ぼかし",
        brightness: "背景の明るさ",
        saved: "背景設定を保存しました",
        error: "背景設定に失敗しました",
        imageTooLarge: "画像サイズは 10MB までです",
        fontRestored: "デフォルトフォントに戻しました",
        fontApplied: "フォントを適用しました: {{font}}",
        systemDefault: "システム標準"
      },

      terminal: {
        preview: "リアルタイムプレビュー",
        rendererType: "描画エンジン",
        rendererTypeDesc: "ターミナルの描画方式を選択",
        renderer: {
          webgl: "WebGL（GPU 加速・推奨）",
          canvas: "Canvas（互換性重視）",
          dom: "DOM（低速・デバッグ用）"
        },
        theme: "配色",
        fontSize: "フォントサイズ",
        fontWeight: "フォント太さ",
        lineHeight: "行間",
        lineHeightDesc: "行高倍率（例: 1.0 / 1.2）",
        fontFamily: "フォント一覧",
        fontFamilyDesc: "カンマ区切り（優先順）",
        scrollback: "スクロールバック",
        scrollbackDesc: "保持する履歴行数",
        padding: "余白",
        paddingDesc: "ウィンドウ端との距離（px）",
        cursorStyle: "カーソル形状",
        cursor: {
          block: "ブロック",
          underline: "下線",
          bar: "バー"
        },
        cursorBlink: "カーソル点滅"
      },

      security: {
        idleTimeout: "自動ロック（アイドル）",
        idleTimeoutDesc: "操作がない場合に自動ロック",
        lockShortcut: "クイックロック",
        lockShortcutDesc:
          "即時ロックのショートカット（例: Ctrl+Shift+L）",
        pinManager: "マスター PIN",
        pinManagerDesc: "保管庫のマスター PIN コードを管理および変更します",
        changePin: "PIN を変更",
        oldPin: "現在の PIN",
        newPin: "新しい PIN",
        confirmPin: "新しい PIN の確認",
        pinLengthError: "PIN は 6 文字以上である必要があります",
        pinMismatchError: "新しい PIN が一致しません",
        oldPinIncorrect: "現在の PIN が正しくありません",
        changeSuccess: "マスター PIN が正常に変更されました",
        changeFailed: "PIN の変更に失敗しました",
        uninitializedWarning: "マスター PIN が設定されていません。先にキー管理で保管庫を初期化してください。",
        goToKeys: "キー管理へ進む"
      },

      proxy: {
        edit: "プロキシ編集",
        name: "プロキシ名",
        name_placeholder: "",
        type: "プロキシタイプ",
        host: "プロキシアドレス",
        port: "ポート",
        auth_hint: "認証",
        username: "ユーザー名",
        password: "パスワード",
        description:
          "プロキシを安全に管理します。パスワードはマスターキーで暗号化されます。",
        add: "プロキシ追加",
        empty: "プロキシ設定がありません"
      },

      connection: {
        proxies: "プロキシ"
      },

      backup: {
        webdav: "WebDAV 設定",
        auto: "自動バックアップ",
        frequency: "バックアップ頻度",
        url: "URL",
        username: "ユーザー名",
        password: "パスワード",
        secureStatus: "認証情報は安全に保存されています",
        notConfigured: "認証情報が保存されていません",
        saveAndTest: "保存して接続テスト",
        cloudTitle: "WebDAV 同期",
        localTitle: "ローカルバックアップ",
        backupNow: "今すぐバックアップ",
        history: "バックアップ履歴",
        restoreLatest: "最新を復元",
        restore: "復元",
        unknownDevice: "不明なデバイス",
        historyTitle: "クラウド履歴",
        warningTitle: "警告：データ上書き",
        warningDesc:
          "現在のローカル設定とデータベースが完全に上書きされます。未保存の変更は失われます。続行しますか？",
        confirm: "復元して上書きする",
        connected: "接続成功",
        saved: "認証情報を保存しました",
        missing: "URL とユーザー名を入力してください",
        fetching: "一覧を取得中...",
        noBackups: "バックアップが見つかりません",
        configureFirst: "先に WebDAV を設定してください",
        restoreSuccess: "復元に成功しました。アプリを再起動してください",
        restoreFailed: "復元失敗：${e}",
        backupSuccess: "バックアップ成功",
        backupFailed: "バックアップ失敗：${e}",
        loadHistoryFailed: "履歴の読み込みに失敗しました：${e}",
        savefile: ".zip ファイルとして保存",
        restorefile: ".zip ファイルから復元"
      },

      about: {
        version: "現在のバージョン",
        microsoftStore: "Microsoft Store",
        microsoftStoreDesc: "Microsoft Store で PiTerm を評価するか、更新プログラムを確認します",
        openInStore: "ストアで開く"
      }
    }
  }
};
