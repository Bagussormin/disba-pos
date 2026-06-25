# 🛠️ DISBA POS - DETAILED IMPLEMENTATION GUIDE
## Step-by-Step Code Fixes for Critical Issues

**Audience:** Backend & Frontend Developers  
**Timeline:** Implement in order of priority  
**Last Updated:** June 6, 2026

---

## FIX 1: Hash Passwords (Backend Required)

### Problem
Passwords stored as plaintext in `users` table. If DB is breached, all passwords exposed.

### Solution: Create Backend Endpoint

**Tech Stack Options:**
- Node.js with bcryptjs
- Python Flask/Django
- Any backend with bcrypt support

### Step 1: Create Backend API for Password Verification

**Node.js + Express Example:**

```typescript
// backend/routes/auth.ts
import express from 'express';
import * as bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Verify admin password (backend-side, not exposed to client)
router.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length > 255 || password.length > 512) {
      return res.status(400).json({ error: 'Invalid input length' });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('role', 'admin')
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare passwords using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Log failed attempt for audit
      console.warn(`Failed login attempt for ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return user info (without password)
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenant_id: user.tenant_id,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

### Step 2: Update Frontend Login

**Updated AdminLogin.tsx:**

```typescript
import { useState } from "react";
import { Lock, Building2, User, ShieldCheck, Loader2 } from "lucide-react"; 
import { validateEnvironment, fetchWithTimeoutAndError } from "../../lib/utils";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      // Clear previous errors
      setError("");

      // Validate input
      if (!username || !password) {
        setError("Harap isi username dan password!");
        return;
      }

      if (username.length < 3 || username.length > 255) {
        setError("Username harus 3-255 karakter");
        return;
      }

      if (password.length < 8) {
        setError("Password minimal 8 karakter");
        return;
      }

      setLoading(true);

      // Get API endpoint from environment or use relative path
      const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;

      // Call backend for password verification
      const response = await fetchWithTimeoutAndError(
        `${apiBase}/api/admin/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Akses Ditolak: Username/Password salah");
        setLoading(false);
        return;
      }

      // Success - save session
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("tenant_id", data.user.tenant_id);

      // Get tenant name from backend
      const tenantResponse = await fetchWithTimeoutAndError(
        `${apiBase}/api/tenants/${data.user.tenant_id}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem("auth_token")}` } }
      );

      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        localStorage.setItem("tenant_name", tenantData.business_name);
      }

      setTimeout(() => {
        window.location.href = "/admin/dashboard";
      }, 100);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic uppercase">Outlet HQ</h1>
          <p className="text-xs text-gray-500 mt-2">Manager Portal</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400">Username</label>
            <input 
              type="text" 
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="animate-spin" size={16} />}
          Masuk
        </button>
      </div>
    </div>
  );
}
```

### Step 3: Update Database Schema

**SQL Migration:**

```sql
-- 1. Add password_hash column
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- 2. Hash existing plaintext passwords (one-time migration)
-- WARNING: Test this in staging first!
UPDATE users 
SET password_hash = CRYPT(password, GEN_SALT('bf', 12))
WHERE password_hash IS NULL AND password IS NOT NULL;

-- 3. Make password_hash NOT NULL
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- 4. Drop old plaintext password column (after verification)
ALTER TABLE users DROP COLUMN password;

