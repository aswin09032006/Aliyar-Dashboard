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
app.use(express.json());



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

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    // --- Car-to-People Server-Side Tracking ---
    // For every new car IN/OUT, generate 2-4 random people.
    // Tracked persistently in MongoDB so refreshes don't re-add.
    let carTracker = await stream0.findOne({ _id: 'car_people_tracker' }) || {};

    if (data1) {
      const trackerSetUpdates = {};
      const data1DateKeys = Object.keys(data1).filter(k => dateRegex.test(k));

      for (const dateKey of data1DateKeys) {
        const carData = data1[dateKey]?.stream_1?.car;
        if (!carData) continue;

        const currentCarIn = carData.in_count || 0;
        const currentCarOut = carData.out_count || 0;

        const tracked = carTracker[dateKey] || { last_car_in: 0, last_car_out: 0, people_in: 0, people_out: 0 };

        let peopleInDelta = 0;
        let peopleOutDelta = 0;

        // New cars IN → generate random people IN (2-4 per car)
        if (currentCarIn > tracked.last_car_in) {
          const diff = currentCarIn - tracked.last_car_in;
          for (let i = 0; i < diff; i++) {
            peopleInDelta += Math.floor(Math.random() * 3) + 2;
          }
        }

        // New cars OUT → generate random people OUT (2-4 per car)
        if (currentCarOut > tracked.last_car_out) {
          const diff = currentCarOut - tracked.last_car_out;
          for (let i = 0; i < diff; i++) {
            peopleOutDelta += Math.floor(Math.random() * 3) + 2;
          }
        }

        // Update tracker if car counts changed OR if this date key is new
        if (peopleInDelta > 0 || peopleOutDelta > 0 || !carTracker[dateKey]) {
          const newPeopleIn = (tracked.people_in || 0) + peopleInDelta;
          const newPeopleOut = (tracked.people_out || 0) + peopleOutDelta;

          trackerSetUpdates[`${dateKey}.last_car_in`] = currentCarIn;
          trackerSetUpdates[`${dateKey}.last_car_out`] = currentCarOut;
          trackerSetUpdates[`${dateKey}.people_in`] = newPeopleIn;
          trackerSetUpdates[`${dateKey}.people_out`] = newPeopleOut;

          // Update local copy for use in response building below
          carTracker[dateKey] = {
            last_car_in: currentCarIn,
            last_car_out: currentCarOut,
            people_in: newPeopleIn,
            people_out: newPeopleOut
          };
        }
      }

      // Persist tracker to MongoDB (atomic $set, upsert if first time)
      if (Object.keys(trackerSetUpdates).length > 0) {
        await stream0.updateOne(
          { _id: 'car_people_tracker' },
          { $set: trackerSetUpdates },
          { upsert: true }
        );
      }
    }

    await client.close();

    // Helper to find all unique YYYY-MM-DD keys across docs
    const getDatesFromDoc = (doc) => doc ? Object.keys(doc).filter(k => dateRegex.test(k)) : [];
    const dateSet = new Set([
      ...getDatesFromDoc(data0),
      ...getDatesFromDoc(data1),
      ...getDatesFromDoc(data2)
    ]);
    
    // Always ensure current local system date (e.g. 2026-08-14) is present in availableDates
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateSet.add(todayStr);

    const availableDates = ['all', ...Array.from(dateSet).sort().reverse()];

    // Determine requested date (default to 'all' for cumulative)
    const reqDate = req.query.date;
    const selectedDate = reqDate || 'all';

    // Response structure
    const responsePayload = {
      date: selectedDate,
      availableDates,
      stream_0: { in_count: 0 },
      stream_1: {
        car: { in_count: 0, out_count: 0 },
        motorcycle: { in_count: 0, out_count: 0 },
        bus: { in_count: 0, out_count: 0 },
        truck: { in_count: 0, out_count: 0 }
      },
      stream_2: { out_count: 0 },
      stream_0_hourly: {},
      stream_1_hourly: {},
      peak_people: null
    };

    // --- Stream 0 (People In) ---
    if (selectedDate === 'all') {
      if (data0) {
        Object.keys(data0).filter(k => dateRegex.test(k)).forEach(date => {
          const in_count = data0[date].stream_0?.in_count || 0;
          responsePayload.stream_0.in_count += in_count;
          if (data0[date].hourly_data) {
            Object.keys(data0[date].hourly_data).forEach(hour => {
              const key = `${date} ${hour}`;
              if (!responsePayload.stream_0_hourly[key]) {
                responsePayload.stream_0_hourly[key] = { stream_0: { in_count: 0, out_count: 0 }};
              }
              responsePayload.stream_0_hourly[key].stream_0.in_count += data0[date].hourly_data[hour].stream_0?.in_count || 0;
              responsePayload.stream_0_hourly[key].stream_0.out_count += data0[date].hourly_data[hour].stream_0?.out_count || 0;
            });
          }
        });
      }
    } else if (data0 && data0[selectedDate]) {
      const dayData0 = data0[selectedDate];
      responsePayload.stream_0.in_count = dayData0.stream_0?.in_count || 0;
      if (dayData0.hourly_data) {
        responsePayload.stream_0_hourly = dayData0.hourly_data;
      }
    }

    // --- Stream 2 (People Out) ---
    if (selectedDate === 'all') {
      if (data2) {
        Object.keys(data2).filter(k => dateRegex.test(k)).forEach(date => {
          const out_count = data2[date].stream_2?.out_count || 0;
          responsePayload.stream_2.out_count += out_count;
        });
      } else if (data0) {
        Object.keys(data0).filter(k => dateRegex.test(k)).forEach(date => {
          const out_count = data0[date].stream_0?.out_count || 0;
          responsePayload.stream_2.out_count += out_count;
        });
      }
    } else if (data2) {
      const dayData2 = data2[selectedDate];
      if (dayData2) {
        responsePayload.stream_2.out_count = dayData2.stream_2?.out_count || 0;
      }
    } else if (data0 && data0[selectedDate]?.stream_0?.out_count !== undefined) {
      responsePayload.stream_2.out_count = data0[selectedDate].stream_0.out_count;
    }

    // --- Add car-based people from tracker ---
    if (selectedDate === 'all') {
      // Sum all date keys' tracked people
      Object.keys(carTracker).filter(k => dateRegex.test(k)).forEach(dateKey => {
        responsePayload.stream_0.in_count += carTracker[dateKey].people_in || 0;
        responsePayload.stream_2.out_count += carTracker[dateKey].people_out || 0;
      });
    } else {
      // Add this date's tracked people
      if (carTracker[selectedDate]) {
        responsePayload.stream_0.in_count += carTracker[selectedDate].people_in || 0;
        responsePayload.stream_2.out_count += carTracker[selectedDate].people_out || 0;
      }
      // Handle DB quirk: evening hours (15-23) of Aug 13 stored under Aug 14 key
      // Their car additions are tracked under '2026-08-14', so include them for Aug 13
      if (selectedDate === '2026-08-13' && carTracker['2026-08-14']) {
        responsePayload.stream_0.in_count += carTracker['2026-08-14'].people_in || 0;
        responsePayload.stream_2.out_count += carTracker['2026-08-14'].people_out || 0;
      }
    }

    // --- Stream 1 (Vehicle Analytics & Hourly Partitioning) ---
    // Look across data1 documents/date keys to isolate hourly entries for selectedDate
    // Note: In DB, hours 15:00-23:00 were saved under 2026-08-14 along with 00:00-04:00.
    // Hours 00:00 - 04:00 belong to Aug 14th; hours 15:00 - 23:00 belong to Aug 13th.
    let rawHourlyStream1 = {};
    if (selectedDate === 'all') {
      if (data1) {
        Object.keys(data1).filter(k => dateRegex.test(k)).forEach(date => {
          if (data1[date].hourly_data) {
            Object.keys(data1[date].hourly_data).forEach(hour => {
              const hourNum = parseInt(hour.split(':')[0], 10);
              let trueDate = date;
              if (date === '2026-08-14' && hourNum >= 15) {
                trueDate = '2026-08-13';
              }
              const key = `${trueDate} ${hour}`;
              if (!rawHourlyStream1[key]) {
                rawHourlyStream1[key] = { stream_1: { car: { in_count: 0, out_count: 0 }, motorcycle: { in_count: 0, out_count: 0 }, bus: { in_count: 0, out_count: 0 }, truck: { in_count: 0, out_count: 0 } } };
              }
              const s1 = data1[date].hourly_data[hour].stream_1;
              if (s1) {
                ['car', 'motorcycle', 'bus', 'truck'].forEach(type => {
                  if (s1[type]) {
                    rawHourlyStream1[key].stream_1[type].in_count += (s1[type].in_count || 0);
                    rawHourlyStream1[key].stream_1[type].out_count += (s1[type].out_count || 0);
                  }
                });
              }
            });
          }
        });
      }
    } else if (data1) {
      if (data1[selectedDate]?.hourly_data) {
        rawHourlyStream1 = { ...rawHourlyStream1, ...data1[selectedDate].hourly_data };
      }
      // If selectedDate is 2026-08-13, check if 2026-08-14 hourly_data has 15:00-23:00
      if (selectedDate === '2026-08-13' && data1['2026-08-14']?.hourly_data) {
        const aug14Hourly = data1['2026-08-14'].hourly_data;
        Object.keys(aug14Hourly).forEach(hour => {
          const hourNum = parseInt(hour.split(':')[0], 10);
          if (hourNum >= 15) {
            rawHourlyStream1[hour] = aug14Hourly[hour];
          }
        });
      }
    }

    // Filter hourly_data according to selectedDate target timeframe
    const filteredStream1Hourly = {};
    const vehicleTotals = {
      car: { in_count: 0, out_count: 0 },
      motorcycle: { in_count: 0, out_count: 0 },
      bus: { in_count: 0, out_count: 0 },
      truck: { in_count: 0, out_count: 0 }
    };

    Object.keys(rawHourlyStream1).forEach(hour => {
      const hourNum = parseInt(hour.split(':')[0], 10);
      let isValidForDate = true;
      if (selectedDate !== 'all' && selectedDate === '2026-08-14' && hourNum >= 15) {
        // Evening hours belong to previous day batch in database
        isValidForDate = false;
      }

      if (isValidForDate) {
        filteredStream1Hourly[hour] = rawHourlyStream1[hour];
        const s1 = rawHourlyStream1[hour]?.stream_1;
        if (s1) {
          ['car', 'motorcycle', 'bus', 'truck'].forEach(type => {
            if (s1[type]) {
              vehicleTotals[type].in_count += (s1[type].in_count || 0);
              vehicleTotals[type].out_count += (s1[type].out_count || 0);
            }
          });
        }
      }
    });

    responsePayload.stream_1 = vehicleTotals;
    responsePayload.stream_1_hourly = filteredStream1Hourly;

    // --- Peak People Calculation ---
    let peakHour = null;
    let maxPeopleIn = -1;
    const combinedPeopleHourly = responsePayload.stream_0_hourly;
    Object.keys(combinedPeopleHourly).forEach(hour => {
      const inCount = combinedPeopleHourly[hour]?.stream_0?.in_count || 0;
      if (inCount > maxPeopleIn) {
        maxPeopleIn = inCount;
        peakHour = hour;
      }
    });

    if (peakHour && maxPeopleIn >= 0) {
      responsePayload.peak_people = {
        time: peakHour,
        in_count: maxPeopleIn
      };
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
