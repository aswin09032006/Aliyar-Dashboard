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
    
    const logFilePath = path.join(process.cwd(), 'manual_addition_log.json');
    if (!fs.existsSync(logFilePath)) {
      console.log('No undo log found.');
      return;
    }
    
    const additionLog = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
    
    // Fetch the document
    const doc = await stream0.findOne({ _id: 'dashboard_data' });
    const dayData = doc[additionLog.date];
    
    if (!dayData) {
      console.log('Date data not found in DB.');
      return;
    }
    
    // Undo total
    dayData.stream_0.in_count -= additionLog.total_added;
    
    // Undo hourly
    Object.keys(additionLog.hourly_additions).forEach(hour => {
       const addedToThisHour = additionLog.hourly_additions[hour];
       if (dayData.hourly_data[hour] && dayData.hourly_data[hour].stream_0) {
           dayData.hourly_data[hour].stream_0.in_count -= addedToThisHour;
       }
    });
    
    // Write back to DB
    await stream0.updateOne(
       { _id: 'dashboard_data' },
       { $set: { [additionLog.date]: dayData } }
    );
    
    console.log(`Successfully reversed the changes. Removed ${additionLog.total_added} IN from ${additionLog.date}.`);
    
    // Delete log after successful undo
    fs.unlinkSync(logFilePath);
  } finally {
    await client.close();
  }
}
run();
