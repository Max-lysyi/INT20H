const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");
const multer = require('multer');
const csv = require('csv-parser');
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
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Помилка підключення до бази:', err.stack);
  }
  console.log('Успішно підключено до Supabase!');
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
  if (!req.file) {
    return res.status(400).json({ error: "Файл не знайдено" });
  }

  const results = [];
  const client = await pool.connect();

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await client.query("BEGIN");

        for (const row of results) {
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);
          const subtotal = parseFloat(row.subtotal);

          if (isNaN(lat) || isNaN(lon) || isNaN(subtotal)) continue;

          const taxInfo = await getJurisdictionFromPostGIS(lat, lon);

          const taxAmount = (subtotal * taxInfo.rate).toFixed(2);
          const totalAmount = (subtotal + parseFloat(taxAmount)).toFixed(2);

          await client.query(
            `INSERT INTO orders (latitude, longitude, subtotal, tax_amount, total_amount, jurisdiction) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [lat, lon, subtotal, taxAmount, totalAmount, taxInfo.name]
          );
        }

        await client.query("COMMIT");
        res.json({ message: `Успішно імпортовано ${results.length} записів` });

      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Помилка імпорту:", error);
        res.status(500).json({ error: "Помилка при збереженні в базу" });
      } finally {
        client.release();
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    });
});

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
