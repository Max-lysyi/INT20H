const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require('path');

const app = express();
const port = 5000;
const distPath = path.join(__dirname, '../dist');

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());
app.use(express.static(distPath));

if (!globalThis.fetch) {
  console.warn(
    "⚠️ Увага: Ваша версія Node.js не підтримує fetch. Оновіть Node.js до v18+ або встановіть node-fetch.",
  );
}

const pool = new Pool({
  user: "postgres",
  host: "postgis",
  database: "delivery_db",
  password: "root",
  port: 5432,
});

function getFastJurisdiction(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (
    latitude >= 40.49 &&
    latitude <= 40.92 &
    longitude >= -74.26 &&
    longitude <= -73.69
  )
    return { name: "New York City", rate: 0.08875 };
  if (
    latitude >= 42.58 &&
    latitude <= 42.77 &&
    longitude >= -74.0 &&
    longitude <= -73.7
  )
    return { name: "Albany County", rate: 0.08 };
  if (
    latitude >= 42.99 &&
    latitude <= 43.08 &&
    longitude >= -76.2 &&
    longitude <= -76.07
  )
    return { name: "Syracuse (Onondaga)", rate: 0.08 };
  if (
    latitude >= 40.9 &&
    latitude <= 41.0 &&
    longitude >= -73.93 &&
    longitude <= -73.83
  )
    return { name: "Yonkers", rate: 0.08875 };

  return { name: "New York State (Other)", rate: 0.04 };
}

async function getRealJurisdictionFromAPI(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "BetterMe-Test-Task/1.0" },
    });

    if (!response.ok) throw new Error("API Error");

    const data = await response.json();
    const address = data.address || {};

    console.log(
      "📍 API знайшло адресу:",
      address.city || address.town || address.county,
    );

    if (
      [
        "New York",
        "Manhattan",
        "Brooklyn",
        "Queens",
        "Bronx",
        "Staten Island",
      ].includes(address.city || address.suburb)
    ) {
      return { name: "New York City (Verified API)", rate: 0.08875 };
    }
    if (address.county === "Albany County" || address.city === "Albany") {
      return { name: "Albany (Verified API)", rate: 0.08 };
    }
    if (address.city === "Syracuse" || address.county === "Onondaga County") {
      return { name: "Syracuse (Verified API)", rate: 0.08 };
    }
    if (address.city === "Yonkers") {
      return { name: "Yonkers (Verified API)", rate: 0.08875 };
    }

    const localName =
      address.city || address.town || address.village || "NY State Location";
    return { name: `${localName} (State Tax)`, rate: 0.04 };
  } catch (error) {
    console.error("API Failed, using fallback:", error.message);
    return getFastJurisdiction(lat, lon);
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
    const taxInfo = await getRealJurisdictionFromAPI(latitude, longitude);

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

app.post("/orders/import", async (req, res) => {
  const client = await pool.connect();
  try {
    const ordersData = req.body;
    await client.query("BEGIN");

    for (const row of ordersData) {
      if (!row.latitude || !row.longitude || !row.subtotal) continue;

      const taxInfo = getFastJurisdiction(row.latitude, row.longitude);
      const taxAmount = (row.subtotal * taxInfo.rate).toFixed(2);
      const totalAmount = (
        parseFloat(row.subtotal) + parseFloat(taxAmount)
      ).toFixed(2);

      await client.query(
        "INSERT INTO orders (latitude, longitude, subtotal, tax_amount, total_amount, jurisdiction) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          row.latitude,
          row.longitude,
          row.subtotal,
          taxAmount,
          totalAmount,
          taxInfo.name,
        ],
      );
    }
    await client.query("COMMIT");
    res.json({ message: "Import successful" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).send("Import Failed");
  } finally {
    client.release();
  }
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
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
