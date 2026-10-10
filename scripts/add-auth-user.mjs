#!/usr/bin/env node
import { randomBytes, scrypt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [emailArg, ...nameParts] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const name = nameParts.join(" ").trim();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
  console.error('Usage: npm run auth:add -- user@example.com "Display Name"');
  process.exit(1);
}

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  console.error(
    "Run this command in an interactive terminal to enter passwords safely.",
  );
  process.exit(1);
}

function readSecret(prompt) {
  return new Promise((resolveSecret) => {
    const input = process.stdin;
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();

    let value = "";
    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003") {
          input.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\r" || char === "\n") {
          input.off("data", onData);
          input.setRawMode(false);
          process.stdout.write("\n");
          resolveSecret(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          value += char;
        }
      }
    };

    input.on("data", onData);
  });
}

const password = await readSecret("Password (minimum 8 characters): ");
if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  process.exit(1);
}
const confirmation = await readSecret("Confirm password: ");
if (password !== confirmation) {
  console.error("Passwords did not match.");
  process.exit(1);
}

const salt = randomBytes(16);
const key = await new Promise((resolveKey, reject) => {
  scrypt(password, salt, 32, (error, derivedKey) =>
    error ? reject(error) : resolveKey(derivedKey),
  );
});
const passwordHash = `${salt.toString("base64url")}.${key.toString("base64url")}`;

const envPath = resolve(process.cwd(), ".env");
const contents = readFileSync(envPath, "utf8");
const lines = contents.split(/\r?\n/);
const authLineIndexes = lines.reduce((indexes, line, index) => {
  if (/^\s*AUTH_USERS\s*=/.test(line)) indexes.push(index);
  return indexes;
}, []);

if (authLineIndexes.length > 1) {
  console.error(
    "Found multiple AUTH_USERS entries in .env; resolve them manually first.",
  );
  process.exit(1);
}

const authLineIndex = authLineIndexes[0];
let currentValue =
  authLineIndex === undefined
    ? ""
    : lines[authLineIndex].replace(/^\s*AUTH_USERS\s*=\s*/, "").trim();
if (
  (currentValue.startsWith('"') && currentValue.endsWith('"')) ||
  (currentValue.startsWith("'") && currentValue.endsWith("'"))
) {
  currentValue = currentValue.slice(1, -1);
}
const currentEntries = currentValue ? currentValue.split(",") : [];

if (
  currentEntries.some(
    (entry) => entry.trim().split(":")[0].toLowerCase() === email,
  )
) {
  console.error(`A user with ${email} is already configured.`);
  process.exit(1);
}

const entry = `${email}:${name}:${passwordHash}`;
const nextValue = [...currentEntries, entry].join(",");
if (authLineIndex === undefined) {
  lines.push(`AUTH_USERS=${nextValue}`);
} else {
  lines[authLineIndex] = `AUTH_USERS=${nextValue}`;
}

const newline = contents.includes("\r\n") ? "\r\n" : "\n";
writeFileSync(envPath, lines.join(newline), "utf8");
console.log(
  `Added ${email} to AUTH_USERS in .env. Restart the app to enable login.`,
);
