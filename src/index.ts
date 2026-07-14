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

app.post("/api/blog", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updatedData = {
      ...data,
      createdAt: new Date(),
    };
    const result = await db.collection("blogs").insertOne(updatedData);
    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create blog" });
  }
});

app.get("/api/all/blogs", async (req: Request, res: Response) => {
  try {
    const { search, category, page = "1", limit = "8" } = req.query;

    const query: Record<string, unknown> = {};

    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category && typeof category === "string" && category !== "All") {
      query.category = category;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 8;
    const skip = (pageNum - 1) * limitNum;

    const total = await db.collection("blogs").countDocuments(query);

    const blogs = await db
      .collection("blogs")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const hasMore = skip + blogs.length < total;

    res.status(200).send({ blogs, total, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get blogs" });
  }
});
app.get("/api/blogs/uid/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const query = {
      userId: id,
    };
    const result = await db.collection("blogs").find(query).toArray();
    res.status(200).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user blogs " });
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
