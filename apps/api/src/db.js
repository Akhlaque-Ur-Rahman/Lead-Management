const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
