/**
 * Promotes kaban@mail.ru to the first site admin (kaban@admin.admin.admin).
 * Run once on the server after deploy — does not modify .env files.
 *
 *   cd backend && npm run admin:promote-first
 */
import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../src/modules/users/user.model.js";
import { ADMIN_EMAIL_SUFFIX } from "../src/shared/adminEmail.js";

const SOURCE_EMAIL = "kaban@mail.ru";
const TARGET_EMAIL = `kaban${ADMIN_EMAIL_SUFFIX}`;

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/dndtable";
  await mongoose.connect(uri);

  const existingAdmin = await UserModel.findOne({ email: TARGET_EMAIL });
  if (existingAdmin) {
    console.log(`Admin already exists: ${TARGET_EMAIL} (id=${existingAdmin._id})`);
    await mongoose.disconnect();
    return;
  }

  const user = await UserModel.findOne({ email: SOURCE_EMAIL });
  if (!user) {
    console.error(`User not found: ${SOURCE_EMAIL}`);
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  user.email = TARGET_EMAIL;
  await user.save();
  console.log(`Promoted ${SOURCE_EMAIL} → ${TARGET_EMAIL} (id=${user._id})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
