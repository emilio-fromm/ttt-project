// See the matching file in entries-service/src/asyncHandler.js for the full explanation:
// Express 4 doesn't forward a rejected promise from an async route handler to the error
// middleware on its own, which otherwise turns a real backend failure into a silent
// hang -> platform-level 502 with no CORS headers -> a misleading "CORS" error in the
// browser. This wrapper makes sure every route always sends a real, debuggable response.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
