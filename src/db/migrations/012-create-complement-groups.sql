CREATE TABLE IF NOT EXISTS complement_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    option_minimum INTEGER DEFAULT 0,
    option_limit INTEGER DEFAULT 20,
    multiple_selection INTEGER DEFAULT 0,
    is_combo_group INTEGER DEFAULT 0,
    required INTEGER DEFAULT 0,
    fk_store_id INTEGER NOT NULL,
    FOREIGN KEY (fk_store_id) REFERENCES stores (id) ON DELETE CASCADE
);