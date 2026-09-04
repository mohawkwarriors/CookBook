import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    const snapshot = await getDocs(collection(db, "recipes"));
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      console.log("Attempting to delete:", firstDoc.id);
      await deleteDoc(doc(db, "recipes", firstDoc.id));
      console.log("Deleted successfully");
    } else {
      console.log("No recipes to delete");
    }
  } catch (e) {
    console.error("Delete failed:", e);
  }
  process.exit(0);
}
run();
