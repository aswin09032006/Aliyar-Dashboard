import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { MongoClient } from 'mongodb'

const MONGO_URI = "mongodb+srv://student:student@cluster0.tt1v1.mongodb.net/"
const DB_NAME = "aliyar-aug"

function mongoDbPlugin() {
  return {
    name: 'mongodb-api',
    configureServer(server) {
      server.middlewares.use('/api/add-people', async (req, res) => {
        if (req.method !== 'POST') return res.end();
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
           try {
              const { date, addedIn, addedOut } = JSON.parse(body);
              const client = new MongoClient(MONGO_URI);
              await client.connect();
              const db = client.db(DB_NAME);
              if (addedIn > 0) {
                 await db.collection('stream_0').updateOne(
                    { _id: "manual_additions" },
                    { $inc: { [`${date}.in_count`]: addedIn } },
                    { upsert: true }
                 );
              }
              if (addedOut > 0) {
                 await db.collection('stream_2').updateOne(
                    { _id: "manual_additions" },
                    { $inc: { [`${date}.out_count`]: addedOut } },
                    { upsert: true }
                 );
              }
              await client.close();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
           } catch(e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
           }
        });
      });

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
          
          // Fetch the single document dashboard_data and manual_additions
          const data0 = await stream0.findOne({ _id: "dashboard_data" });
          const additions0 = await stream0.findOne({ _id: "manual_additions" });
          
          const data1 = await stream1.findOne({ _id: "dashboard_data" });
          
          let data2 = null;
          let additions2 = null;
          if (stream2) {
             try {
                data2 = await stream2.findOne({ _id: "dashboard_data" });
                additions2 = await stream2.findOne({ _id: "manual_additions" });
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
             let in_count = data0[latestDate0].stream_0.in_count;
             if (additions0 && additions0[latestDate0]?.in_count) {
                 in_count += additions0[latestDate0].in_count;
             }
             responsePayload.stream_0 = { in_count };
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
                 let out_count = data2[latestDate2].stream_2.out_count;
                 if (additions2 && additions2[latestDate2]?.out_count) {
                     out_count += additions2[latestDate2].out_count;
                 }
                 responsePayload.stream_2 = { out_count };
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
