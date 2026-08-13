import express from 'express';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = "mongodb+srv://student:student@cluster0.tt1v1.mongodb.net/";
const DB_NAME = "aliyar-aug";

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint for dashboard data
app.get('/api/dashboard', async (req, res) => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Get collections
    const stream0 = db.collection('stream_0');
    const stream1 = db.collection('stream_1');
    
    // Attempt to get stream2, handle if it doesn't exist
    let stream2;
    try {
       stream2 = db.collection('stream_2');
    } catch(e) {}
    
    // Fetch the single document dashboard_data
    const data0 = await stream0.findOne({ _id: "dashboard_data" });
    const data1 = await stream1.findOne({ _id: "dashboard_data" });
    
    let data2 = null;
    if (stream2) {
       try {
          data2 = await stream2.findOne({ _id: "dashboard_data" });
       } catch(e) {}
    }
    
    await client.close();

    // We need to parse out the latest date from the objects.
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    const extractDateKey = (doc) => {
      if (!doc) return null;
      const dates = Object.keys(doc).filter(k => dateRegex.test(k)).sort().reverse();
      return dates.length > 0 ? dates[0] : null;
    }

    const latestDate0 = extractDateKey(data0);
    const latestDate1 = extractDateKey(data1);
    const latestDate = latestDate0 || latestDate1 || new Date().toISOString().split('T')[0];

    // Format output according to requirements
    const responsePayload = {
      date: latestDate,
      stream_0: null,
      stream_1: null,
      stream_2: null
    };

    if (data0 && latestDate0 && data0[latestDate0]?.stream_0) {
       responsePayload.stream_0 = {
          in_count: data0[latestDate0].stream_0.in_count
       };
    }

    if (data1 && latestDate1 && data1[latestDate1]?.stream_1) {
       responsePayload.stream_1 = data1[latestDate1].stream_1;
       if (data1[latestDate1].hourly_data) {
          responsePayload.stream_1_hourly = data1[latestDate1].hourly_data;
       }
    }

    if (data2) {
       const latestDate2 = extractDateKey(data2);
       if (latestDate2 && data2[latestDate2]?.stream_2) {
           responsePayload.stream_2 = {
               out_count: data2[latestDate2].stream_2.out_count
           };
       }
    }

    res.json(responsePayload);
  } catch (err) {
    console.error("MongoDB API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// For any other requests, serve the React app (Client-side routing support)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Production server is running!`);
  console.log(`👉 Open http://localhost:${PORT} in your browser\n`);
});
