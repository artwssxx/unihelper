// Файл → base64 для отправки на сервер. Большие фото уменьшаем до 2000 px (JPEG), чтобы уложиться в лимит.
export async function readFile(f: File): Promise<{ mime: string; base64: string }> {
  if (f.type.startsWith("image/") && f.size > 1_200_000) {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.85);
    return { mime: "image/jpeg", base64: url.split(",")[1] };
  }
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mime: f.type === "image/jpg" ? "image/jpeg" : f.type, base64: btoa(bin) };
}
