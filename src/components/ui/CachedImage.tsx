"use client";

import Image from "next/image";
import { imageUrl, imageUrlOptimized } from "@/lib/imageUrl";
import type { ImageProps } from "next/image";

type Props = Omit<ImageProps, "src" | "onError"> & {
  src: string | null | undefined;
  thumbWidth?: number;
};

export function CachedImage({ src, thumbWidth, ...props }: Props) {
  const resolved = imageUrl(src);
  if (!resolved) return null;

  const finalSrc = thumbWidth
    ? imageUrlOptimized(resolved, { w: thumbWidth })
    : resolved;

  return (
    <Image
      src={finalSrc}
      {...props}
    />
  );
}
