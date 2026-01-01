export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // Common
    common: {
      search: 'Search',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      copy: 'Copy',
      copied: 'Copied',
      export: 'Export',
      download: 'Download',
      print: 'Print',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      loading: 'Loading...',
      processing: 'Processing...',
      generating: 'Generating...',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      active: 'Active',
      inactive: 'Inactive',
      all: 'All',
      none: 'None',
      settings: 'Settings',
      help: 'Help',
      language: 'Language',
      english: 'English',
      arabic: 'العربية',
    },

    // Navigation
    nav: {
      research: 'Research',
      search: 'Search',
      templates: 'Templates',
      urlScraper: 'URL Scraper',
      intelligence: 'Intelligence',
      hypothesis: 'Hypothesis Lab',
      leads: 'Lead Enrichment',
      outputs: 'Outputs',
      history: 'History',
      scheduled: 'Scheduled Tasks',
      system: 'System',
      integrations: 'Integrations',
      settings: 'Settings',
    },

    // Hero Section
    hero: {
      title: 'AI-Powered Research Engine',
      subtitle: 'Deep web research, intelligent data extraction, and comprehensive report generation',
      badge: 'Powered by Advanced AI',
    },

    // Search
    search: {
      placeholder: 'Enter your research query, topic, or URL to scrape...',
      whatToResearch: 'What would you like to research?',
      urlDetected: 'URL detected - Scrape or search for it',
      searchingWeb: 'Searching the web',
      researchFilters: 'Research Filters',
      deepVerify: 'Deep Verify',
      deepVerifyDesc: 'Cross-reference multiple sources for higher accuracy',
      reportFormat: 'Report Format',
      chars: 'chars',
      startResearch: 'Start Research',
      scrapeUrl: 'Scrape URL',
      enhancePrompt: 'AI Enhance',
      enhancePromptDesc: 'Let AI improve your research query',
    },

    // Report
    report: {
      title: 'Research Report',
      generatedTitle: 'Report Title',
      generateTitle: 'Generate Title',
      generatingTitle: 'Generating title...',
      aiGenerated: 'AI Generated',
      exportPdf: 'Export PDF',
      exportMarkdown: 'Markdown',
      exportHtml: 'HTML',
      exportJson: 'JSON',
      exportCsv: 'CSV',
      validationReport: 'Validation Report',
      dataQuality: 'Data Quality',
      sourceCoverage: 'Source Coverage',
      confidenceLevel: 'Confidence Level',
      sources: 'Sources',
      generated: 'Generated',
      refinePrompt: 'Refine Prompt',
      refinePromptDesc: 'Use AI to refine your research prompt',
    },

    // URL Scraper
    scraper: {
      title: 'AI Web Scraper',
      subtitle: 'Command AI to extract and format web content',
      enterUrl: 'Enter URL to scrape',
      scrapeEngine: 'Scrape Engine',
      embedded: 'Embedded Engine',
      firecrawl: 'Firecrawl API',
      timeframe: 'Timeframe',
      runNow: 'Run Now',
      schedule: 'Schedule',
      linkToTask: 'Link to Task',
      aiChat: 'AI Chat',
      aiChatWelcome: "Hello! I'm your AI scraping assistant. Tell me what you want to extract from a website.",
      aiChatExamples: 'Examples:',
      modes: {
        ai: 'AI Command',
        scrape: 'Scrape',
        search: 'Search',
        map: 'Map Site',
      },
      formats: {
        markdown: 'Markdown',
        html: 'HTML',
        links: 'Links',
        screenshot: 'Screenshot',
        branding: 'Branding',
        summary: 'AI Summary',
      },
    },

    // Hypothesis Lab
    hypothesis: {
      title: 'AI Hypothesis Lab',
      subtitle: 'Test your hypotheses with AI-powered evidence gathering',
      enterHypothesis: 'Enter your hypothesis to test...',
      testHypothesis: 'Test Hypothesis',
      enhancePrompt: 'Enhance',
      promptSuggestions: 'Prompt Suggestions',
      categories: {
        business: 'Business',
        technology: 'Technology',
        science: 'Science',
      },
      results: {
        confidence: 'Confidence',
        supporting: 'Supporting Evidence',
        refuting: 'Refuting Evidence',
        sources: 'Sources Analyzed',
      },
    },

    // Lead Enrichment
    leads: {
      title: 'AI Lead Enrichment',
      subtitle: 'Enrich leads with AI-powered data gathering',
      searchPerson: 'Search Person',
      searchCompany: 'Search Company',
      enterName: 'Enter name or company...',
      enriching: 'Enriching lead data...',
      results: {
        profile: 'Profile',
        company: 'Company',
        contact: 'Contact Info',
        social: 'Social Media',
        insights: 'AI Insights',
      },
    },

    // Templates
    templates: {
      title: 'Research Templates',
      subtitle: 'Pre-built research workflows for common use cases',
      useTemplate: 'Use Template',
      recentlyUsed: 'Recently Used',
      categories: {
        market: 'Market Research',
        competitor: 'Competitor Analysis',
        industry: 'Industry Analysis',
        company: 'Company Research',
        technology: 'Technology Research',
        regulatory: 'Regulatory Research',
      },
    },

    // Scheduled Tasks
    scheduled: {
      title: 'Scheduled Tasks',
      subtitle: 'Automate your research with scheduled tasks',
      createTask: 'Create Task',
      editTask: 'Edit Task',
      deleteTask: 'Delete Task',
      runNow: 'Run Now',
      nextRun: 'Next Run',
      lastRun: 'Last Run',
      status: {
        active: 'Active',
        paused: 'Paused',
        completed: 'Completed',
        failed: 'Failed',
      },
    },

    // Integrations
    integrations: {
      title: 'Integrations',
      subtitle: 'Connect your favorite tools and services',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connected: 'Connected',
      configure: 'Configure',
      apiKey: 'API Key',
      enterApiKey: 'Enter API Key',
      categories: {
        crm: 'CRM',
        leadEnrichment: 'Lead Enrichment',
        ai: 'AI & LLM',
        scraping: 'Web Scraping',
        automation: 'Automation',
      },
    },

    // Time
    time: {
      now: 'Now',
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      thisYear: 'This Year',
      custom: 'Custom',
      in1Hour: 'In 1 Hour',
      in6Hours: 'In 6 Hours',
      in12Hours: 'In 12 Hours',
      in24Hours: 'In 24 Hours',
    },

    // Errors
    errors: {
      somethingWentWrong: 'Something went wrong',
      tryAgain: 'Please try again',
      networkError: 'Network error',
      unauthorized: 'Unauthorized',
      notFound: 'Not found',
      rateLimited: 'Rate limited, please try again later',
      invalidInput: 'Invalid input',
    },
  },

  ar: {
    // Common
    common: {
      search: 'بحث',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      copy: 'نسخ',
      copied: 'تم النسخ',
      export: 'تصدير',
      download: 'تحميل',
      print: 'طباعة',
      back: 'رجوع',
      next: 'التالي',
      submit: 'إرسال',
      loading: 'جاري التحميل...',
      processing: 'جاري المعالجة...',
      generating: 'جاري الإنشاء...',
      success: 'نجاح',
      error: 'خطأ',
      warning: 'تحذير',
      info: 'معلومات',
      close: 'إغلاق',
      yes: 'نعم',
      no: 'لا',
      confirm: 'تأكيد',
      active: 'نشط',
      inactive: 'غير نشط',
      all: 'الكل',
      none: 'لا شيء',
      settings: 'الإعدادات',
      help: 'مساعدة',
      language: 'اللغة',
      english: 'English',
      arabic: 'العربية',
    },

    // Navigation
    nav: {
      research: 'البحث',
      search: 'بحث',
      templates: 'القوالب',
      urlScraper: 'استخراج الروابط',
      intelligence: 'الذكاء',
      hypothesis: 'مختبر الفرضيات',
      leads: 'إثراء العملاء',
      outputs: 'المخرجات',
      history: 'السجل',
      scheduled: 'المهام المجدولة',
      system: 'النظام',
      integrations: 'التكاملات',
      settings: 'الإعدادات',
    },

    // Hero Section
    hero: {
      title: 'محرك البحث بالذكاء الاصطناعي',
      subtitle: 'بحث عميق في الويب، استخراج البيانات الذكي، وإنشاء تقارير شاملة',
      badge: 'مدعوم بالذكاء الاصطناعي المتقدم',
    },

    // Search
    search: {
      placeholder: 'أدخل استعلام البحث أو الموضوع أو الرابط للاستخراج...',
      whatToResearch: 'ماذا تريد أن تبحث؟',
      urlDetected: 'تم اكتشاف رابط - استخرج أو ابحث عنه',
      searchingWeb: 'جاري البحث في الويب',
      researchFilters: 'فلاتر البحث',
      deepVerify: 'تحقق عميق',
      deepVerifyDesc: 'مقارنة مصادر متعددة لدقة أعلى',
      reportFormat: 'صيغة التقرير',
      chars: 'حرف',
      startResearch: 'ابدأ البحث',
      scrapeUrl: 'استخراج الرابط',
      enhancePrompt: 'تحسين بالذكاء الاصطناعي',
      enhancePromptDesc: 'دع الذكاء الاصطناعي يحسن استعلام البحث',
    },

    // Report
    report: {
      title: 'تقرير البحث',
      generatedTitle: 'عنوان التقرير',
      generateTitle: 'إنشاء عنوان',
      generatingTitle: 'جاري إنشاء العنوان...',
      aiGenerated: 'أنشئ بالذكاء الاصطناعي',
      exportPdf: 'تصدير PDF',
      exportMarkdown: 'Markdown',
      exportHtml: 'HTML',
      exportJson: 'JSON',
      exportCsv: 'CSV',
      validationReport: 'تقرير التحقق',
      dataQuality: 'جودة البيانات',
      sourceCoverage: 'تغطية المصادر',
      confidenceLevel: 'مستوى الثقة',
      sources: 'المصادر',
      generated: 'تم الإنشاء',
      refinePrompt: 'تحسين الطلب',
      refinePromptDesc: 'استخدم الذكاء الاصطناعي لتحسين طلب البحث',
    },

    // URL Scraper
    scraper: {
      title: 'مستخرج الويب بالذكاء الاصطناعي',
      subtitle: 'أمر الذكاء الاصطناعي لاستخراج وتنسيق محتوى الويب',
      enterUrl: 'أدخل الرابط للاستخراج',
      scrapeEngine: 'محرك الاستخراج',
      embedded: 'المحرك المدمج',
      firecrawl: 'Firecrawl API',
      timeframe: 'الإطار الزمني',
      runNow: 'تشغيل الآن',
      schedule: 'جدولة',
      linkToTask: 'ربط بمهمة',
      aiChat: 'محادثة الذكاء الاصطناعي',
      aiChatWelcome: 'مرحباً! أنا مساعد الاستخراج بالذكاء الاصطناعي. أخبرني ماذا تريد استخراجه من الموقع.',
      aiChatExamples: 'أمثلة:',
      modes: {
        ai: 'أمر الذكاء الاصطناعي',
        scrape: 'استخراج',
        search: 'بحث',
        map: 'خريطة الموقع',
      },
      formats: {
        markdown: 'Markdown',
        html: 'HTML',
        links: 'الروابط',
        screenshot: 'لقطة شاشة',
        branding: 'العلامة التجارية',
        summary: 'ملخص الذكاء الاصطناعي',
      },
    },

    // Hypothesis Lab
    hypothesis: {
      title: 'مختبر الفرضيات بالذكاء الاصطناعي',
      subtitle: 'اختبر فرضياتك بجمع الأدلة المدعوم بالذكاء الاصطناعي',
      enterHypothesis: 'أدخل فرضيتك للاختبار...',
      testHypothesis: 'اختبار الفرضية',
      enhancePrompt: 'تحسين',
      promptSuggestions: 'اقتراحات الطلبات',
      categories: {
        business: 'الأعمال',
        technology: 'التكنولوجيا',
        science: 'العلوم',
      },
      results: {
        confidence: 'الثقة',
        supporting: 'الأدلة الداعمة',
        refuting: 'الأدلة المعارضة',
        sources: 'المصادر المحللة',
      },
    },

    // Lead Enrichment
    leads: {
      title: 'إثراء العملاء بالذكاء الاصطناعي',
      subtitle: 'إثراء العملاء بجمع البيانات المدعوم بالذكاء الاصطناعي',
      searchPerson: 'بحث عن شخص',
      searchCompany: 'بحث عن شركة',
      enterName: 'أدخل الاسم أو الشركة...',
      enriching: 'جاري إثراء بيانات العميل...',
      results: {
        profile: 'الملف الشخصي',
        company: 'الشركة',
        contact: 'معلومات الاتصال',
        social: 'وسائل التواصل',
        insights: 'رؤى الذكاء الاصطناعي',
      },
    },

    // Templates
    templates: {
      title: 'قوالب البحث',
      subtitle: 'سير عمل البحث الجاهزة لحالات الاستخدام الشائعة',
      useTemplate: 'استخدم القالب',
      recentlyUsed: 'المستخدمة مؤخراً',
      categories: {
        market: 'بحث السوق',
        competitor: 'تحليل المنافسين',
        industry: 'تحليل الصناعة',
        company: 'بحث الشركة',
        technology: 'بحث التكنولوجيا',
        regulatory: 'البحث التنظيمي',
      },
    },

    // Scheduled Tasks
    scheduled: {
      title: 'المهام المجدولة',
      subtitle: 'أتمتة بحثك بالمهام المجدولة',
      createTask: 'إنشاء مهمة',
      editTask: 'تعديل المهمة',
      deleteTask: 'حذف المهمة',
      runNow: 'تشغيل الآن',
      nextRun: 'التشغيل القادم',
      lastRun: 'آخر تشغيل',
      status: {
        active: 'نشط',
        paused: 'متوقف',
        completed: 'مكتمل',
        failed: 'فشل',
      },
    },

    // Integrations
    integrations: {
      title: 'التكاملات',
      subtitle: 'ربط أدواتك وخدماتك المفضلة',
      connect: 'ربط',
      disconnect: 'إلغاء الربط',
      connected: 'متصل',
      configure: 'تكوين',
      apiKey: 'مفتاح API',
      enterApiKey: 'أدخل مفتاح API',
      categories: {
        crm: 'إدارة العملاء',
        leadEnrichment: 'إثراء العملاء',
        ai: 'الذكاء الاصطناعي',
        scraping: 'استخراج الويب',
        automation: 'الأتمتة',
      },
    },

    // Time
    time: {
      now: 'الآن',
      today: 'اليوم',
      yesterday: 'أمس',
      thisWeek: 'هذا الأسبوع',
      thisMonth: 'هذا الشهر',
      thisYear: 'هذه السنة',
      custom: 'مخصص',
      in1Hour: 'بعد ساعة',
      in6Hours: 'بعد 6 ساعات',
      in12Hours: 'بعد 12 ساعة',
      in24Hours: 'بعد 24 ساعة',
    },

    // Errors
    errors: {
      somethingWentWrong: 'حدث خطأ ما',
      tryAgain: 'يرجى المحاولة مرة أخرى',
      networkError: 'خطأ في الشبكة',
      unauthorized: 'غير مصرح',
      notFound: 'غير موجود',
      rateLimited: 'تجاوزت الحد المسموح، حاول لاحقاً',
      invalidInput: 'إدخال غير صالح',
    },
  },
};

export type TranslationKeys = typeof translations.en;
