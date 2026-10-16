-- =====================================================================
-- BOUNCEFORGE SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'support', 'admin')),
  provider TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  referred_by TEXT,
  is_suspended BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  creator_goal TEXT
);

-- 3. SUBSCRIPTIONS & ENTITLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  plan_id TEXT DEFAULT 'free' CHECK (plan_id IN ('free', 'gamer_pack', 'creator_pro')),
  billing_cycle TEXT DEFAULT 'month' CHECK (billing_cycle IN ('month', 'six_months', 'twelve_months')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  period_start TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  auto_searches_used_today INT DEFAULT 0,
  last_usage_date DATE DEFAULT CURRENT_DATE,
  export_count_total INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AFFILIATES TABLE
CREATE TABLE IF NOT EXISTS public.affiliates (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  custom_code TEXT UNIQUE,
  commission_rate_percent INT DEFAULT 30,
  total_clicks INT DEFAULT 0,
  total_signups INT DEFAULT 0,
  active_paying_customers INT DEFAULT 0,
  pending_balance NUMERIC(10, 2) DEFAULT 0.00,
  approved_balance NUMERIC(10, 2) DEFAULT 0.00,
  paid_earnings_total NUMERIC(10, 2) DEFAULT 0.00,
  payout_method TEXT,
  payout_account_masked TEXT,
  payout_account_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMISSIONS LOG
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_user_id UUID REFERENCES public.affiliates(user_id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_user_email_masked TEXT NOT NULL,
  order_id TEXT NOT NULL,
  order_amount NUMERIC(10, 2) NOT NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed_refund')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 6. PAYOUT REQUESTS
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_user_id UUID REFERENCES public.affiliates(user_id) ON DELETE CASCADE,
  affiliate_email TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  method TEXT NOT NULL,
  account_details_masked TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reference_number TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_user_email TEXT,
  details JSONB DEFAULT '{}'::JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ARTICLES / BLOG CMS TABLE
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  category_color TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  author_role TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  read_time_minutes INT DEFAULT 5,
  featured BOOLEAN DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT
);

-- 9. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  code TEXT PRIMARY KEY,
  discount_percent INT,
  discount_fixed_usd NUMERIC(10, 2),
  valid_for_plan TEXT,
  max_uses INT DEFAULT 500,
  times_used INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view & update their own profile; admins can view all
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Entitlements: Users read their own entitlement; admins can manage
CREATE POLICY "Users read own entitlements" ON public.entitlements
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins update entitlements" ON public.entitlements
  FOR ALL USING (public.is_admin());

-- Affiliates: Users read their own affiliate record; admins manage
CREATE POLICY "Users read own affiliate profile" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users update own affiliate code" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- Articles: Public read access; admins write
CREATE POLICY "Public read articles" ON public.articles
  FOR SELECT USING (true);

CREATE POLICY "Admins manage articles" ON public.articles
  FOR ALL USING (public.is_admin());

-- Coupons: Public read valid active coupons; admins manage
CREATE POLICY "Public read active coupons" ON public.coupons
  FOR SELECT USING (active = true);

CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL USING (public.is_admin());

-- Audit Logs: Admins only
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());
