-- Investment Portfolio Schema Migration
-- Creates tables for investment tracking: accounts, holdings, transactions, price snapshots, portfolio snapshots

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- investment_accounts: User's investment accounts (brokerages, wallets, etc.)
CREATE TABLE investment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stock', 'mutual_fund', 'crypto', 'gold', 'other')),
    broker TEXT,
    currency TEXT NOT NULL DEFAULT 'IDR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- investment_holdings: Current holdings within each account
CREATE TABLE investment_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('equity', 'fixed_income', 'crypto', 'commodity', 'cash', 'other')),
    quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
    avg_buy_price NUMERIC(24, 8),
    currency TEXT NOT NULL DEFAULT 'IDR',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (account_id, symbol)
);

-- investment_transactions: Buy/sell/dividend/fee transactions per holding
CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_id UUID NOT NULL REFERENCES investment_holdings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'buy', 'sell', 'dividend', 'split', 'merge',
        'transfer_in', 'transfer_out', 'fee', 'interest',
        'staking_reward', 'airdrop'
    )),
    quantity NUMERIC(24, 8) NOT NULL,
    price NUMERIC(24, 8) NOT NULL,
    fees NUMERIC(24, 8) DEFAULT 0,
    taxes NUMERIC(24, 8) DEFAULT 0,
    total_amount NUMERIC(24, 8) GENERATED ALWAYS AS (quantity * price + fees + taxes) STORED,
    transaction_date TIMESTAMPTZ NOT NULL,
    settlement_date TIMESTAMPTZ,
    notes TEXT,
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- investment_price_snapshots: Historical price data for symbols
CREATE TABLE investment_price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    price NUMERIC(24, 8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    source TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (symbol, asset_class, source, timestamp)
);

-- portfolio_snapshots: Daily portfolio valuation per user
CREATE TABLE portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_value NUMERIC(24, 2) NOT NULL,
    total_cost NUMERIC(24, 2) NOT NULL,
    total_gain_loss NUMERIC(24, 2) GENERATED ALWAYS AS (total_value - total_cost) STORED,
    total_gain_loss_pct NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN total_cost > 0 THEN (total_value - total_cost) / total_cost * 100 ELSE 0 END
    ) STORED,
    day_change NUMERIC(24, 2),
    day_change_pct NUMERIC(10, 4),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, snapshot_date)
);

-- Indexes for query performance
CREATE INDEX idx_investment_accounts_user ON investment_accounts(user_id);
CREATE INDEX idx_investment_holdings_account ON investment_holdings(account_id);
CREATE INDEX idx_investment_holdings_user ON investment_holdings(user_id);
CREATE INDEX idx_investment_holdings_symbol ON investment_holdings(symbol);
CREATE INDEX idx_investment_transactions_holding ON investment_transactions(holding_id);
CREATE INDEX idx_investment_transactions_user_date ON investment_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_investment_transactions_type ON investment_transactions(type);
CREATE INDEX idx_investment_price_snapshots_symbol_date ON investment_price_snapshots(symbol, asset_class, timestamp DESC);
CREATE INDEX idx_investment_price_snapshots_source ON investment_price_snapshots(source);
CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);

-- Row Level Security Policies
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- investment_accounts policies
CREATE POLICY "Users can view own investment accounts" ON investment_accounts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own investment accounts" ON investment_accounts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own investment accounts" ON investment_accounts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own investment accounts" ON investment_accounts
    FOR DELETE USING (user_id = auth.uid());

-- investment_holdings policies
CREATE POLICY "Users can view own holdings" ON investment_holdings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own holdings" ON investment_holdings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own holdings" ON investment_holdings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own holdings" ON investment_holdings
    FOR DELETE USING (user_id = auth.uid());

-- investment_transactions policies
CREATE POLICY "Users can view own transactions" ON investment_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON investment_transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions" ON investment_transactions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions" ON investment_transactions
    FOR DELETE USING (user_id = auth.uid());

