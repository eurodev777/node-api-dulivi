CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_amount NUMERIC NOT NULL,
    delivery_fee NUMERIC,
    delivery_method TEXT NOT NULL DEFAULT 'entrega', -- entrega | retirada | no_local
    is_scheduled TEXT DEFAULT 'false',
    scheduled_for DATETIME,
    delivery_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    customer_name TEXT,
    customer_whatsapp TEXT,
    observation TEXT,
    paid TEXT DEFAULT 'false',
    status TEXT DEFAULT 'recebido', -- aceito | preparando | entrega | concluido
    mercadopago_pay_id TEXT,
    adjusted TEXT DEFAULT 'false',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    fk_store_delivery_areas_id INTEGER,
    fk_delivery_address_id INTEGER,
    payment_type TEXT,
    change TEXT,
    card_brand TEXT,
    fk_user_id INTEGER,
    fk_store_id INTEGER NOT NULL,
    FOREIGN KEY (fk_store_delivery_areas_id) REFERENCES store_delivery_areas (id) ON DELETE SET NULL,
    FOREIGN KEY (fk_delivery_address_id) REFERENCES delivery_address (id) ON DELETE SET NULL,
    FOREIGN KEY (fk_store_id) REFERENCES stores (id) ON DELETE CASCADE,
    FOREIGN KEY (fk_user_id) REFERENCES users (id) ON DELETE CASCADE
);