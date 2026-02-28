const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");
const multer = require('multer');
const csv = require('csv-parser');
const format = require('pg-format');
const fs = require('fs');
const app = express();
const port = process.env.PORT;
const distPath = path.join(__dirname, "../dist");

const upload = multer({ dest: '/tmp/' });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());
app.use(express.static(distPath));

if (!globalThis.fetch) {
  console.warn(
    "⚠️ Увага: Ваша версія Node.js не підтримує fetch. Оновіть Node.js до v18+ або встановіть node-fetch.",
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('postgis') ? {
    rejectUnauthorized: false
  } : false
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Помилка підключення до бази:', err.stack);
  }
  console.log('Успішно підключено до PostgreSQL!');
  release();
});

async function getJurisdictionFromPostGIS(lat, lon) {
  try {
    const query = `
      SELECT name 
      FROM tax_regions 
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1;
    `;

    const result = await pool.query(query, [parseFloat(lon), parseFloat(lat)]);

    if (result.rows.length > 0) {
      const regionName = result.rows[0].name;

      const nycCounties = [
        "New York",
        "Kings",
        "Bronx",
        "Queens",
        "Richmond",
        "New York County",
        "Kings County",
        "Bronx County",
        "Queens County",
        "Richmond County",
      ];

      if (nycCounties.includes(regionName))
        return { name: "New York City", rate: 0.08875 };
      if (regionName.includes("Albany"))
        return { name: "Albany County", rate: 0.08 };
      if (regionName.includes("Onondaga"))
        return { name: "Syracuse (Onondaga)", rate: 0.08 };
      if (regionName.includes("Westchester"))
        return { name: "Westchester / Yonkers", rate: 0.08875 };

      return { name: `${regionName} (State Tax)`, rate: 0.04 };
    } else {
      return { name: "Out of NY State", rate: 0.0 };
    }
  } catch (error) {
    console.error("PostGIS Error:", error.message);
    return { name: "New York State (Fallback)", rate: 0.04 };
  }
}

app.get("/orders", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM orders";
    let countQuery = "SELECT COUNT(*) FROM orders";
    const params = [];
    const countParams = [];

    if (search) {
      const paramIndex = params.length + 1;
      const whereClause = ` WHERE id::text LIKE $${paramIndex} OR jurisdiction ILIKE $${paramIndex}`;

      query += whereClause;
      countQuery += whereClause;

      const searchPattern = `%${search}%`;
      params.push(searchPattern);
      countParams.push(searchPattern);
    }

    query += " ORDER BY id DESC";

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;

    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, countParams);

    const totalOrders = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit) || 1,
      totalOrders: totalOrders,
    });
  } catch (err) {
    console.error("Помилка при пошуку:", err.message);
    res.status(500).send("Server Error");
  }
});

app.post("/orders", async (req, res) => {
  try {
    const { latitude, longitude, subtotal } = req.body;

    const taxInfo = await getJurisdictionFromPostGIS(latitude, longitude);

    const taxAmount = (subtotal * taxInfo.rate).toFixed(2);
    const totalAmount = (parseFloat(subtotal) + parseFloat(taxAmount)).toFixed(
      2,
    );

    const newOrder = await pool.query(
      "INSERT INTO orders (latitude, longitude, subtotal, tax_amount, total_amount, jurisdiction) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [latitude, longitude, subtotal, taxAmount, totalAmount, taxInfo.name],
    );
    res.json(newOrder.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post("/orders/import", upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Файл не знайдено" });

    const client = await pool.connect();
    let count = 0;
    let batch = [];
    const BATCH_SIZE = 200; // Оптимальний розмір для швидкості

    try {
        await client.query("BEGIN");

        const stream = fs.createReadStream(req.file.path).pipe(csv());

        for await (const row of stream) {
            const lat = parseFloat(row.latitude);
            const lon = parseFloat(row.longitude);
            const subtotal = parseFloat(row.subtotal);

            if (isNaN(lat) || isNaN(lon) || isNaN(subtotal)) continue;

            // Додаємо дані в масив для масового вставки
            batch.push([lat, lon, subtotal]);
            count++;

            // Якщо назбирали пачку — записуємо в базу одним махом
            if (batch.length >= BATCH_SIZE) {
                await insertBatch(client, batch);
                batch = []; 
            }
        }

        // Дозаписуємо залишок
        if (batch.length > 0) await insertBatch(client, batch);

        await client.query("COMMIT");
        res.json({ message: `Успішно імпортовано ${count} записів` });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Помилка:", error);
        res.status(500).json({ error: "Помилка імпорту" });
    } finally {
        client.release();
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// Функція масової вставки з логікою PostGIS всередині SQL
async function insertBatch(client, data) {
    // Ми передаємо lat/lon, а SQL сам шукає юрисдикцію через ST_Contains
    // Це в рази швидше, ніж робити окремі запити з Node.js
  const sql = format(`
      INSERT INTO orders (latitude, longitude, subtotal, tax_amount, total_amount, jurisdiction)
      SELECT 
          v.lat, v.lon, v.subtotal,
          (v.subtotal * 0.08875) as tax_amount,
          (v.subtotal + (v.subtotal * 0.08875)) as total_amount,
          j.name
      FROM (VALUES %L) AS v(lat, lon, subtotal)
      LEFT JOIN tax_regions j ON ST_Contains(j.geom, ST_SetSRID(ST_Point(v.lon, v.lat), 4326))
      LIMIT 1
  `, data);
    await client.query(sql);
}

app.delete("/orders", async (req, res) => {
  try {
    await pool.query("DELETE FROM orders");
    await pool.query("ALTER SEQUENCE orders_id_seq RESTART WITH 1");
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});
