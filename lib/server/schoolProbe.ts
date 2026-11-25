import "server-only";

// Диагностика школьных систем (eMaktab, EMIS) для админки: доступность, форма входа, капча, подсказки
// о движке сайта. Без паролей и без данных учеников. Хосты — только из списка ниже (не произвольные URL).

const HOSTS = ["emaktab.uz", "login.emaktab.uz", "schools.emaktab.uz", "emis.edu.uz", "litsey.edu.uz"];

export function probeAllowed(url: URL): boolean {
  return url.protocol === "https:" && HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export interface ProbeResult {
  url: string;
  status: number | null;
  finalUrl: string | null;
  error?: string;
  contentType?: string | null;
  cookieNames: string[];
  title?: string;
  forms: { action: string | null; method: string; inputs: { name: string; type: string }[] }[];
  captcha: boolean;
  scripts: string[];
  hints: string[];
  apiPaths: string[];
  text?: string;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(2).find((x) => x != null) ?? null;

export async function probe(url: string, follow = true): Promise<ProbeResult> {
  const out: ProbeResult = { url, status: null, finalUrl: null, cookieNames: [], forms: [], captcha: false, scripts: [], hints: [], apiPaths: [] };
  let current = url;
  const jar: string[] = [];
  try {
    for (let hop = 0; hop < 8; hop++) {
      const u = new URL(current);
      if (!probeAllowed(u)) { out.error = `redirect to non-allowed host ${u.hostname}`; break; }
      const r = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": UA, accept: "text/html,application/json,*/*", "accept-language": "uz,ru;q=0.8,en;q=0.6", ...(jar.length ? { cookie: jar.join("; ") } : {}) },
        signal: AbortSignal.timeout(15000),
      });
      for (const c of r.headers.getSetCookie?.() ?? []) {
        const kv = c.split(";")[0];
        const name = kv.split("=")[0];
        if (!out.cookieNames.includes(name)) out.cookieNames.push(name);
        jar.push(kv);
      }
      out.status = r.status;
      out.finalUrl = current;
      out.contentType = r.headers.get("content-type");
      const loc = r.headers.get("location");
      if (follow && r.status >= 300 && r.status < 400 && loc) { current = new URL(loc, current).toString(); continue; }
      const body = (await r.text()).slice(0, 2_000_000);
      analyse(body, out);
      break;
    }
  } catch (e) {
    out.error = (e as Error).message.slice(0, 200);
  }
  return out;
}

function analyse(body: string, out: ProbeResult) {
  out.title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 120);
  for (const f of body.match(/<form\b[\s\S]*?<\/form>/gi) ?? []) {
    const open = f.match(/<form\b[^>]*>/i)?.[0] ?? "";
    const inputs = (f.match(/<(input|select|textarea)\b[^>]*>/gi) ?? []).map((t) => ({ name: attr(t, "name") ?? "", type: (attr(t, "type") ?? t.match(/^<(\w+)/)?.[1] ?? "text").toLowerCase() })).filter((i) => i.name);
    out.forms.push({ action: attr(open, "action"), method: (attr(open, "method") ?? "get").toLowerCase(), inputs });
  }
  out.captcha = /captcha|recaptcha|hcaptcha|turnstile/i.test(body);
  out.scripts = [...new Set((body.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["']/gi) ?? []).map((t) => attr(t, "src") ?? ""))].filter(Boolean).slice(0, 30);
  const H: [RegExp, string][] = [
    [/_csrf|yii\.js|yii\.activeForm/i, "yii2"],
    [/csrf-token|laravel|XSRF-TOKEN|livewire/i, "laravel"],
    [/__NEXT_DATA__|\/_next\//, "nextjs"],
    [/id="root"|id="app"|data-v-app|ng-version/i, "spa"],
    [/__RequestVerificationToken|asp\.net|\.aspx/i, "asp.net"],
    [/oneid|id\.egov\.uz/i, "oneid"],
    [/telegram/i, "telegram"],
  ];
  out.hints = H.filter(([re]) => re.test(body)).map(([, h]) => h);
  out.apiPaths = [...new Set(body.match(/["'`](\/?(?:api|rest|v\d)\/[A-Za-z0-9_\-/.{}:$]+)["'`]/g)?.map((s) => s.slice(1, -1)) ?? [])].slice(0, 200);
  if (!/html/i.test(out.contentType ?? "") || body.length < 3000) out.text = body.replace(/\s+/g, " ").slice(0, 1500);
  else out.text = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
}
