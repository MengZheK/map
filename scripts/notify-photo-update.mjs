/**
 * 当 photos.json 有新增条目时，向订阅者发送邮件（Resend API）。
 *
 * 环境变量：
 *   RESEND_API_KEY     — Resend API 密钥
 *   RESEND_FROM        — 已验证发件地址，如 "Hayato Photography <onboarding@resend.dev>"
 *   SUBSCRIBER_EMAILS  — 订阅者邮箱，逗号或换行分隔
 *   PREV_PHOTO_COUNT   — 上次部署时的照片数量（由 CI 传入）
 *   SITE_URL           — 站点链接，默认 https://map.robotedu.cc
 */

const RESEND_URL = "https://api.resend.com/emails";

function parseEmails(raw) {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

async function sendBatch({ apiKey, from, to, subject, html }) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  const subscribers = parseEmails(process.env.SUBSCRIBER_EMAILS);
  const prevCount = Number.parseInt(process.env.PREV_PHOTO_COUNT ?? "0", 10);
  const siteUrl = (process.env.SITE_URL ?? "https://map.robotedu.cc").replace(/\/$/, "");

  if (!apiKey || !from) {
    console.log("[notify] 跳过：未配置 RESEND_API_KEY / RESEND_FROM");
    process.exit(0);
  }
  if (subscribers.length === 0) {
    console.log("[notify] 跳过：无订阅者 SUBSCRIBER_EMAILS");
    process.exit(0);
  }

  const fs = await import("node:fs");
  const photosPath = new URL("../public/photos/photos.json", import.meta.url);
  const photos = JSON.parse(fs.readFileSync(photosPath, "utf8"));
  const count = Array.isArray(photos) ? photos.length : 0;

  if (count <= prevCount) {
    console.log(`[notify] 跳过：照片数 ${count} 未增加（上次 ${prevCount}）`);
    process.exit(0);
  }

  const added = count - prevCount;
  const subject = `Hayato Photography · 相册有 ${added} 张新作品`;
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#0f172a">
      <p>你好，</p>
      <p>Hayato Photography 相册刚刚更新了 <strong>${added}</strong> 张照片，目前共 <strong>${count}</strong> 张。</p>
      <p><a href="${siteUrl}/album" style="color:#2563eb">打开相册</a></p>
      <p style="color:#94a3b8;font-size:13px">你收到此邮件是因为曾订阅作品更新。如需退订，请回复本邮件说明。</p>
    </div>
  `;

  for (const email of subscribers) {
    await sendBatch({ apiKey, from, to: [email], subject, html });
    console.log(`[notify] 已发送 → ${email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
