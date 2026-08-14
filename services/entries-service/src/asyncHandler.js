// Express 4 does not catch a promise rejected by an async route handler on its own -- an
// unguarded `await pool.query(...)` (or any other await) that throws just leaves the
// request hanging with no response at all, until the platform's own proxy eventually gives
// up and returns a bare error with none of our own headers (including CORS), which then
// shows up in the browser as a misleading "CORS header missing" error instead of the real
// cause. Wrapping every route handler in this forwards any rejection to Express's error
// middleware (already registered in index.js), so every route always sends *some* real,
// debuggable JSON response.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
