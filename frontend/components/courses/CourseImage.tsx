"use client";
import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { assets, courseImageSource } from '@/lib/assets';
export default function CourseImage(props: ImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const src = typeof props.src === 'string' ? courseImageSource(props.src) : props.src;
  const actual = failedSource === src ? assets.courses : src;
  return <Image {...props} src={actual} unoptimized={typeof actual === 'string' && /^(?:data:|https?:)/.test(actual)} onError={() => setFailedSource(typeof src === 'string' ? src : '')} />;
}
