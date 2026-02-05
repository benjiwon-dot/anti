const admin = require("firebase-admin");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "memotile-app-anti-demo";
const ADMIN_EMAIL = "ben.jiwon@kangkook.com";

if (!admin.apps.length) {
  // ✅ No serviceAccount JSON. Use Application Default Credentials from gcloud.
  admin.initializeApp({ projectId: PROJECT_ID });
}

async function run() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);

  await admin.auth().setCustomUserClaims(user.uid, { isAdmin: true });

  console.log(`✅ isAdmin claim set for ${ADMIN_EMAIL} (uid=${user.uid})`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Failed to set admin claim:", err?.message || err);
  process.exit(1);
});
