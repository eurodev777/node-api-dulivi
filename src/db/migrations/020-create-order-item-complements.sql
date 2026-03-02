CREATE TABLE IF NOT EXISTS order_item_complements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quantity INTEGER,
  fk_order_item_id INTEGER NOT NULL,
  fk_complement_id INTEGER NOT NULL,
  FOREIGN KEY (fk_order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (fk_complement_id) REFERENCES complements(id) ON DELETE CASCADE
);
