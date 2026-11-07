import dns from "node:dns";
import mongoose from "mongoose";

// Node on some Windows networks can't resolve Atlas SRV records via the router's DNS
// (querySrv ECONNREFUSED). Set e.g. MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 to override.
if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((s) => s.trim()));
}

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Cache the connection on globalThis so dev hot-reload doesn't open new connections
const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cached: Cache = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 10 });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
