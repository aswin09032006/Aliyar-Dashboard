import json
import os
from pymongo import MongoClient
from bson import json_util

# --- Configuration ---
MONGO_URI = "mongodb+srv://student:student@cluster0.tt1v1.mongodb.net/"
DB_NAME = "aliyar-aug"
OUTPUT_DIR = "scraped_data"

def dump_db_to_local():
    # Connect to MongoDB
    print(f"Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # Create output directory if it doesn't exist
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)
            
        print(f"Connected! Starting to scrape database: {DB_NAME}")
        
        # Get all collection names
        collections = db.list_collection_names()
        
        if not collections:
            print("No collections found in the database.")
            return
            
        for coll_name in collections:
            print(f"Scraping collection: '{coll_name}'...")
            collection = db[coll_name]
            
            # Fetch all documents in the collection
            documents = list(collection.find({}))
            
            # Define output file path
            output_file = os.path.join(OUTPUT_DIR, f"{coll_name}_data.json")
            
            # Write to local JSON file
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    # json_util.default gracefully handles MongoDB specific types like ObjectId and Datetime
                    json.dump(documents, f, default=json_util.default, indent=4)
                print(f"Successfully saved {len(documents)} document(s) to {output_file}")
            except Exception as e:
                print(f"Error saving collection '{coll_name}': {e}")
                
        print(f"Finished scraping database. All files saved to the '{OUTPUT_DIR}' directory.")
        
    except Exception as e:
         print(f"Connection or scraping failed: {e}")

if __name__ == "__main__":
    dump_db_to_local()
