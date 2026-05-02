
import * as React from 'react';
import Link from 'next/link';
import { Logo } from './logo';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import Image from 'next/image';
import type { PropertyImage } from '@/lib/types';

const footerImages: PropertyImage[] = [
    { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071', hint: 'modern villa pool sunset' },
    { url: 'https://images.unsplash.com/photo-1598228723793-52759bba239c?q=80&w=2070', hint: 'luxury villa tropical' },
    { url: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070', hint: 'colorful modern house' },
    { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070', hint: 'modern house night lights' },
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070', hint: 'classic suburban villa' },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070', hint: 'white modern villa'},
    { url: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=2070', hint: 'villa with pool'},
    { url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=1965', hint: 'house with lawn'},
];


export function Footer() {
  return (
    <footer className="bg-secondary border-t relative overflow-hidden">
        <div className="absolute inset-0 z-0 w-full h-full">
            {footerImages.map((image, index) => (
              <Image
                key={index}
                src={image.url}
                alt={image.hint}
                fill
                className='object-cover opacity-0 animate-image-fade'
                style={{
                  animationDelay: `${index * 5}s`,
                  animationDuration: `${footerImages.length * 5}s`,
                }}
                data-ai-hint={image.hint}
                priority={index === 0}
              />
            ))}
        </div>
        <div className="absolute inset-0 bg-black/70 z-10" />

      <div className="container mx-auto px-4 py-12 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-white">
          <div className="md:col-span-2 lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 text-white">
                <Logo className="h-9 w-9 text-primary" />
                <div>
                  <div className="text-xl font-bold font-headline">Nivaastha</div>
                  <div className="text-xs text-neutral-300 -mt-1 tracking-wider uppercase">Find Your Home</div>
                </div>
            </Link>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Your one-stop destination for finding the perfect rental property. We connect tenants with owners for a seamless and trustworthy experience.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold font-headline mb-4 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/upload" className="text-sm text-neutral-300 hover:text-primary transition-colors">List a Property</Link></li>
              <li><Link href="/saved" className="text-sm text-neutral-300 hover:text-primary transition-colors">Saved Properties</Link></li>
               <li><Link href="/login" className="text-sm text-neutral-300 hover:text-primary transition-colors">Login/Signup</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-base font-semibold font-headline mb-4 text-white">Legal & Info</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-sm text-neutral-300 hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="text-sm text-neutral-300 hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-neutral-300 hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
             <h3 className="text-base font-semibold font-headline mb-4 text-white">Follow Us</h3>
             <div className="flex space-x-4">
                <Link href="#" className="text-neutral-300 hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></Link>
                <Link href="#" className="text-neutral-300 hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></Link>
                <Link href="#" className="text-neutral-300 hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></Link>
                <Link href="#" className="text-neutral-300 hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></Link>
             </div>
             <h3 className="text-base font-semibold font-headline mt-6 mb-4 text-white">Contact</h3>
             <ul className="space-y-2 text-neutral-300 text-sm">
                <li><a href="mailto:contact@nivaastha.com" className="hover:text-primary">contact@nivaastha.com</a></li>
             </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-white/20 pt-8 text-center text-neutral-300">
          <p className="text-sm font-semibold">&copy; {new Date().getFullYear()} Nivaastha. All rights reserved.</p>
          <p className="mt-3 text-xs max-w-3xl mx-auto leading-relaxed text-neutral-400">
            <strong>Disclaimer:</strong> The information provided on Nivaastha is for general informational purposes only. All information on the site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability or completeness of any information on the site. Users are advised to exercise caution and conduct their own due diligence.
          </p>
        </div>
      </div>
    </footer>
  );
}
