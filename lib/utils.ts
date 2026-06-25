// lib/utils.ts - Safe utility functions for production
// \u26a0\ufe0f CRITICAL: Use these functions instead of direct operations

/**
 * Safely parse JSON from localStorage
 * Returns fallback value if parsing fails
 */
export const safeJsonParse = <T = any>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (err) {
    console.error("JSON parse error:", err);
    return fallback;
  }
};

/**
 * Safe localStorage getter with type safety
 */
export const getSafeLocalStorage = <T = any>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return safeJsonParse(item, fallback);
  } catch (err) {
    console.error(`Error getting localStorage key "${key}":`, err);
    return fallback;
  }
};

/**
 * Safe localStorage setter
 */
export const setSafeLocalStorage = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Error setting localStorage key "${key}":`, err);
    return false;
  }
};

/**
 * Production-safe logger (disabled in production, enabled in dev)
 * \ud83d\udd13 SECURITY: Debug logs are automatically disabled in production builds
 */
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env.DEV;

export const debugLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(`[DEBUG] ${message}`, data);
  }
};

export const debugWarn = (message: string, data?: any) => {
  if (isDevelopment) {
    console.warn(`[WARN] ${message}`, data);
  }
};

export const debugError = (message: string, error?: any) => {
  if (isDevelopment) {
    console.error(`[ERROR] ${message}`, error);
  }
  // Always log critical errors for monitoring
};

/**
 * Fetch with timeout and error handling
 */
export const fetchWithTimeoutAndError = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    throw err;
  }
};

/**
 * Rate limiter for sensitive operations (login, PIN entry, etc)
 */
export const createRateLimiter = (maxAttempts: number = 5, windowMs: number = 60000) => {
  let attempts: number[] = [];

  return {
    isAllowed: (): boolean => {
      const now = Date.now();
      attempts = attempts.filter(t => now - t < windowMs);
      
      if (attempts.length >= maxAttempts) {
        return false;
      }
      
      attempts.push(now);
      return true;
    },

    getRemainingTime: (): number => {
      if (attempts.length === 0) return 0;
      const now = Date.now();
      const oldestAttempt = attempts[0];
      const remaining = windowMs - (now - oldestAttempt);
      return Math.max(0, remaining);
    },

    reset: () => {
      attempts = [];
    }
  };
};

/**
 * Validate required environment variables at startup
 */
export const validateEnvironment = (): boolean => {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing: string[] = [];

  required.forEach(key => {
    if (!(import.meta as any).env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    console.error(`\u26a0\ufe0f FATAL: ${error}`);
    throw new Error(error);
  }

  return true;
};

/**
 * Safe tenant ID getter with validation
 */
export const getTenantIdOrThrow = (): string => {
  const tenantId = localStorage.getItem('tenant_id');
  if (!tenantId || !tenantId.trim()) {
    throw new Error('Tenant ID not found. Please login again.');
  }
  return tenantId;
};

/**
 * Safely parse JSON from localStorage or string to prevent crashes
 */
export const safeJSONParse = <T,>(data: string | null, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (err) {
    console.error("SafeJSONParse Error:", err);
    return fallback;
  }
};

/**
 * Type-safe data fetching from Supabase
 */
export const supabaseErrorHandler = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error) return error.error;

  return 'An error occurred while fetching data';
};
