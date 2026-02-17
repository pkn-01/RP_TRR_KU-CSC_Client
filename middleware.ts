// PERF: Middleware removed — it was a no-op (NextResponse.next()) running on every route,
// adding ~2-5ms latency per request for zero benefit.
// If auth middleware is needed in the future, implement it here with proper token checking.