-- investment_price_snapshots: Public read (price data is not user-specific)
CREATE POLICY "Anyone can view price snapshots" ON investment_price_snapshots
    FOR SELECT USING (true);

-- Only service role can insert/update price snapshots (via cron jobs)
CREATE POLICY "Service role can manage price snapshots" ON investment_price_snapshots
    FOR ALL USING (auth.role() = 'service_role');

-- portfolio_snapshots policies
CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage portfolio snapshots" ON portfolio_snapshots
    FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_investment_accounts_updated_at
    BEFORE UPDATE ON investment_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_holdings_updated_at
    BEFORE UPDATE ON investment_holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_transactions_updated_at
    BEFORE UPDATE ON investment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Recalculate holding average buy price from transactions (weighted average)
CREATE OR REPLACE FUNCTION recalculate_holding_avg_price(p_holding_id UUID)
RETURNS NUMERIC(24, 8) AS $$
DECLARE
    v_avg_price NUMERIC(24, 8);
BEGIN
    -- Weighted average of buy transactions only
    SELECT SUM(quantity * price) / NULLIF(SUM(quantity), 0)
    INTO v_avg_price
    FROM investment_transactions
    WHERE holding_id = p_holding_id
      AND type IN ('buy', 'transfer_in')
      AND quantity > 0;

    -- Update holding
    UPDATE investment_holdings
    SET avg_buy_price = v_avg_price,
        updated_at = now()
    WHERE id = p_holding_id;

    RETURN v_avg_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Refresh portfolio snapshot for a user (daily aggregation)
CREATE OR REPLACE FUNCTION refresh_portfolio_snapshot(p_user_id UUID)
RETURNS portfolio_snapshots AS $$
DECLARE
    v_snapshot portfolio_snapshots;
    v_total_value NUMERIC(24, 2);
    v_total_cost NUMERIC(24, 2);
    v_day_change NUMERIC(24, 2);
    v_prev_snapshot portfolio_snapshots;
BEGIN
    -- Calculate current portfolio value and cost from holdings
    SELECT
        COALESCE(SUM(h.quantity * COALESCE(latest_price.price, h.avg_buy_price, 0)), 0)::NUMERIC(24, 2),
        COALESCE(SUM(h.quantity * COALESCE(h.avg_buy_price, 0)), 0)::NUMERIC(24, 2)
    INTO v_total_value, v_total_cost
    FROM investment_holdings h
    LEFT JOIN LATERAL (
        SELECT price
        FROM investment_price_snapshots ps
        WHERE ps.symbol = h.symbol
          AND ps.asset_class = h.asset_class
        ORDER BY ps.timestamp DESC
        LIMIT 1
    ) latest_price ON true
    WHERE h.user_id = p_user_id;

    -- Get previous day's snapshot for day change calculation
    SELECT * INTO v_prev_snapshot
    FROM portfolio_snapshots
    WHERE user_id = p_user_id
      AND snapshot_date = CURRENT_DATE - INTERVAL '1 day'
    ORDER BY created_at DESC
    LIMIT 1;

    v_day_change := CASE
        WHEN v_prev_snapshot.total_value IS NOT NULL AND v_prev_snapshot.total_value > 0
        THEN v_total_value - v_prev_snapshot.total_value
        ELSE 0
    END;

    -- Upsert today's snapshot
    INSERT INTO portfolio_snapshots (user_id, total_value, total_cost, day_change, snapshot_date)
    VALUES (p_user_id, v_total_value, v_total_cost, v_day_change, CURRENT_DATE)
    ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
        total_value = EXCLUDED.total_value,
        total_cost = EXCLUDED.total_cost,
        day_change = EXCLUDED.day_change,
        created_at = now()
    RETURNING * INTO v_snapshot;

    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_holding_avg_price(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_portfolio_snapshot(UUID) TO authenticated;