const { MongoClient } = require('mongodb');
const fs = require('fs');

async function test() {
  const uri = process.env.DATABASE_URL || "mongodb+srv://dev_db_user:j0njfaLP8QcoKB5Q@cluster0.75izjit.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    
    let report = "Databases:\n";
    for (const d of dbs.databases) {
       report += `\n[DB] ${d.name}\n`;
       try {
           const db = client.db(d.name);
           const cols = await db.collections();
           for (const c of cols) {
               const count = await c.countDocuments();
               report += `  - ${c.collectionName}: ${count} docs\n`;
               
               if (c.collectionName.toLowerCase().includes('dataset')) {
                   const sample = await c.find({}).limit(1).toArray();
                   report += `    >>> SAMPLE: ${JSON.stringify(sample)}\n`;
               }
           }
       } catch (e) {
           report += `  Error reading collections: ${e.message}\n`;
       }
    }
    
    fs.writeFileSync('db-report.txt', report);
    console.log("Report generated");
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
test();
