const WEB3FORMS_URL = "https://api.web3forms.com/submit";

export type SubscribeResult =
  | { ok: true; message: string }
  | { ok: false; message: string; code: "invalid" | "config" | "network" | "server" };

function getAccessKey(): string {
  const key = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
  return typeof key === "string" ? key.trim() : "";
}

export function isSubscribeConfigured(): boolean {
  return getAccessKey().length > 0;
}

export async function submitPhotoSubscribe(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, code: "invalid", message: "请输入有效的邮箱地址。" };
  }

  const accessKey = getAccessKey();
  if (!accessKey) {
    return {
      ok: false,
      code: "config",
      message: "订阅服务尚未配置。请通过页面上的邮箱直接联系作者。",
    };
  }

  try {
    const res = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        email: trimmed,
        subject: "Hayato Photography · 新订阅",
        from_name: "Hayato Photography",
        message: `用户订阅作品更新通知：${trimmed}`,
        botcheck: "",
      }),
    });

    const data = (await res.json()) as { success?: boolean; message?: string };
    if (res.ok && data.success) {
      return {
        ok: true,
        message: "订阅成功。有新作品上架时，我们会把通知发到你的邮箱。",
      };
    }
    return {
      ok: false,
      code: "server",
      message: data.message?.trim() || "提交失败，请稍后再试。",
    };
  } catch {
    return { ok: false, code: "network", message: "网络异常，请检查连接后重试。" };
  }
}
