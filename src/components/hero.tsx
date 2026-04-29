'use client';

import * as React from 'react';
import Image from 'next/image';
import type { PropertyImage } from '@/lib/types';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';
import { PlusSquare } from 'lucide-react';

const heroImages: PropertyImage[] = [
    { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071', hint: 'modern villa pool sunset' },
    { url: 'https://images.unsplash.com/photo-1598228723793-52759bba239c?q=80&w=2070', hint: 'luxury villa tropical' },
    { url: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070', hint: 'colorful modern house' },
    { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070', hint: 'modern house night lights' },
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070', hint: 'classic suburban villa' },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070', hint: 'white modern villa'},
    { url: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=2070', hint: 'villa with pool'},
    { url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=1965', hint: 'house with lawn'},
];

export function Hero() {
  const pathname = usePathname();
  
  const isRentActive = pathname === '/';
  const isSaleActive = pathname === '/for-sale';

  return (
    <section className="relative -mt-8 -mx-4 h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 w-full h-full">
        {heroImages.map((image, index) => (
          <Image
            key={index}
            src={image.url}
            alt={image.hint}
            fill
            className='object-cover opacity-0 animate-image-fade'
            style={{
              animationDelay: `${index * 5}s`,
              animationDuration: `${heroImages.length * 5}s`,
            }}
            data-ai-hint={image.hint}
            priority={index === 0}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-black/50 z-10" />

      <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold font-headline drop-shadow-2xl">
          Find Your Dream Home
        </h1>
        <p className="mt-4 text-lg md:text-xl text-neutral-200 drop-shadow-xl leading-relaxed">
          The perfect place to find your next home. Search through thousands of listings to find the right one for you.
        </p>
        
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base font-semibold" variant={isRentActive ? 'default' : 'secondary'}>
                  <Link href="/">For Rent</Link>
              </Button>
              <Button asChild size="lg" className="h-12 px-6 text-base font-semibold" variant={isSaleActive ? 'default' : 'secondary'}>
                  <Link href="/for-sale">For Sale</Link>
              </Button>
          </div>
          
          <Button asChild size="lg" className="h-12 px-6 text-base font-semibold shadow-lg hover:scale-105 transition-transform">
              <Link href="/upload" className="flex items-center gap-2">
                  <PlusSquare className="h-5 w-5" />
                  List Your Property Free
              </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
