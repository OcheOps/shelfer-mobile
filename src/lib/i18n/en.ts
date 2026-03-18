export default {
  // Common
  back: 'Back',
  cancel: 'Cancel',
  retry: 'Retry',
  done: 'Done',
  skip: 'Skip',
  send: 'Send',
  save: 'Save',
  logout: 'Logout',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',

  // Auth
  login_title: 'Shelfer POS',
  login_subtitle: 'Sign in to start selling',
  login_email: 'Email',
  login_password: 'Password',
  login_button: 'Sign In',
  login_signing_in: 'Signing in...',
  login_error_required: 'Email and password required',

  // Branch
  branch_title: 'Select Branch',
  branch_subtitle: 'Choose your operating branch',
  branch_saving: 'Saving branch...',
  branch_registering: 'Registering device...',
  branch_loading_catalog: 'Loading catalog...',

  // POS
  pos_search: 'Search or scan barcode...',
  pos_cart_empty: 'Cart is empty',
  pos_total: 'Total',
  pos_complete: 'Complete Sale',
  pos_processing: 'Processing...',
  pos_offline: '● Offline — sales save locally',
  pos_slow: '● Slow connection',
  pos_cash: 'Cash',
  pos_card: 'Card',
  pos_mobile: 'Mobile',

  // Checkout
  checkout_tendered: 'Amount Tendered',
  checkout_change: 'Change Due',

  // Sale Success
  sale_complete: 'Sale Complete',
  sale_synced: '☁️ Synced',
  sale_queued: '⏳ Will sync when online',
  receipt_title: 'Send WhatsApp Receipt?',
  receipt_phone_placeholder: '+2348012345678',
  receipt_sending: '📤 Sending...',
  receipt_sent: '✅ Receipt sent',
  receipt_failed: '❌ Send failed — saved for retry',
  receipt_next: 'Next Customer',

  // Sales
  sales_title: 'Sales',
  sales_today: 'Today',
  sales_revenue: 'Revenue',
  sales_pending: 'Pending',
  sales_empty: 'No sales yet',

  // Sale Detail
  detail_title: 'Sale Detail',
  detail_items: 'Items',
  detail_retry_receipt: 'Retry Receipt Send',

  // Shifts
  shift_title: 'Shifts',
  shift_open: 'Open New Shift',
  shift_active: 'Active Shift',
  shift_close: 'Close Shift',
  shift_opening_cash: 'Opening Cash',
  shift_closing_cash: 'Closing Cash',
  shift_recent: 'Recent Shifts',

  // Settings
  settings_title: 'Settings',
  settings_account: 'Account',
  settings_device: 'Device',
  settings_sync: 'Sync',
  settings_data: 'Data',
  settings_role: 'Role',
  settings_branch: 'Branch',
  settings_network: 'Network',
  settings_pending_sync: 'Pending sync',
  settings_failed_sync: 'Failed sync',
  settings_synced: 'Total synced',
  settings_products: 'Cached products',
  settings_last_sync: 'Last catalog sync',
  settings_refresh: '🔄 Refresh Catalog',
  settings_sync_now: '☁️ Sync Sales Now',
  settings_refreshing: 'Syncing...',

  // Network
  net_online: '● Online',
  net_poor: '● Slow',
  net_offline: '○ Offline',

  // Errors
  err_session_expired: 'Session expired. Please log in again.',
  err_forbidden: "You don't have permission for this action.",
  err_not_found: 'The requested item was not found.',
  err_bad_request: 'Invalid request. Please check your input.',
  err_subscription: 'Your subscription is inactive. Contact your store admin.',
  err_rate_limited: 'Too many requests. Please wait a moment.',
  err_whatsapp: 'WhatsApp is not set up. Ask your manager to configure it.',
  err_generic: 'Something went wrong. Please try again.',
} as const;
