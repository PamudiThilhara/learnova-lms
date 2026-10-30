import Image from 'next/image';
import { assets, type Asset } from '@/lib/assets';
export default function Artwork({ name, className = '', priority = false, alt = '' }: { name: Asset; className?: string; priority?: boolean; alt?: string }) {
  return <div className={`artwork relative overflow-hidden ${className}`}><Image src={assets[name]} alt={alt} fill sizes="(max-width: 768px) 90vw, 520px" className="object-contain" preload={priority} /></div>;
}
