CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_nickname ON users ((lower(nickname)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users ((lower(email)));
