export const en = {
  translation: {
    menu: {
      home: "Dashboard",
      servers: "Servers",
      snippets: "Code Library",
      tools: "Toolbox",
      keys: "Key Management",
      settings: "Settings"
    },

    theme: {
      dark: "Dark Mode",
      light: "Light Mode",
      switch: "Switch Theme"
    },

    sidebar: {
      collapse: "Collapse Sidebar",
      expand: "Expand Sidebar"
    },

    app: {
      title: "My Terminal"
    },

    common: {
      password: "Password",
      time: {
        days: "d",
        hours: "h",
        minutes: "m",
        lessThan1m: "< 1m"
      },
      default: "Default",
      unlock: "Unlock",
      menu: "Menu",
      search: "Search",
      filters: "Filters",
      loading: "Loading...",
      confirm: "Confirm",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      save: "Save",
      create: "Create",
      actions: "Actions",
      clearSearch: "Clear search",
      processing: "Processing...",
      export: "Export",
      import: "Import",
      searchPlaceholder: "Search...",
      grid_view: "Grid View",
      list_view: "List View",
      all: "All",
      newItem: "New",
      add: "Add",
      testing: "Testing...",
      testConnection: "Test Connection",
      close: "Close",
      change: "Switch",
      loadFile: "Import from local",
      reset: "Reset",
      optional: "Optional",
      pickDate: "Pick a date",
      copied: "Copied",
      connect: "Connect",
      clickToExpand: "Click to expand",
      deleteProxy: "Delete Proxy",
      searchTags: "Search tags",
      noTagsFound: "No tags found",
      selectTags: "Select tags",
      selected: "Selected",
      clear: "Clear",
      exportAll: "Export all",
      authRequired: "Authentication required",
      authDesc: "Please enter your password",
      deleteProxyConfirm:
        "Are you sure you want to delete this proxy configuration? This action cannot be undone.",
      size: {
        small: "Small",
        medium: "Medium",
        large: "Large"
      }
    },

    dashboard: {
      emoji: {
        rules: {
          newYear: "Happy New Year!",
          christmas: "Merry Christmas!",
          morning: "Good morning, grab a coffee",
          lunch: "It's lunch time",
          afternoon: "Working hard...",
          evening: "Good evening",
          lateNight: "Working late, take care",
          default: "Ready to go"
        }
      },
      settings: {
        showEmoji: "Show daily emoji",
        resetSponsors: "Reset hidden sponsor cards"
      },
      sponsor: {
        hallOfFame: "Thanks",
        supportProject: "Support the project",
        joinBackers: "Backers",
        donateViewAll: "View all supporters",
        thankYou:
          "Sincere thanks to everyone for supporting and sponsoring this project!",
        becomeSponsor: "Become a sponsor"
      },
      quickConnect: {
        hint: "Format: user@host, user@host:port, or user@[IPv6]:port",
        title: "Start Connection",
        error: "Failed to initialize connection",
        connecting: "Connecting to {{host}}...",
        invalidFormat:
          "Invalid format. Use: user@host, user@host:port, or user@[IPv6]:port",
        disclaimerTitle: "Disclaimer"
      }
    },

    server: {
      errorTrust: "Unable to trust host key",
      locked_connect: "Please unlock the vault to connect.",
      errorTerminal: "Failed to open terminal: {{message}}",
      verify: {
        title: "New Host Verification",
        desc:
          "The authenticity of the host cannot be established. This is the first time you are connecting to this server.",
        warning:
          "To prevent MITM attacks, please verify that this fingerprint matches the server key.",
        trust: "Trust and Connect"
      },
      sshlog: {
        failed: "Connection failed",
        connecting: "Connecting...",
        tunnel: "Establishing secure tunnel",
        init: "Initializing..."
      },
      logs: {
        saveError: "Failed to save fingerprint",
        trusted:
          "Host key trusted. Saving to known_hosts...",
        preflight: "Starting verification...",
        preflightError: "Fingerprint verification failed"
      },
      vault: {
        locked_add:
          "Please unlock the vault to add a server.",
        locked_edit:
          "Please unlock the vault to edit details."
      },
      deleteKeyUsedWarning:
        "Credentials used by other servers:",
      delete: {
        title: "Delete server?",
        confirm:
          "Are you sure you want to delete server “{{name}}”? This action cannot be undone.",
        deletePassword:
          "Also delete associated password",
        deleteKey:
          "Also delete associated key"
      },
      list: {
        searchPlaceholder:
          "Search server name, IP...",
        add: "Add Server",
        copyIp: "Copy IP",
        empty:
          "No servers found matching your criteria."
      },
      status: {
        expired: "Expired",
        daysLeft: "{{count}} days left"
      },
      columns: {
        name: "Server Name",
        ip: "Server Address",
        expiration: "Expiration Date",
        tags: "Tags",
        actions: "Actions"
      },
      sort: {
        custom: "Sort Weight",
        newest: "Created (Newest)",
        oldest: "Created (Oldest)",
        nameAsc: "Name (A–Z)",
        nameDesc: "Name (Z–A)",
        idDesc: "ID (Descending)",
        idAsc: "ID (Ascending)",
        lastConnected: "Last Connected First"
      },

      form: {
        titleNew: "New Server",
        titleEdit: "Edit Server",
        name: "Server Name",
        namePlaceholder: "e.g. Production Database",
        icon: "Icon",
        theme: "Card Color",
        provider: "Provider",
        selectProvider: "Select provider...",
        tags: "Tags",
        sort: "Sort Weight",
        enableExpiration: "Expiration Date",
        host: "Address",
        port: "Port",
        connectionMode: "Proxy",
        password: "Password",
        username: "Username",
        passphrase: "Key Passphrase",
        privateKey: "Private Key",
        credentials: "Credentials",
        passwordPlaceholder: "Enter password",
        sortPriority: "Priority",
        authType: "Authentication Type",
        tagPlaceholder: "Enter tag",
        createProvider: "Create",
        testSuccess: "Connection successful!",
        checkRequired: "Please check required fields.",
        testFailed: "Connection failed: {{error}}",
        saveError: "Save failed: {{message}}",
        saveSuccess: "Saved successfully",
        existing: "Provider",

        vault: {
          locked_save:
            "Please unlock the vault to save credentials.",
          select: "Select from vault",
          keyReady: "Key ready",
          associated: "Vault verification completed",
          key: "Key Authentication",
          password: "Password Authentication",
          selectKeyTitle: "Select Key",
          noKeysFound:
            "No private keys found in Vault",
          searchKeys: "Search keys..."
        },

        tabs: {
          basic: "Basic Settings",
          advanced: "Advanced Settings"
        },

        select_proxyplaceholder: "Select proxy...",
        select_proxylabel: "Select proxy configuration",
        list_proxyempty: "No matching proxy found",
        timeout: "Connection Timeout",
        timeoutDesc:
          "Maximum wait time (seconds).",
        keepalive: "Keepalive Interval",
        keepaliveDesc:
          "Interval in seconds (set to 0 to disable).",
        reconnect: "Auto Reconnect",
        reconnectDesc:
          "Automatically retry if the connection is lost.",
        retries: "Retry Count",
        retriesDesc: "Maximum retry attempts"
      }
    },

    terminal: {
      connecting: "Connecting to server...",
      reconnectAuth: "Session expired",
      reconnectDesc:
        "This is a temporary connection. Please enter your password to continue.",
      welcome: {
        title: "Server List",
        subtitle: "Get started quickly"
      },
      tabs: {
        reconnect: "Reconnect",
        split: "Add Split View",
        unsplit: "Remove Split View",
        close: "Close Current Tab",
        closeOthers: "Close Other Tabs",
        closeAll: "Close All Tabs",
        rename: "Rename"
      }
    },

    cmd: {
      collapseFileManager: "Collapse File Manager",
      expandFileManager: "Expand File Manager",
      library: "Command Records",
      snippets: "Code Snippets",
      history: "Command History",
      searchPlaceholder: "Search...",
      snippetsnotFound: "Empty",
      commonrun: "Paste and run immediately",
      commoninsert: "Insert into input",
      commonloading: "Loading history...",
      typeCommand: "Type a command...",
      historynoSession: "No available session",
      broadcastOn: "Broadcast On",
      broadcastOff: "Broadcast Off",
      autocompleteOn: "Autocomplete popup: ON",
      autocompleteOff: "Autocomplete popup: OFF",
      autocompleteDisabledGlobally:
        "Autocomplete is disabled in Terminal settings",
      autocompleteNoSession: "No active session",
      commondelete: "Delete",
      historyempty: "Empty"
    },

    monitor: {
      collapse: "Collapse",
      expand: "Expand",
      title: "System Monitor",
      loading: "Loading...",
      total: "Total",
      disabled: "Disabled",
      moreInfo: "More info",
      copied: "Copied!",
      openAdvanced: "Advanced Dashboard (WIP)",
      cpu: {
        title: "CPU",
        totalUsage: "Total Usage",
        cores: "{{count}} Cores",
        history: "Usage trend (last 60 seconds)"
      },
      memory: {
        title: "Memory",
        ramUsage: "Memory Usage",
        ram: "Physical Memory",
        swap: "Swap"
      },
      disk: {
        title: "Disk Storage",
        details: "Disk Details",
        usage: "Usage",
        free: "Free",
        read: "Read",
        write: "Write"
      },
      info: {
        title: "System Information",
        uptime: "Uptime",
        distro: "Distribution",
        kernel: "Kernel",
        arch: "Architecture",
        timezone: "Time Zone"
      },
      network: {
        title: "Network Traffic",
        details: "Interface Details",
        realtime: "Realtime Speed",
        total: "Total"
      }
    },

    keys: {
      empty: "No keys found",
      searchPlaceholder: "Search keys",
      add: "Add Key",
      action: {
        add: "Add Credential",
        edit: "Edit Credential",
        importFile: "Import File"
      },
      label: {
        remarkName: "Remark Name",
        username: "Username",
        password: "Password",
        privateKey: "Private Key",
        passwordContent: "Password Content",
        passphrase: "Passphrase"
      },
      placeholder: {
        remarkName: "e.g. Production Database",
        username: "Optional",
        privateKey: "Paste your private key here",
        passphrase: "Optional (only if the key is encrypted)",
        setPwd: "Set password",
        enterPwd: "Enter password",
        confirmPwd: "Confirm password"
      },
      msg: {
        noPassphrase: "No passphrase set"
      },
      error: {
        pwdMismatch: "Passwords do not match",
        pwdShort: "Password must be at least 6 characters",
        wrongPwd: "Incorrect password"
      },
      setup: {
        title: "Set Master Password",
        unlock_title: "Unlock Vault",
        desc:
          "Your keys are encrypted with a master password. Please set one to continue.",
        unlock_desc:
          "Enter your master password to access your keys."
      },
      delete: {
        title: "Delete Credential",
        confirm:
          "Are you sure you want to delete this credential? This action cannot be undone.",
        warning: "Associated with {{count}} servers",
        impact:
          "Deleting this key will disconnect the following:"
      }
    },

    fs: {
      nav: {
        back: "Back",
        forward: "Forward",
        up: "Go to parent"
      },
      context: {
        new: "New",
        newFile: "New File",
        newFolder: "New Folder",
        openTerminal: "Open Terminal Here",
        openBuiltin: "Open with Built-in Editor",
        openLocal: "Open Locally",
        copyPath: "Copy Path",
        rename: "Rename",
        download: "Download",
        copy: "Copy",
        cut: "Move",
        permissions: "Change Permissions",
        delete: "Delete",
        paste: "Paste",
        pasteInto: "Paste here",
        upload: "Upload File",
        permission: "Change Permissions"
      },
      placeholder: {
        file: "example.txt",
        folder: "New Folder"
      },
      msg: {
        createSuccess: "Created successfully",
        renameSuccess: "Renamed successfully",
        deleteSuccess: "Deleted successfully",
        pathCopied: "Path copied",
        copyFailed: "Copy failed",
        termPathUpdated: "Terminal path updated",
        copied: "Copied to clipboard",
        cut: "Cut (moved)",
        pasteSuccess: "Paste completed",
        uploading: "Uploading...",
        uploadSuccess: "Upload successful",
        uploadFailed: "Upload failed",
        downloading: "Downloading...",
        downloadSuccess: "Download successful",
        downloadFailed: "Download failed",
        chmodSuccess: "Permissions updated successfully"
      },
      perm: {
        prop_file: "Target",
        scope: "Scope",
        owner: "Owner",
        group: "Group",
        others: "Others",
        dir: "Directory",
        read: "Read",
        write: "Write",
        execute: "Execute",
        recursive: "Apply recursively",
        octal: "Permission code"
      },
      dialog: {
        deleteConfirm: "!! Deletion cannot be undone !!",
        enterName: "Name"
      },
      error: {
        generic: "Operation failed",
        exist: "Target already exists",
        notFound: "Path or file not found",
        permission: "Permission denied",
        timeout: "Operation timed out",
        folderCopy: "Folder copy is not supported",
        folderDownload: "Folder download is not supported"
      },
      action: {
        refresh: "Refresh",
        upload: "Upload File",
        cancel: "Cancel"
      },
      view: {
        showHidden: "Show hidden files",
        hideHidden: "Hide hidden files"
      },
      transfer: {
        manager: "Transfer Manager",
        title: "File Transfers",
        to: "Location",
        open_folder: "Open file location",
        empty: "No transfer records",
        clear: "Clear history"
      },
      col: {
        name: "Name",
        size: "Size",
        perm: "Permissions",
        owner: "Owner",
        date: "Modified Date"
      },
      status: {
        pending: "Pending",
        processing: "In Progress",
        completed: "Completed",
        error: "Error",
        canceled: "Canceled",
        noConnection: "Not connected",
        connectTip:
          "Please connect to an SSH server to manage files"
      },
      empty: "This folder is empty"
    },

    snippet: {
      copy_hint: "Click to copy",
      search_placeholder: "Search code library",
      empty_state: "Code library is empty",
      label: "Add Code Block",
      fields: {
        title: "Title",
        title_placeholder: "Enter title",
        edit_title: "Edit Code",
        new_title: "New Code",
        tags: "Tags",
        language: "Language",
        code: "Code",
        code_placeholder: "Enter code here",
        tagsPlaceholder: "Select tags..."
      },
      delete_title: "Delete snippet?",
      delete_confirm:
        "Are you sure you want to delete this snippet? This action cannot be undone."
    },

    tools: {
      placeholder: {
        title: "Toolbox",
        subtitle:
          "Extend your workflow with powerful utilities",
        footer: "Have a tool idea?",
        request: "Submit feedback"
      },
      upcoming: {
        docker: {
          title: "Docker Management",
          desc:
            "Visualize container status, logs, and manage lifecycle with one click."
        },
        network: {
          title: "Route Testing",
          desc:
            "Professional MTR, latency analysis, and global path tracing."
        },
        security: {
          title: "Security Audit",
          desc:
            "Server vulnerability scanning, port checks, and compliance reports."
        },
        monitoring: {
          title: "Real-time Monitoring",
          desc:
            "Dynamic resource charts and custom alert notifications."
        }
      }
    },

    settings: {
      title: "Settings",
      itemsCount: "{{count}} settings",
      noResults: "No settings found",
      nav: {
        general: "General",
        appearance: "Appearance",
        terminal: "Terminal",
        connection: "Connection",
        security: "Security",
        backup: "Data",
        about: "About"
      },

      general: {
        deviceName: "Device Name",
        deviceNameDesc:
          "Used to identify backups from this device",
        language: "Language",
        languageDesc:
          "Change application display language",
        autoUpdate: "Auto Update",
        autoUpdateDesc:
          "Automatically check and download new versions",
        launchAtStartup:
          "Launch at system startup",
        launchAtStartupDesc:
          "Start application automatically when you log in",
        minimizeToTray:
          "Minimize to system tray",
        minimizeToTrayDesc:
          "Hide taskbar icon when minimized",
        closeBehavior:
          "When closing the main window",
        closeBehaviorDesc:
          "Behavior when clicking the close (X) button",
        languageOptions: {
          auto: "Follow system"
        },
        behavior: {
          quit: "Quit application",
          minimize: "Minimize to tray"
        }
      },

      appearance: {
        universal: "Universal Background Settings",
        appTheme: "App Theme",
        syncTerminalTheme:
          "Sync terminal color scheme",
        syncTerminalThemeDesc:
          "Automatically sync terminal colors with theme",
        lightTerminalTheme:
          "Light Mode Terminal Theme",
        darkTerminalTheme:
          "Dark Mode Terminal Theme",
        terminalTheme: "Terminal Theme",
        manageThemes: "Color Schemes",
        manageThemesDesc:
          "Manage terminal color schemes",
        highlightRules: "Highlight Rules",
        uiFont: "UI Font",
        uiFontDesc:
          "Choose a font from the system",
        searchFont: "Search fonts...",
        overlay: "Overlay Color",
        overlayOpacity: "Overlay Opacity",
        themeOptions: {
          system: "System",
          light: "Light",
          dark: "Dark"
        },
        lightThemeScheme: "Light Theme Scheme",
        lightThemeSchemeDesc: "Configure the color scheme specifically for light mode",
        lightThemeOptions: {
          default: "Default (Cool Grey)",
          claude: "Claude Light (Parchment)"
        },
        noWallpaper: "No background",
        changeWallpaper: "Change background",
        syncBackground: "Sync background",
        syncBackgroundDesc:
          "Sync background with theme colors",
        blur: "Background Blur",
        brightness: "Background Brightness",
        saved: "Background settings saved",
        error: "Failed to save background",
        imageTooLarge:
          "Image size must not exceed 10MB",
        fontRestored: "Default font restored",
        fontApplied: "Font applied: {{font}}",
        systemDefault: "System default"
      },

      terminal: {
        preview: "Live Preview",
        rendererType: "Renderer",
        rendererTypeDesc:
          "Choose terminal rendering engine",
        renderer: {
          webgl:
            "WebGL (GPU accelerated - Recommended)",
          canvas: "Canvas (Better compatibility)",
          dom: "DOM (Slow - Debug only)"
        },
        autocompleteEnabled: "Autocomplete Popup",
        autocompleteEnabledDesc:
          "Master switch for command history and snippet suggestions",
        autocompletePopupScale: "Popup Scale",
        autocompletePopupScaleDesc:
          "Adjust the size of the autocomplete floating window",
        autocompletePopupOpacity: "Popup Opacity",
        autocompletePopupOpacityDesc:
          "Adjust the transparency of the autocomplete floating window",
        theme: "Color Scheme",
        fontSize: "Font Size",
        fontWeight: "Font Weight",
        lineHeight: "Line Height",
        lineHeightDesc:
          "Line height multiplier, e.g. 1.0 or 1.2",
        fontFamily: "Font Family",
        fontFamilyDesc:
          "Comma-separated font list (priority order)",
        scrollback: "Scrollback",
        scrollbackDesc:
          "Number of history lines to keep",
        padding: "Padding",
        paddingDesc:
          "Distance between content and window edge (px)",
        cursorStyle: "Cursor Style",
        cursor: {
          block: "Block",
          underline: "Underline",
          bar: "Bar"
        },
        cursorBlink: "Cursor Blink"
      },

      security: {
        idleTimeout:
          "Auto-lock when idle",
        idleTimeoutDesc:
          "Automatically lock after inactivity",
        lockShortcut:
          "Quick lock shortcut",
        lockShortcutDesc:
          "Shortcut to lock immediately (e.g. Ctrl+Shift+L)",
        pinManager: "Master PIN",
        pinManagerDesc: "Manage and change your vault's master PIN code",
        changePin: "Change PIN",
        oldPin: "Current PIN",
        newPin: "New PIN",
        confirmPin: "Confirm New PIN",
        pinLengthError: "PIN must be at least 6 characters",
        pinMismatchError: "New PINs do not match",
        oldPinIncorrect: "Current PIN is incorrect",
        changeSuccess: "Master PIN changed successfully",
        changeFailed: "Failed to change PIN",
        uninitializedWarning: "Master PIN is not set. Please initialize the vault first in Key Management.",
        goToKeys: "Go to Key Management"
      },

      proxy: {
        edit: "Edit Proxy",
        name: "Proxy Name",
        name_placeholder: "",
        type: "Proxy Type",
        host: "Proxy Host",
        port: "Port",
        auth_hint: "Authentication",
        username: "Username",
        password: "Password",
        description:
          "Manage your proxies securely. Passwords are encrypted with your master key.",
        add: "Add Proxy",
        empty: "No proxy configurations"
      },

      connection: {
        proxies: "Proxies",
        agentWsEnabled: "Enable AI Agent WS Service",
        agentWsEnabledDesc: "Starts a local WebSocket server to allow trusted local AI assistant programs to interact with and control active SSH sessions.",
        agentWsPort: "AI Agent Service Port",
        agentWsPortDesc: "Specifies the local TCP port that the WebSocket server will listen on."
      },

      backup: {
        webdav: "WebDAV Configuration",
        auto: "Automatic Backup",
        frequency: "Backup Frequency",
        url: "URL",
        username: "Username",
        password: "Password",
        secureStatus:
          "Credentials are securely stored locally",
        notConfigured:
          "Credentials not saved",
        saveAndTest:
          "Save & Test Connection",
        cloudTitle: "WebDAV Sync",
        localTitle: "Local Backup",
        backupNow: "Backup Now",
        history: "Backup History",
        restoreLatest: "Restore Latest",
        restore: "Restore Now",
        unknownDevice: "Unknown Device",
        historyTitle: "Cloud Records",
        warningTitle:
          "Warning: Data overwrite",
        warningDesc:
          "This will completely overwrite your current local settings and database. Unsaved changes will be lost. Continue?",
        confirm:
          "Confirm restore and overwrite",
        connected: "Connected successfully",
        saved:
          "Credentials saved securely",
        missing:
          "Please fill in URL and username",
        fetching:
          "Fetching list...",
        noBackups:
          "No backups found",
        configureFirst:
          "Please configure WebDAV first",
        restoreSuccess:
          "Restore successful. Please restart the app",
        restoreFailed:
          "Restore failed, error: ${e}",
        backupSuccess:
          "Backup successful",
        backupFailed:
          "Backup failed, error: ${e}",
        loadHistoryFailed:
          "Failed to load backup history, error: ${e}",
        savefile:
          "Save as .zip file",
        restorefile:
          "Restore from .zip file"
      },

      about: {
        version: "Current Version",
        microsoftStore: "Microsoft Store",
        microsoftStoreDesc: "Rate PiTerm or check for updates in the Microsoft Store",
        openInStore: "Open in Store"
      }
    }
  }
};
