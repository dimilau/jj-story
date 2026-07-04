// Helper for generating images with Cloudflare Workers AI FLUX.2 klein-9b.
// The model requires a multipart/form-data body (see the Workers AI docs), so
// we build a FormData, wrap it in a Response to obtain a stream + content-type,
// and pass it via the `multipart` option. Output is a base64-encoded image.

import { env } from "cloudflare:workers";

const FLUX_MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateFluxImage({
  prompt,
  width,
  height,
  inputImages = [],
}: {
  prompt: string;
  width?: number;
  height?: number;
  /** Up to 4 reference images (each must be <=512x512), as WebP bytes. */
  inputImages?: Uint8Array[];
}): Promise<Uint8Array> {
  const form = new FormData();
  form.append("prompt", prompt);
  if (width) form.append("width", String(width));
  if (height) form.append("height", String(height));

  inputImages.slice(0, 4).forEach((bytes, i) => {
    form.append(
      `input_image_${i}`,
      new Blob([bytes as BlobPart], { type: "image/webp" }),
      `input_${i}.webp`
    );
  });

  const formResponse = new Response(form);
  const formStream = formResponse.body;
  const formContentType = formResponse.headers.get("content-type")!;

  // The flux-2-dev model and its multipart option are newer than the generated
  // Ai types, so cast to keep TypeScript happy.
  const resp = (await (env.AI as unknown as {
    run: (model: string, options: unknown) => Promise<{ image: string }>;
  }).run(FLUX_MODEL, {
    multipart: {
      body: formStream,
      contentType: formContentType,
    },
  })) as { image: string };

  return base64ToBytes(resp.image);
}
