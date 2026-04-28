const { query } = require('../db/pool');

/**
 * Save or update a movie entry.
 * Uses ON CONFLICT to handle duplicate codes gracefully.
 */
async function upsertMovie(code, fileId, title) {
  const result = await query(
    `INSERT INTO movies (code, file_id, title)
     VALUES ($1, $2, $3)
     ON CONFLICT (code)
     DO UPDATE SET file_id = EXCLUDED.file_id, title = COALESCE(EXCLUDED.title, movies.title)
     RETURNING *`,
    [code, fileId, title || null]
  );
  return result.rows[0];
}

/**
 * Find movie by its numeric code.
 */
async function getMovieByCode(code) {
  const result = await query(
    'SELECT * FROM movies WHERE code = $1',
    [code]
  );
  return result.rows[0] || null;
}

/**
 * Delete a movie by code.
 */
async function deleteMovieByCode(code) {
  const result = await query(
    'DELETE FROM movies WHERE code = $1 RETURNING *',
    [code]
  );
  return result.rows[0] || null;
}

/**
 * Get total movie count.
 */
async function getMovieCount() {
  const result = await query('SELECT COUNT(*) AS count FROM movies');
  return parseInt(result.rows[0].count, 10);
}

module.exports = {
  upsertMovie,
  getMovieByCode,
  deleteMovieByCode,
  getMovieCount,
};
