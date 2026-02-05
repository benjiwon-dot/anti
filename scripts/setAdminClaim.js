const admin = require("firebase-admin");

// 🔴 여기 실제 서비스계정 JSON 경로로 바꾸기
const serviceAccount = require("/Users/najiwon/keys/firebase-admin.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const ADMIN_EMAIL = "ben.jiwon@kangkook.com";

async function run() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);

  await admin.auth().setCustomUserClaims(user.uid, {
    isAdmin: true,
  });

  console.log(`✅ isAdmin claim set for ${ADMIN_EMAIL}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Failed to set admin claim:", err);
  process.exit(1);
});
