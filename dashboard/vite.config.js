import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { MongoClient } from 'mongodb'

const MONGO_URI = "mongodb+srv://student:student@cluster0.tt1v1.mongodb.net/"
const DB_NAME = "aliyar-aug"

function mongoDbPlugin() {
  return {
    name: 'mongodb-api',
    configureServer(server) {
      server.middlewares.use('/api/dashboard', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        
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
             // Stream 0: only in_count
             responsePayload.stream_0 = {
                in_count: data0[latestDate0].stream_0.in_count
             };
          }

          if (data1 && latestDate1 && data1[latestDate1]?.stream_1) {
             // Stream 1: everything
             responsePayload.stream_1 = data1[latestDate1].stream_1;
             
             // Extract hourly data for charts
             if (data1[latestDate1].hourly_data) {
                responsePayload.stream_1_hourly = data1[latestDate1].hourly_data;
             }
          }

          if (data2) {
             const latestDate2 = extractDateKey(data2);
             if (latestDate2 && data2[latestDate2]?.stream_2) {
                 // Stream 2: only out_count
                 responsePayload.stream_2 = {
                     out_count: data2[latestDate2].stream_2.out_count
                 };
             }
          }

          res.end(JSON.stringify(responsePayload));
        } catch (err) {
          console.error("MongoDB API Error:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      })
    }
  }
}

// https://vite.dev/config/
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), mongoDbPlugin()],
})