-- 5. Create index for faster lookups
CREATE INDEX idx_users_username_tenant ON users(username, tenant_id);
```

**Note:** CRYPT is PostgreSQL function. Use appropriate bcrypt function for your database.

---

## FIX 2: PIN Verification via Backend

### Problem
PIN hashing with bcryptjs on client-side is slow and insecure.

### Solution: Move to Backend

**Backend API:**

```typescript
// backend/routes/auth.ts - Add PIN verification endpoint
router.post('/api/verify-pin', async (req, res) => {
  try {
    const { pin, tenant_id } = req.body;
    const clientIp = req.ip;

    // Rate limiting check
    const key = `pin_attempts_${clientIp}`;
    const attempts = redis.get(key) || 0;

    if (attempts >= 5) {
      return res.status(429).json({ 
        error: 'Too many attempts. Try again in 1 minute.',
        remaining_time: redis.ttl(key)
      });
    }

    // Input validation
    if (!pin || !tenant_id) {
      return res.status(400).json({ error: 'PIN and tenant_id required' });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    // Get users for this tenant only
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenant_id);

    if (error || !users) {
      return res.status(401).json({ error: 'Verification failed' });
    }

    // Find user with matching PIN
    let matchedUser = null;
    for (const user of users) {
      const isMatch = await bcrypt.compare(pin, user.pin_hash);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      // Increment attempts
      redis.incr(key);
      redis.expire(key, 60); // Expire after 60 seconds

      return res.status(401).json({ 
        error: 'PIN Salah',
        attempts_remaining: 5 - (attempts + 1)
      });
    }

    // Success - clear rate limit
    redis.del(key);

    return res.json({
      success: true,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        tenant_id: matchedUser.tenant_id
      }
    });
  } catch (err) {
    console.error('PIN verify error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
```

**Updated Frontend:**

```typescript
// components/admin/Login.tsx
const handleLogin = async () => {
  if (pin.length < 4) return alert("Masukkan PIN minimal 4 angka!");
  setLoading(true);

  try {
    const tenantId = localStorage.getItem("tenant_id");
    if (!tenantId) throw new Error("Tenant ID tidak ditemukan");

    const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;

    const response = await fetchWithTimeoutAndError(
      `${apiBase}/api/verify-pin`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, tenant_id: tenantId })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const remaining = data.attempts_remaining;
      alert(data.error + (remaining ? ` (${remaining} attempts remaining)` : ''));
      setPin("");
      return;
    }

    // Success
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("username", data.user.username);
    
    setPin("");
    onLoginSuccess(data.user.role);
  } catch (err: any) {
    alert(err.message || "Login gagal");
    setPin("");
  } finally {
    setLoading(false);
  }
};
```

---

## FIX 3: Rate Limiting on Login

### Problem
No protection against brute force attacks.

### Solution: Implement Server-Side Rate Limiting

**Using Express Rate Limiter:**

```typescript
// backend/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

// Rate limiter for login attempts
export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'login_limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Rate limiter for PIN attempts
export const pinLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'pin_limit:',
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  skip: (req) => req.ip === 'localhost', // Allow local testing
});

// Apply to routes
app.post('/api/admin/login', loginLimiter, adminLoginHandler);
app.post('/api/verify-pin', pinLimiter, verifyPinHandler);
```

---

## FIX 4: Input Validation (Frontend & Backend)

### Problem
No validation on form inputs. Could lead to injection attacks.

### Solution: Add Comprehensive Validation

**Create Validation Schema:**

```typescript
// lib/validation.ts
import * as z from 'zod';

export const adminLoginSchema = z.object({
  username: z.string()
    .min(3, 'Username minimal 3 karakter')
    .max(255, 'Username maksimal 255 karakter')
    .regex(/^[a-zA-Z0-9@._-]+$/, 'Username hanya boleh berisi alphanumeric, @, ., _, -'),
  
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .max(512, 'Password terlalu panjang')
});

export const pinSchema = z.object({
  pin: z.string()
    .regex(/^\d{4,6}$/, 'PIN harus 4-6 digit angka')
});

export const userFormSchema = z.object({
  username: z.string()
    .min(3, 'Minimal 3 karakter')
    .max(50, 'Maksimal 50 karakter'),
  
  email: z.string()
    .email('Email tidak valid')
    .optional(),
  
  role: z.enum(['admin', 'kasir', 'waiter', 'kitchen']),
  
  pin: z.string()
    .regex(/^\d{4,6}$/, 'PIN harus 4-6 digit')
});

