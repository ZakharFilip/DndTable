/**
 * Создаёт или обновляет служебного пользователя (support bot) в MongoDB.
 *
 * Запуск на VPS (из корня репозитория, нужен backend/.env с MONGODB_URI):
 *   cd /opt/dndtable && npm --workspace backend exec -- tsx scripts/seed-support-bot.ts
 *
 * Или из папки backend:
 *   cd /opt/dndtable/backend && npx tsx scripts/seed-support-bot.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const EMAIL = "aisuppurt@bot.bot.bot";
const USERNAME = "AiSupportBOT";
const PASSWORD = "UltraSekretusBotusParolus";

async function generateFriendCode(): Promise<string> {
  const users = mongoose.connection.collection("users");
  for (let i = 0; i < 30; i++) {
    const code = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0");
    const exists = await users.findOne({ friendCode: code }, { projection: { _id: 1 } });
    if (!exists) return code;
  }
  throw new Error("Не удалось сгенерировать уникальный friendCode");
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI не задан. Укажите в backend/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.collection("users");
  const now = new Date();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const byEmail = await users.findOne({ email: EMAIL });
  const byUsername = await users.findOne({ username: USERNAME });

  if (byEmail) {
    await users.updateOne(
      { _id: byEmail._id },
      {
        $set: {
          username: USERNAME,
          passwordHash,
          isBanned: false,
          updatedAt: now,
        },
      }
    );
    console.log(`Обновлён пользователь: ${EMAIL} (${USERNAME})`);
  } else if (byUsername && byUsername.email !== EMAIL) {
    console.error(
      `Никнейм ${USERNAME} уже занят другим email: ${byUsername.email}`
    );
    process.exit(1);
  } else {
    const friendCode = await generateFriendCode();
    await users.insertOne({
      email: EMAIL,
      username: USERNAME,
      passwordHash,
      avatar: "default-avatar.png",
      friendCode,
      isBanned: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Создан пользователь: ${EMAIL} (${USERNAME}), friendCode: ${friendCode}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
