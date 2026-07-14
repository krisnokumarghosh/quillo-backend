import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, Db } from "mongodb";

dotenv.config();

// ---------- MongoDB Setup ----------
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const client = new MongoClient(uri);
let db: Db;

async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db("quillo");
    console.log("✅ Successfully connected to MongoDB!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

async function disconnectFromMongoDB() {
  await client.close();
  console.log("MongoDB connection closed");
}

// ---------- Express App Setup ----------
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Quillo backend is running!");
});

// Example route using the database
app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const users = await db.collection("users").find().toArray();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ---------- Start Server ----------
const startServer = async () => {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

// ---------- Graceful Shutdown ----------
process.on("SIGINT", async () => {
  await disconnectFromMongoDB();
  process.exit(0);
});