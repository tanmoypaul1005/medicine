import dns from "node:dns";
import mongoose from "mongoose";

// Node on some Windows networks can't resolve Atlas SRV records via the router's DNS
// (querySrv ECONNREFUSED). Set e.g. MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 to override.
// Applied inside connectDB (not at module top): page renders under Turbopack didn't get the
// module-level call before the first connect, while route handlers did.
function applyDnsOverride() {
  const servers = process.env.MONGODB_DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!servers?.length) return;
  dns.setServers(servers);
  dns.promises.setServers(servers);
}

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Cache the connection on globalThis so dev hot-reload doesn't open new connections
const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cached: Cache = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (!cached.promise) {
    applyDnsOverride();
    cached.promise = mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 10 });
    cached.promise.then(
      (m) => (cached.conn = m),
      () => (cached.promise = null) // allow a retry on the next call
    );
  }
  // Never `await cached.promise` here: it may have been created by another render, and a "use cache"
  // fill awaiting a promise from outside its scope stalls on cold start (Next: next-request-in-use-cache).
  // Wait on the connection's events instead, via a promise created in the caller's own scope.
  await waitForOpen();
  return mongoose;
}

function waitForOpen(): Promise<void> {
  const conn = mongoose.connection;
  if (conn.readyState === 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => (clearTimeout(timer), conn.off("open", onOpen), conn.off("error", onError));
    const onOpen = () => (done(), resolve());
    const onError = (err: Error) => (done(), reject(err));
    // Safety net: a caller that subscribed just after a failed attempt would otherwise wait forever.
    const timer = setTimeout(() => (done(), reject(new Error("MongoDB connection timed out"))), 35_000);
    conn.once("open", onOpen);
    conn.once("error", onError);
  });
}