// Type-safe form data
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UserFormInput = z.infer<typeof userFormSchema>;
```

**Use in Component:**

```typescript
const handleLogin = async () => {
  try {
    // Validate input
    const validationResult = adminLoginSchema.safeParse({ username, password });

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      setError(Object.values(errors).flat()[0] || 'Validation error');
      return;
    }

    const { username: validUsername, password: validPassword } = validationResult.data;

    // Continue with login...
  } catch (err) {
    setError('Login gagal');
  }
};
```

---

## FIX 5: Safe JSON Parsing

### Problem
Malformed JSON in localStorage crashes app.

### Solution: Use Safe Parse Utility

**Already created in lib/utils.ts**

**Usage:**

```typescript
// Before (DANGEROUS):
const cart = JSON.parse(localStorage.getItem("cart"));

// After (SAFE):
import { getSafeLocalStorage } from "../../lib/utils";

const cart = getSafeLocalStorage("cart", []);
// If malformed or missing, returns [] automatically
```

**Replace in all components:**

```bash
# Search for JSON.parse
grep -r "JSON.parse" components/ --include="*.tsx"

# Replace manually or use script:
# sed -i 's/JSON.parse(localStorage.getItem("\([^"]*\)")/getSafeLocalStorage("\1", {}/g' components/**/*.tsx
```

---

## FIX 6: Safe Supabase Queries

### Pattern
Always include tenant_id filter:

```typescript
// BEFORE (DANGEROUS - Could leak cross-tenant data):
const { data, error } = await supabase
  .from("menus")
  .select("*")
  .order("name");

// AFTER (SAFE - Includes tenant isolation):
const { data, error } = await supabase
  .from("menus")
  .select("*")
  .eq("tenant_id", tenantId) // ✅ REQUIRED
  .order("name");
```

**Create Helper Function:**

```typescript
// lib/supabase-queries.ts
import { supabase } from './supabase';

export const getTenantMenus = async (tenantId: string) => {
  if (!tenantId) throw new Error('Tenant ID required');

  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const getTenantUsers = async (tenantId: string, role?: string) => {
  if (!tenantId) throw new Error('Tenant ID required');

  let query = supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId);

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// ... more helper functions
```

---

## FIX 7: Supabase RLS Policies

### Create Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ... for all tables

-- Users table policy
CREATE POLICY "Users can only see their tenant" ON users
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- Transactions table policy
CREATE POLICY "Transactions visible to tenant" ON transactions
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- Menus table policy
CREATE POLICY "Menus visible to tenant" ON menus
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );
```

---

## FIX 8: Environment Setup

### Create .env.local (NOT committed to git)

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Supreme Founder Access (Strong credentials!)
VITE_SUPREME_EMAIL=founder@companyname.com
VITE_SUPREME_PASSWORD=generate-strong-password-32-chars-min!@#$

# API Configuration
VITE_API_BASE=http://localhost:3001

# Environment
VITE_ENV=development
```

### Update .gitignore

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.prod

# Never commit secrets
!.env.example
```

### Create .env.example

```env
# Copy this file to .env.local and fill in your values

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here

# Credentials (use strong values!)
VITE_SUPREME_EMAIL=founder@company.com
VITE_SUPREME_PASSWORD=your-strong-password

# API
VITE_API_BASE=http://localhost:3001
```

---

## SUMMARY OF CHANGES

| File | Change | Priority |
|------|--------|----------|
| backend/routes/auth.ts | Create password verification endpoint | CRITICAL |
| components/admin/AdminLogin.tsx | Use backend verification | CRITICAL |
| backend/routes/pin.ts | Create PIN verification endpoint | CRITICAL |
| components/admin/Login.tsx | Use backend PIN verification | CRITICAL |
| backend/middleware/rateLimiter.ts | Add rate limiting | CRITICAL |
| lib/validation.ts | Create validation schemas | CRITICAL |
| lib/utils.ts | Safe JSON parsing (DONE) | CRITICAL |
| lib/supabase-queries.ts | Safe tenant queries | CRITICAL |
| .env.local | Add environment variables | CRITICAL |
| database/migrations.sql | Hash passwords migration | CRITICAL |

---

**Next Step:** Start with Fix 1 (Backend Password Hashing) as it's prerequisite for all other fixes.
