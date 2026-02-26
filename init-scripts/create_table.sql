CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    jurisdiction VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
