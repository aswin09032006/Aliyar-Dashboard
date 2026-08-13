import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const url = 'mongodb+srv://student:student@cluster0.tt1v1.mongodb.net/';
const client = new MongoClient(url);

async function run() {
  try {
    await client.connect();
    const db = client.db('aliyar-aug');
    const stream0 = db.collection('stream_0');
    
    // Fetch the document
    const doc = await stream0.findOne({ _id: 'dashboard_data' });
    const dayData = doc['2026-08-13'];
    
    // Current totals
    const currentIn = dayData.stream_0.in_count;
    
    // Target total
    const targetIn = 1650;
    const addIn = targetIn - currentIn;
    
    if (addIn <= 0) {
      console.log('Target already reached or exceeded.');
      return;
    }
    
    const hourlyKeys = Object.keys(dayData.hourly_data);
    const numHours = hourlyKeys.length;
    
    const baseAddIn = Math.floor(addIn / numHours);
    const remAddIn = addIn % numHours;
    
    // Update daily total
    dayData.stream_0.in_count = targetIn;
    
    // Keep a log for potential undo
    const additionLog = {
      date: '2026-08-13',
      total_added: addIn,
      hourly_additions: {}
    };
    
    // Update hourly
    hourlyKeys.forEach((hour, idx) => {
       const inExtra = idx < remAddIn ? 1 : 0;
       const addedToThisHour = baseAddIn + inExtra;
       
       if (!dayData.hourly_data[hour].stream_0) {
           dayData.hourly_data[hour].stream_0 = { in_count: 0, out_count: 0 };
       }
       dayData.hourly_data[hour].stream_0.in_count += addedToThisHour;
       additionLog.hourly_additions[hour] = addedToThisHour;
    });
    
    // Write back to DB
    await stream0.updateOne(
       { _id: 'dashboard_data' },
       { $set: { '2026-08-13': dayData } }
    );
    
    // Save log locally
    const logFilePath = path.join(process.cwd(), 'manual_addition_log.json');
    fs.writeFileSync(logFilePath, JSON.stringify(additionLog, null, 2));
    
    console.log(`Updated 2026-08-13 IN count to 1650 (Added ${addIn}).`);
    console.log(`Saved backup log to ${logFilePath} in case you want to undo this in the future.`);
  } finally {
    await client.close();
  }
}
run();
