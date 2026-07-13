export const vi = {
  translation: {
    menu: {
      home: "Bảng điều khiển",
      servers: "Máy chủ",
      snippets: "Thư viện mã",
      tools: "Hộp công cụ",
      keys: "Quản lý khóa",
      settings: "Cài đặt"
    },

    theme: {
      dark: "Chế độ tối",
      light: "Chế độ sáng",
      switch: "Chuyển đổi giao diện"
    },

    sidebar: {
      collapse: "Thu gọn thanh bên",
      expand: "Mở rộng thanh bên"
    },

    app: {
      title: "Terminal của tôi"
    },

    common: {
      password: "Mật khẩu",
      default: "Mặc định",
      unlock: "Mở khóa",
      menu: "Menu",
      search: "Tìm kiếm",
      filters: "Bộ lọc",
      loading: "Đang tải...",
      confirm: "Xác nhận",
      cancel: "Hủy",
      delete: "Xóa",
      edit: "Chỉnh sửa",
      save: "Lưu",
      create: "Tạo",
      actions: "Thao tác",
      clearSearch: "Xóa điều kiện tìm kiếm",
      processing: "Đang xử lý...",
      export: "Xuất",
      import: "Nhập",
      searchPlaceholder: "Tìm kiếm...",
      grid_view: "Chế độ lưới",
      list_view: "Chế độ danh sách",
      all: "Tất cả",
      newItem: "Tạo mới",
      add: "Thêm",
      testing: "Đang kiểm tra...",
      testConnection: "Kiểm tra kết nối",
      close: "Đóng",
      change: "Chuyển",
      loadFile: "Nhập từ máy",
      reset: "Đặt lại",
      optional: "Tùy chọn",
      pickDate: "Chọn ngày",
      copied: "Đã sao chép",
      connect: "Kết nối",
      clickToExpand: "Nhấn để mở rộng",
      deleteProxy: "Xóa proxy",
      searchTags: "Tìm thẻ",
      noTagsFound: "Không tìm thấy thẻ",
      selectTags: "Chọn thẻ",
      selected: "Đã chọn",
      clear: "Xóa",
      exportAll: "Xuất tất cả",
      authRequired: "Yêu cầu xác thực",
      authDesc: "Vui lòng nhập mật khẩu",
      deleteProxyConfirm:
        "Bạn có chắc chắn muốn xóa cấu hình proxy này không? Thao tác này không thể hoàn tác.",
      size: {
        small: "Nhỏ",
        medium: "Trung bình",
        large: "Lớn"
      }
    },

    dashboard: {
      emoji: {
        rules: {
          newYear: "Chúc mừng năm mới!",
          christmas: "Giáng sinh vui vẻ!",
          morning: "Chào buổi sáng, uống cà phê nhé",
          lunch: "Đến giờ ăn trưa rồi",
          afternoon: "Đang làm việc...",
          evening: "Chào buổi tối",
          lateNight: "Thức khuya, nhớ giữ sức khỏe",
          default: "Sẵn sàng bắt đầu"
        }
      },
      settings: {
        showEmoji: "Hiển thị emoji hằng ngày",
        resetSponsors: "Đặt lại thẻ tài trợ đã ẩn"
      },
      sponsor: {
        hallOfFame: "Cảm ơn",
        supportProject: "Hỗ trợ dự án",
        joinBackers: "Nhà tài trợ",
        donateViewAll: "Xem tất cả nhà tài trợ",
        thankYou:
          "Chân thành cảm ơn tất cả mọi người đã ủng hộ và tài trợ cho dự án!",
        becomeSponsor: "Trở thành nhà tài trợ"
      },
      quickConnect: {
        hint: "Định dạng: user@host hoặc user@host:port",
        title: "Bắt đầu kết nối",
        error: "Khởi tạo kết nối thất bại",
        connecting: "Đang kết nối {{host}}...",
        invalidFormat: "Định dạng không hợp lệ. Vui lòng dùng: user@host:port",
        disclaimerTitle: "Tuyên bố miễn trừ"
      }
    },

    server: {
      errorTrust: "Không thể tin cậy khóa máy chủ",
      locked_connect: "Vui lòng mở khóa kho khóa để kết nối.",
      errorTerminal: "Mở terminal thất bại: {{message}}",

      verify: {
        title: "Xác nhận máy chủ mới",
        desc: "Không thể xác minh tính xác thực của máy chủ. Đây là lần kết nối đầu tiên.",
        warning:
          "Để tránh tấn công MITM, hãy xác minh dấu vân tay này có khớp với khóa máy chủ hay không.",
        trust: "Tin cậy và kết nối"
      },

      sshlog: {
        failed: "Kết nối thất bại",
        connecting: "Đang kết nối...",
        tunnel: "Đang thiết lập đường hầm an toàn",
        init: "Đang khởi tạo..."
      },

      logs: {
        saveError: "Lưu dấu vân tay thất bại",
        trusted:
          "Khóa máy chủ đã được tin cậy. Đang lưu vào known_hosts...",
        preflight: "Đang bắt đầu xác minh...",
        preflightError: "Xác minh dấu vân tay thất bại"
      },

      vault: {
        locked_add: "Vui lòng mở khóa kho khóa để thêm máy chủ.",
        locked_edit: "Vui lòng mở khóa kho khóa để chỉnh sửa thông tin."
      },

      deleteKeyUsedWarning: "Thông tin xác thực đang được máy chủ khác sử dụng:",

      delete: {
        title: "Xóa máy chủ?",
        confirm:
          "Bạn có chắc chắn muốn xóa máy chủ “{{name}}” không? Thao tác này không thể hoàn tác.",
        deletePassword: "Xóa cả mật khẩu liên kết",
        deleteKey: "Xóa cả khóa liên kết"
      },

      list: {
        searchPlaceholder: "Tìm tên máy chủ, IP...",
        add: "Thêm máy chủ",
        copyIp: "Sao chép IP",
        empty: "Không tìm thấy máy chủ phù hợp."
      },

      status: {
        expired: "Đã hết hạn",
        daysLeft: "Còn {{count}} ngày"
      },

      columns: {
        name: "Tên máy chủ",
        ip: "Địa chỉ máy chủ",
        expiration: "Thời hạn",
        tags: "Thẻ",
        actions: "Thao tác"
      },

      sort: {
        newest: "Thời gian tạo (mới nhất)",
        oldest: "Thời gian tạo (cũ nhất)",
        nameAsc: "Tên (A–Z)",
        idDesc: "ID (giảm dần)",
        idAsc: "ID (tăng dần)"
      },

      form: {
        titleNew: "Tạo máy chủ",
        titleEdit: "Chỉnh sửa máy chủ",
        name: "Tên máy chủ",
        namePlaceholder: "Ví dụ: CSDL môi trường sản xuất",
        icon: "Biểu tượng",
        provider: "Nhà cung cấp",
        selectProvider: "Chọn nhà cung cấp...",
        tags: "Thẻ",
        sort: "Độ ưu tiên",
        enableExpiration: "Thời hạn",
        host: "Địa chỉ",
        port: "Cổng",
        connectionMode: "Proxy",
        password: "Mật khẩu",
        username: "Tên người dùng",
        passphrase: "Mật khẩu khóa",
        privateKey: "Thông tin khóa",
        credentials: "Xác thực",
        passwordPlaceholder: "Nhập mật khẩu",
        sortPriority: "Ưu tiên",
        authType: "Loại xác thực",
        tagPlaceholder: "Nhập thẻ",
        createProvider: "Tạo mới",
        testSuccess: "Kết nối thành công!",
        checkRequired: "Vui lòng kiểm tra các trường bắt buộc.",
        testFailed: "Kết nối thất bại: {{error}}",
        saveError: "Lưu thất bại: {{message}}",
        saveSuccess: "Lưu thành công",
        existing: "Nhà cung cấp",

        vault: {
          locked_save: "Vui lòng mở khóa kho khóa để lưu thông tin xác thực.",
          select: "Chọn từ kho khóa",
          keyReady: "Khóa đã sẵn sàng",
          associated: "Xác minh kho khóa hoàn tất",
          key: "Đăng nhập bằng khóa",
          password: "Đăng nhập bằng mật khẩu",
          selectKeyTitle: "Chọn khóa",
          noKeysFound: "Không tìm thấy khóa riêng trong Vault",
          searchKeys: "Tìm khóa..."
        },

        tabs: {
          basic: "Cài đặt cơ bản",
          advanced: "Cài đặt nâng cao"
        },

        select_proxyplaceholder: "Chọn proxy...",
        select_proxylabel: "Chọn cấu hình proxy",
        list_proxyempty: "Không có proxy phù hợp",
        timeout: "Hết thời gian kết nối",
        timeoutDesc: "Thời gian chờ tối đa (giây).",
        keepalive: "Khoảng keepalive",
        keepaliveDesc: "Khoảng thời gian (giây), 0 để tắt.",
        reconnect: "Tự động kết nối lại",
        reconnectDesc: "Tự động thử lại khi bị ngắt kết nối.",
        retries: "Số lần thử lại",
        retriesDesc: "Số lần thử tối đa"
      }
    },
        terminal: {
      connecting: "Đang kết nối tới máy chủ...",
      reconnectAuth: "Phiên đã hết hạn",
      reconnectDesc: "Đây là kết nối tạm thời, vui lòng nhập mật khẩu để tiếp tục.",
      welcome: {
        title: "Danh sách máy chủ",
        subtitle: "Bắt đầu nhanh"
      },
      tabs: {
        reconnect: "Kết nối lại",
        split: "Thêm chế độ chia màn hình",
        unsplit: "Hủy chia màn hình",
        close: "Đóng tab hiện tại",
        closeOthers: "Đóng các tab khác",
        closeAll: "Đóng tất cả tab",
        rename: "Đổi tên"
      }
    },

    cmd: {
      collapseFileManager: "Thu gọn trình quản lý tệp",
      expandFileManager: "Mở rộng trình quản lý tệp",
      library: "Nhật ký lệnh",
      snippets: "Đoạn mã",
      history: "Lịch sử lệnh",
      searchPlaceholder: "Tìm kiếm...",
      snippetsnotFound: "Trống",
      commonrun: "Dán và chạy ngay",
      commoninsert: "Chèn vào ô nhập",
      commonloading: "Đang tải lịch sử lệnh...",
      typeCommand: "Nhập lệnh...",
      historynoSession: "Không có phiên khả dụng",
      broadcastOn: "Bật phát sóng",
      broadcastOff: "Tắt phát sóng",
      commondelete: "Xóa",
      historyempty: "Trống"
    },
        monitor: {
      collapse: "Thu gọn",
      expand: "Mở rộng",
      title: "Giám sát hệ thống",
      loading: "Đang tải...",
      total: "Tổng cộng",
      disabled: "Chưa bật",
      moreInfo: "Thông tin thêm",
      copied: "Đã sao chép!",
      openAdvanced: "Bảng điều khiển nâng cao (chưa hoàn thiện)",
      cpu: {
        title: "CPU",
        totalUsage: "Mức sử dụng tổng",
        cores: "{{count}} lõi",
        history: "Xu hướng sử dụng trong 60 giây gần đây"
      },
      memory: {
        title: "Bộ nhớ",
        ramUsage: "Mức sử dụng RAM",
        ram: "Bộ nhớ vật lý",
        swap: "Bộ nhớ hoán đổi (Swap)"
      },
      disk: {
        title: "Lưu trữ đĩa",
        details: "Chi tiết ổ đĩa",
        usage: "Mức sử dụng",
        free: "Còn trống",
        read: "Đọc",
        write: "Ghi"
      },
      info: {
        title: "Thông tin hệ thống",
        uptime: "Thời gian hoạt động",
        distro: "Bản phân phối",
        kernel: "Nhân",
        arch: "Kiến trúc",
        timezone: "Múi giờ"
      },
      network: {
        title: "Lưu lượng mạng",
        details: "Chi tiết giao diện mạng",
        realtime: "Tốc độ thời gian thực",
        total: "Tổng cộng"
      }
    },

    keys: {
      empty: "Không tìm thấy khóa",
      searchPlaceholder: "Tìm khóa",
      add: "Thêm khóa",
      action: {
        add: "Thêm thông tin xác thực",
        edit: "Chỉnh sửa thông tin xác thực",
        importFile: "Nhập tệp"
      },
      label: {
        remarkName: "Tên ghi chú",
        username: "Tên người dùng",
        password: "Mật khẩu",
        privateKey: "Khóa riêng",
        passwordContent: "Nội dung mật khẩu",
        passphrase: "Cụm mật khẩu"
      },
      placeholder: {
        remarkName: "Ví dụ: CSDL môi trường sản xuất",
        username: "Tùy chọn",
        privateKey: "Dán nội dung khóa riêng của bạn tại đây",
        passphrase: "Tùy chọn (chỉ khi khóa riêng đã được mã hóa)",
        setPwd: "Đặt mật khẩu",
        enterPwd: "Nhập mật khẩu",
        confirmPwd: "Xác nhận mật khẩu"
      },
      msg: {
        noPassphrase: "Chưa đặt cụm mật khẩu"
      },
      error: {
        pwdMismatch: "Mật khẩu không khớp",
        pwdShort: "Mật khẩu phải có ít nhất 6 ký tự",
        wrongPwd: "Sai mật khẩu"
      },
      setup: {
        title: "Thiết lập mật khẩu chính",
        unlock_title: "Mở khóa kho khóa",
        desc: "Khóa của bạn đã được mã hóa bằng mật khẩu chính. Vui lòng thiết lập để tiếp tục.",
        unlock_desc: "Vui lòng nhập mật khẩu chính để truy cập khóa của bạn."
      },
      delete: {
        title: "Xóa thông tin xác thực",
        confirm: "Bạn có chắc chắn muốn xóa thông tin xác thực này không? Thao tác này không thể hoàn tác.",
        warning: "Đã liên kết với {{count}} máy chủ",
        impact: "Việc xóa khóa này sẽ ngắt kết nối với các đối tượng sau:"
      }
    },
        fs: {
      nav: {
        back: "Quay lại",
        forward: "Tiến tới",
        up: "Lên một cấp"
      },
      context: {
        new: "Tạo mới",
        newFile: "Tạo tệp mới",
        newFolder: "Tạo thư mục mới",
        openTerminal: "Mở terminal tại đây",
        openBuiltin: "Mở bằng trình soạn thảo tích hợp",
        openLocal: "Mở cục bộ",
        copyPath: "Sao chép đường dẫn",
        rename: "Đổi tên",
        download: "Tải xuống",
        copy: "Sao chép",
        cut: "Di chuyển",
        permissions: "Thay đổi quyền",
        delete: "Xóa",
        paste: "Dán",
        pasteInto: "Dán vào đây",
        upload: "Tải tệp lên",
        permission: "Thay đổi quyền"
      },
      placeholder: {
        file: "example.txt",
        folder: "Thư mục mới"
      },
      msg: {
        createSuccess: "Tạo thành công",
        renameSuccess: "Đổi tên thành công",
        deleteSuccess: "Xóa thành công",
        pathCopied: "Đã sao chép đường dẫn",
        copyFailed: "Sao chép thất bại",
        termPathUpdated: "Đường dẫn terminal đã được cập nhật",
        copied: "Đã sao chép vào clipboard",
        cut: "Đã cắt (di chuyển)",
        pasteSuccess: "Dán hoàn tất",
        uploading: "Đang tải lên...",
        uploadSuccess: "Tải lên thành công",
        uploadFailed: "Tải lên thất bại",
        downloading: "Đang tải xuống...",
        downloadSuccess: "Tải xuống thành công",
        downloadFailed: "Tải xuống thất bại",
        chmodSuccess: "Thay đổi quyền thành công"
      },
      perm: {
        prop_file: "Đối tượng",
        scope: "Phạm vi",
        owner: "Chủ sở hữu",
        group: "Nhóm",
        others: "Người dùng khác",
        dir: "Thư mục",
        read: "Đọc",
        write: "Ghi",
        execute: "Thực thi",
        recursive: "Áp dụng đệ quy cho thư mục con và tệp",
        octal: "Mã quyền"
      },
      dialog: {
        deleteConfirm: "!! Không thể khôi phục sau khi xóa !!",
        enterName: "Tên"
      },
      error: {
        generic: "Thao tác thất bại",
        exist: "Đối tượng đã tồn tại",
        notFound: "Không tìm thấy đường dẫn hoặc tệp",
        permission: "Không đủ quyền",
        timeout: "Thao tác quá thời gian",
        folderCopy: "Chưa hỗ trợ sao chép thư mục",
        folderDownload: "Chưa hỗ trợ tải xuống thư mục"
      },
      action: {
        refresh: "Làm mới",
        upload: "Tải tệp lên",
        cancel: "Hủy"
      },
      view: {
        showHidden: "Hiển thị tệp ẩn",
        hideHidden: "Ẩn tệp ẩn"
      },
      transfer: {
        manager: "Quản lý truyền tải",
        title: "Truyền tệp",
        to: "Vị trí",
        open_folder: "Mở vị trí tệp",
        empty: "Không có bản ghi truyền tải",
        clear: "Xóa lịch sử"
      },
      col: {
        name: "Tên",
        size: "Kích thước",
        perm: "Quyền",
        owner: "Chủ sở hữu",
        date: "Ngày sửa đổi"
      },
      status: {
        pending: "Đang chờ",
        processing: "Đang xử lý",
        completed: "Hoàn tất",
        error: "Lỗi",
        canceled: "Đã hủy",
        noConnection: "Chưa kết nối",
        connectTip: "Vui lòng kết nối máy chủ SSH để quản lý tệp"
      },
      empty: "Thư mục này trống"
    },

    snippet: {
      copy_hint: "Nhấn để sao chép",
      search_placeholder: "Tìm kiếm thư viện mã",
      empty_state: "Thư viện mã trống",
      label: "Thêm khối mã",
      fields: {
        title: "Tiêu đề",
        title_placeholder: "Nhập tiêu đề",
        edit_title: "Chỉnh sửa mã",
        new_title: "Thêm mã mới",
        tags: "Thẻ",
        language: "Loại ngôn ngữ",
        code: "Mã",
        code_placeholder: "Nhập mã tại đây",
        tagsPlaceholder: "Chọn thẻ..."
      },
      delete_title: "Xóa đoạn mã?",
      delete_confirm: "Bạn có chắc chắn muốn xóa đoạn mã này không? Thao tác này không thể hoàn tác."
    },
        tools: {
      placeholder: {
        title: "Hộp công cụ",
        subtitle: "Mở rộng quy trình làm việc của bạn với các tiện ích mạnh mẽ",
        footer: "Bạn có ý tưởng công cụ cụ thể nào không?",
        request: "Gửi đề xuất tính năng"
      },
      upcoming: {
        docker: {
          title: "Quản lý Docker",
          desc: "Trực quan hóa trạng thái container, giám sát log và quản lý vòng đời chỉ với một cú nhấp."
        },
        network: {
          title: "Kiểm tra định tuyến",
          desc: "Công cụ MTR chuyên nghiệp, phân tích độ trễ và theo dõi đường đi mạng toàn cầu."
        },
        security: {
          title: "Kiểm toán bảo mật",
          desc: "Quét lỗ hổng máy chủ, kiểm tra cổng và tạo báo cáo tuân thủ."
        },
        monitoring: {
          title: "Giám sát thời gian thực",
          desc: "Biểu đồ sử dụng tài nguyên động và cảnh báo chỉ số tùy chỉnh."
        }
      }
    },

    settings: {
      title: "Cài đặt",
      itemsCount: "{{count}} mục cài đặt",
      noResults: "Không tìm thấy cài đặt phù hợp",
      nav: {
        general: "Chung",
        appearance: "Giao diện",
        terminal: "Terminal",
        connection: "Kết nối",
        security: "Bảo mật",
        backup: "Dữ liệu",
        about: "Giới thiệu"
      },

      general: {
        deviceName: "Tên thiết bị",
        deviceNameDesc: "Dùng để nhận diện bản sao lưu trên thiết bị này",
        language: "Ngôn ngữ giao diện",
        languageDesc: "Thay đổi ngôn ngữ hiển thị của ứng dụng",
        autoUpdate: "Tự động cập nhật",
        autoUpdateDesc: "Tự động kiểm tra và tải phiên bản mới",
        launchAtStartup: "Khởi động cùng hệ thống",
        launchAtStartupDesc: "Tự động khởi chạy ứng dụng khi đăng nhập hệ thống",
        minimizeToTray: "Thu nhỏ vào khay hệ thống",
        minimizeToTrayDesc: "Ẩn biểu tượng trên thanh tác vụ và chỉ hiển thị trong khay",
        closeBehavior: "Khi đóng cửa sổ chính",
        closeBehaviorDesc: "Hành vi khi nhấn nút đóng cửa sổ (X)",
        languageOptions: {
          auto: "Theo hệ thống"
        },
        behavior: {
          quit: "Thoát ứng dụng",
          minimize: "Thu nhỏ vào khay"
        }
      },

      appearance: {
        universal: "Cài đặt nền chung",
        appTheme: "Chủ đề giao diện",
        syncTerminalTheme: "Đồng bộ màu terminal",
        syncTerminalThemeDesc: "Tự động đồng bộ màu terminal theo chủ đề",
        lightTerminalTheme: "Màu terminal chế độ sáng",
        darkTerminalTheme: "Màu terminal chế độ tối",
        terminalTheme: "Màu terminal",
        manageThemes: "Bảng màu",
        manageThemesDesc: "Quản lý bảng màu",
        highlightRules: "Quy tắc tô sáng",
        uiFont: "Phông chữ UI",
        uiFontDesc: "Chọn phông chữ từ hệ thống",
        searchFont: "Tìm phông chữ...",
        overlay: "Màu lớp phủ",
        overlayOpacity: "Độ trong suốt lớp phủ",
        themeOptions: {
          system: "Theo hệ thống",
          light: "Chế độ sáng",
          dark: "Chế độ tối"
        },
        lightThemeScheme: "Chủ đề sáng",
        lightThemeSchemeDesc: "Cấu hình màu sắc đặc biệt cho chế độ sáng",
        lightThemeOptions: {
          default: "Mặc định (Xám lạnh)",
          claude: "Claude Sáng (Parchment)"
        },
        noWallpaper: "Không có hình nền",
        changeWallpaper: "Thay đổi hình nền",
        syncBackground: "Đồng bộ nền",
        syncBackgroundDesc: "Đồng bộ nền theo màu chủ đề",
        blur: "Độ mờ nền",
        brightness: "Độ sáng nền",
        saved: "Lưu cài đặt nền thành công",
        error: "Lưu cài đặt nền thất bại",
        imageTooLarge: "Kích thước ảnh tối đa 10MB",
        fontRestored: "Đã khôi phục phông chữ mặc định",
        fontApplied: "Đã áp dụng phông chữ: {{font}}",
        systemDefault: "Mặc định hệ thống"
      },

      terminal: {
        preview: "Xem trước thời gian thực",
        rendererType: "Trình kết xuất",
        rendererTypeDesc: "Chọn phương thức hiển thị frontend của terminal",
        renderer: {
          webgl: "WebGL (tăng tốc GPU – khuyến nghị)",
          canvas: "Canvas (tương thích tốt)",
          dom: "DOM (chậm – chỉ dùng gỡ lỗi)"
        },
        theme: "Bảng màu",
        fontSize: "Cỡ chữ",
        fontWeight: "Độ đậm chữ",
        lineHeight: "Khoảng cách dòng",
        lineHeightDesc: "Hệ số chiều cao dòng, ví dụ 1.0 hoặc 1.2",
        fontFamily: "Danh sách phông chữ",
        fontFamilyDesc: "Ưu tiên phông đứng trước, phân tách bằng dấu phẩy",
        scrollback: "Bộ đệm cuộn",
        scrollbackDesc: "Số dòng lịch sử được giữ lại (giá trị lớn sẽ tốn bộ nhớ)",
        padding: "Khoảng đệm nội dung",
        paddingDesc: "Khoảng cách giữa nội dung terminal và viền cửa sổ (px)",
        cursorStyle: "Kiểu con trỏ",
        cursor: {
          block: "Khối (Block)",
          underline: "Gạch dưới (Underline)",
          bar: "Thanh dọc (Bar)"
        },
        cursorBlink: "Con trỏ nhấp nháy"
      },

      security: {
        idleTimeout: "Tự động khóa khi nhàn rỗi",
        idleTimeoutDesc: "Tự động khóa ứng dụng sau thời gian không có thao tác.",
        lockShortcut: "Phím tắt khóa nhanh",
        lockShortcutDesc: "Nhấn tổ hợp phím này để khóa ngay (ví dụ: Ctrl+Shift+L).",
        pinManager: "Mã PIN chính",
        pinManagerDesc: "Quản lý và thay đổi mã PIN chính để mã hóa kho khóa của bạn",
        changePin: "Thay đổi mã PIN",
        oldPin: "Mã PIN hiện tại",
        newPin: "Mã PIN mới",
        confirmPin: "Xác nhận mã PIN mới",
        pinLengthError: "Mã PIN phải có ít nhất 6 ký tự",
        pinMismatchError: "Mã PIN mới không khớp",
        oldPinIncorrect: "Mã PIN hiện tại không chính xác",
        changeSuccess: "Đổi mã PIN chính thành công",
        changeFailed: "Thay đổi mã PIN thất bại",
        uninitializedWarning: "Mã PIN chính chưa được thiết lập. Vui lòng khởi tạo kho khóa trong phần Quản lý khóa trước.",
        goToKeys: "Đi tới Quản lý khóa"
      },

      proxy: {
        edit: "Chỉnh sửa proxy",
        name: "Tên proxy",
        name_placeholder: "",
        type: "Loại proxy",
        host: "Địa chỉ proxy",
        port: "Cổng",
        auth_hint: "Xác thực",
        username: "Tên người dùng",
        password: "Mật khẩu",
        description: "Quản lý proxy an toàn. Mật khẩu được mã hóa bằng khóa chính.",
        add: "Thêm proxy",
        empty: "Không có cấu hình proxy"
      },

      connection: {
        proxies: "Proxy"
      },

      backup: {
        webdav: "Cấu hình WebDAV",
        auto: "Tự động sao lưu",
        frequency: "Chu kỳ sao lưu",
        url: "Địa chỉ",
        username: "Tên người dùng",
        password: "Mật khẩu",
        secureStatus: "Thông tin xác thực đã được lưu an toàn cục bộ",
        notConfigured: "Thông tin xác thực chưa được lưu.",
        saveAndTest: "Lưu & kiểm tra kết nối",
        cloudTitle: "Đồng bộ WebDAV",
        localTitle: "Sao lưu cục bộ",
        backupNow: "Sao lưu ngay",
        history: "Lịch sử sao lưu",
        restoreLatest: "Khôi phục ngay",
        restore: "Khôi phục ngay",
        unknownDevice: "Thiết bị không xác định",
        historyTitle: "Lịch sử đám mây",
        warningTitle: "Cảnh báo: Ghi đè dữ liệu",
        warningDesc:
          "Thao tác này sẽ ghi đè hoàn toàn cài đặt và cơ sở dữ liệu hiện tại. Các thay đổi chưa lưu sẽ bị mất. Bạn có chắc không?",
        confirm: "Xác nhận khôi phục và ghi đè",
        connected: "Kết nối thành công",
        saved: "Thông tin xác thực đã được lưu an toàn",
        missing: "Vui lòng nhập URL và tên người dùng",
        fetching: "Đang tải danh sách...",
        noBackups: "Không tìm thấy bản sao lưu",
        configureFirst: "Vui lòng cấu hình WebDAV trước",
        restoreSuccess: "Khôi phục thành công, vui lòng khởi động lại ứng dụng",
        restoreFailed: "Khôi phục thất bại, mã lỗi: ${e}",
        backupSuccess: "Sao lưu thành công",
        backupFailed: "Sao lưu thất bại, mã lỗi: ${e}",
        loadHistoryFailed: "Tải lịch sử sao lưu thất bại, mã lỗi: ${e}",
        savefile: "Lưu thành tệp .zip",
        restorefile: "Khôi phục từ tệp .zip"
      },

      about: {
        version: "Phiên bản hiện tại",
        microsoftStore: "Microsoft Store",
        microsoftStoreDesc: "Đánh giá PiTerm hoặc kiểm tra cập nhật trong Microsoft Store",
        openInStore: "Mở trong Cửa hàng"
      }
    }
  }
};

