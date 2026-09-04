import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, "recipes"));
  const docs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
  console.log(JSON.stringify(docs, null, 2));
  
  for (const r of docs) {
    if (!r.imageUrl) {
        let newImageUrl = "";
        if (r.title.toLowerCase().includes("shrimp")) newImageUrl = "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&q=80&w=800";
        else if (r.title.toLowerCase().includes("pasta") || r.title.toLowerCase().includes("vodka")) newImageUrl = "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=800";
        else newImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800"; // Generic food
        
        console.log("Updating", r.id, "with image", newImageUrl);
        await updateDoc(doc(db, "recipes", r.id), { imageUrl: newImageUrl });
    }
  }
  process.exit(0);
}
run();
