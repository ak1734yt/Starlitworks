export const SERVER_PLANS = [
  {
    id: 'normal',
    name: 'Normal Starter Pack',
    price: 1000,
    tag: '',
    features: [
      'Role hierarchy',
      'Basic moderation & logs setup',
      'Standard server security',
      '1-2 Bot Set',
      'Welcome setup',
      '7 days support',
      '2–3 days delivery',
      'Quick Delivery available'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1500,
    tag: 'Most Sold',
    features: [
      'Advanced + growth roles (level/colours)',
      'Tickets setup',
      'Super Secure',
      'Basic moderation & logs setup',
      'Welcome setup',
      '14 days support',
      '3–4 days delivery',
      'Backup included (server template)',
      'Quick Delivery available'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2000,
    tag: 'Best Plan',
    features: [
      'Everything in Pro + branding',
      'Extra automation + branding kit',
      'Super Secure+ hardening',
      'Guide for server',
      'Tickets setup',
      'Standard server security',
      '15 days VIP support',
      '3–4 days delivery',
      'Enhanced backup (media announcements)',
      'Quick Delivery available'
    ]
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 2500,
    tag: 'Best Reviews',
    features: [
      'Fully tailored architecture',
      'Extra automation + branding kit',
      'Enterprise Secure+',
      'Guide for server',
      'Security bot premium 1 month',
      '1 month no prefix',
      'Tickets setup',
      'Standard server security',
      '1 month management',
      '5–7 days delivery',
      'Enterprise backup',
      'Quick Delivery available'
    ]
  }
];

export const SERVER_ADDONS = [
  { id: 'custom_bot', name: 'Custom Bot', pricing: { premium: 'TBD', custom: 'TBD' } },
  { id: 'quick_del', name: 'Quick Delivery', pricing: { normal: 49, pro: 99, premium: 199, custom: 299 } },
  { id: 'welcome', name: 'Welcome / Self-Role / Guide', pricing: { normal: 0, pro: 0, premium: 0, custom: 0 } },
  { id: 'sec_hard', name: 'Extra Security Hardening', pricing: { pro: 319, premium: 319, custom: 319 }, suffix: '/mo' },
  { id: 'branding', name: 'Branding Pack', pricing: { premium: 99, custom: 149 } },
  { id: 'vc_tour', name: 'VC Tour Setup', pricing: { pro: 99, premium: 149, custom: 199 }, suffix: '/mo' },
  { id: 'event_mgr', name: 'Event / Giveaway Manager', pricing: { premium: 199, custom: 299 }, suffix: '/mo' },
  { id: 'priority_sup', name: 'Priority Support Extension', pricing: { normal: 500, pro: 500, premium: 500, custom: 500 }, suffix: '/mo' }
];

export const BOT_PLANS = [
  { id: 'sec_bot', name: 'Security Bot', price: 7000, features: ['Anti-nuke', 'Audit logging', 'Raid protection'] },
  { id: 'ticket_bot', name: 'Ticket Bot', price: 5000, features: ['Transcripts', 'Panel creation', 'Staff roles'] },
  { id: 'util_bot', name: 'Utility Bot', price: 5000, features: ['Moderation', 'Info commands', 'Welcome messages'] },
  { id: 'adv_util', name: 'Advanced Util Bot', price: 10000, features: ['Economy', 'Leveling', 'Custom commands'] },
  { id: 'music_bot', name: 'Music Bot', price: 3000, features: ['High quality audio', 'Playlists', 'Filters'] },
  { id: 'custom_bot', name: 'Fully Custom Bot', isManualPrice: true, features: ['Tailored to exact needs', 'Dedicated database', 'Priority support'] }
];

export const INFRASTRUCTURE = [
  { id: 'hosting', name: 'Hosting Plan', isManualPrice: true, isRecurring: true },
  { id: 'db_mongo', name: 'Database (MongoDB)', isManualPrice: true, isRecurring: true },
  { id: 'db_redis', name: 'Database (Redis)', isManualPrice: true, isRecurring: true },
  { id: 'db_sql', name: 'Database (PostgreSQL/MySQL)', isManualPrice: true, isRecurring: true },
  { id: 'db_supabase', name: 'Database (Supabase)', isManualPrice: true, isRecurring: true },
  { id: 'api_keys', name: 'External API Integrations', isManualPrice: true, isRecurring: true },
  { id: 'lavalink', name: 'Lavalink Server (Music)', isManualPrice: true, isRecurring: true }
];
