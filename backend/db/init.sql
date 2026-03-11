-- Blind box persistence + 3C chain registration timestamp
CREATE TABLE IF NOT EXISTS boxes (
  box_id         NUMERIC PRIMARY KEY,
  commitment     NUMERIC NOT NULL,
  salt_hex       TEXT NOT NULL,
  amount         NUMERIC,
  tier           INT,
  opened         BOOLEAN NOT NULL DEFAULT FALSE,
  chain_registered_at TIMESTAMPTZ,
  opened_by      TEXT,
  open_tx_hash   TEXT,
  opened_at      TIMESTAMPTZ,
  reward_wei     NUMERIC,
  opened_reward_wei NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS open_nonces (
  user_address TEXT PRIMARY KEY,
  nonce        NUMERIC NOT NULL DEFAULT 0
);
