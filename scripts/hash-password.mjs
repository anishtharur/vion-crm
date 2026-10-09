#!/usr/bin/env node
/**
 * Generate a password hash for the AUTH_USERS env var.
 *
 *   npm run auth:hash -- "the password"
 *   npm run auth:hash            (prompts, input hidden from shell history)
 *
 * Output is `salt.hash` (base64url, scrypt) — paste it as the last field of an
 * AUTH_USERS entry: email:Display Name:salt.hash
 */
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline/promises";

async function readPassword() {
  const arg = process.argv[2];
  if (arg) return arg;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Password: ");
  rl.close();
  return answer;
}

const password = await readPassword();
if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const key = await new Promise((resolve, reject) => {
  scrypt(password, salt, 32, (err, derived) =>
    err ? reject(err) : resolve(derived),
  );
});

const hash = `${salt.toString("base64url")}.${key.toString("base64url")}`;
console.log("\nPassword hash:\n");
console.log(`  ${hash}`);
console.log("\nUse it in AUTH_USERS, e.g.:\n");
console.log(`  AUTH_USERS=you@example.com:Your Name:${hash}`);
