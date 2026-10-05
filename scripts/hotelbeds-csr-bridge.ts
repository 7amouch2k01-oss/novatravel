import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const HOST = "127.0.0.1";
const PORT = 48765;
const keyPath = resolve(".secrets/hotelbeds/client.key");
const csrPath = resolve(".secrets/hotelbeds/client.csr");
const openssl = process.env["HOTELBEDS_OPENSSL_PATH"] ?? "C:/Program Files/Git/usr/bin/openssl.exe";

function escapeConfig(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new Error("Values cannot contain line breaks.");
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function send(
  res: import("node:http").ServerResponse,
  status: number,
  body: string,
  contentType = "text/html; charset=utf-8",
) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Local Hotelbeds CSR setup</title><style>body{font:16px system-ui;max-width:640px;margin:48px auto;padding:0 20px;color:#172033}label{display:block;margin:18px 0 6px}input{box-sizing:border-box;width:100%;padding:10px;border:1px solid #9ba4b5;border-radius:6px}button{margin-top:22px;padding:11px 18px;border:0;border-radius:6px;background:#2549d8;color:white;font-weight:600}small{color:#556}</style></head><body><h1>Hotelbeds test certificate request</h1><p>This temporary page runs on this computer only. It uses the existing local private key and writes the CSR into the ignored .secrets folder. The challenge password is not stored in .env or shown in the result.</p><form method="post" action="/generate"><label for="org">Organization name</label><input id="org" name="organization" value="TUNITRAVEL" required maxlength="120"><label for="email">Hotelbeds developer portal email</label><input id="email" name="email" type="email" required maxlength="254"><label for="challenge">CSR challenge password from the Hotelbeds email</label><input id="challenge" name="challenge" type="password" autocomplete="off" required maxlength="128"><button type="submit">Generate test CSR</button></form></body></html>`;

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    send(res, 200, page);
    return;
  }
  if (req.method === "GET" && req.url === "/csr") {
    if (!existsSync(csrPath)) return send(res, 404, "CSR has not been created.");
    const csr = escapeHtml(readFileSync(csrPath, "utf8"));
    return send(
      res,
      200,
      `<!doctype html><html><meta charset="utf-8"><title>Local CSR transfer</title><body><label for="csr">Verified Hotelbeds test CSR</label><textarea id="csr" readonly rows="24" cols="80">${csr}</textarea><p>This page remains local to this computer.</p></body></html>`,
    );
  }
  if (req.method !== "POST" || req.url !== "/generate") {
    send(res, 404, "Not found.");
    return;
  }

  const chunks: Buffer[] = [];
  let length = 0;
  req.on("data", (chunk: Buffer) => {
    length += chunk.length;
    if (length > 8192) req.destroy();
    else chunks.push(chunk);
  });
  req.on("end", () => {
    try {
      if (!existsSync(keyPath)) throw new Error("The local Hotelbeds key is missing.");
      if (!existsSync(openssl)) throw new Error("OpenSSL was not found.");
      const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
      const organization = form.get("organization")?.trim() ?? "";
      const email = form.get("email")?.trim() ?? "";
      const challenge = form.get("challenge") ?? "";
      if (
        !organization ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !challenge ||
        challenge.length > 128
      ) {
        throw new Error("Enter a valid organization, portal email, and challenge password.");
      }
      const config = [
        "[ req ]",
        "default_bits = 2048",
        "default_md = sha256",
        "prompt = no",
        "distinguished_name = dn",
        "req_extensions = req_ext",
        "attributes = req_attributes",
        "[ dn ]",
        `O = ${escapeConfig(organization)}`,
        `emailAddress = ${escapeConfig(email)}`,
        `CN = ${escapeConfig(organization)}`,
        "[ req_ext ]",
        "extendedKeyUsage = clientAuth",
        "basicConstraints = critical,CA:FALSE",
        "[ req_attributes ]",
        `challengePassword = ${escapeConfig(challenge)}`,
        "",
      ].join("\n");
      const configPath = join(tmpdir(), `hotelbeds-csr-${process.pid}.conf`);
      const temporaryCsr = `${csrPath}.new`;
      try {
        writeFileSync(configPath, config, { flag: "wx", mode: 0o600 });
        execFileSync(
          openssl,
          ["req", "-new", "-key", keyPath, "-out", temporaryCsr, "-config", configPath],
          { stdio: "ignore", windowsHide: true },
        );
        execFileSync(openssl, ["req", "-in", temporaryCsr, "-noout", "-verify"], {
          stdio: "ignore",
          windowsHide: true,
        });
        writeFileSync(csrPath, readFileSync(temporaryCsr), { mode: 0o600 });
      } finally {
        for (const file of [configPath, temporaryCsr]) {
          try {
            unlinkSync(file);
          } catch {
            // Temporary-file cleanup is best effort and must not mask the CSR result.
          }
        }
      }
      send(
        res,
        200,
        "<!doctype html><html><meta charset=utf-8><title>CSR ready</title><body><h1>CSR created and verified</h1><p>The private key remained local. The CSR is ready for the Hotelbeds certificate form.</p><a href=/csr>Continue</a></body></html>",
      );
    } catch {
      send(
        res,
        400,
        "<!doctype html><html><meta charset=utf-8><title>CSR not created</title><body><h1>CSR not created</h1><p>Check the required fields and local key, then retry.</p><a href=/>Back</a></body></html>",
      );
    }
  });
});

server.listen(PORT, HOST, () =>
  console.log(`Local Hotelbeds CSR helper listening on http://${HOST}:${PORT}`),
);
