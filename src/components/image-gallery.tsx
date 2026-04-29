'use client';

import * as React from 'react';
import Image from 'next/image';
import type { PropertyImage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface ImageGalleryProps {
  images: PropertyImage[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const validImages = images.filter(image => image.url);
  const [selectedImage, setSelectedImage] = React.useState(validImages[0] || null);

  React.useEffect(() => {
    const newValidImages = images.filter(image => image.url);
    if (newValidImages.length > 0) {
        setSelectedImage(newValidImages[0]);
    } else {
        setSelectedImage(null);
    }
  }, [images]);

  if (!selectedImage || validImages.length === 0) {
    return (
        <Card className="overflow-hidden">
            <div className="aspect-video relative bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">No images available</p>
            </div>
        </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="aspect-video relative bg-muted">
          <Image
            src={selectedImage.url!}
            alt={`${title} - ${selectedImage.hint}`}
            fill
            className="object-cover transition-all duration-200"
            data-ai-hint={selectedImage.hint}
            priority
          />
        </div>
      </Card>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
        {validImages.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(image)}
            className={cn(
              "overflow-hidden rounded-md aspect-square relative transition-all duration-200 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
              selectedImage.url === image.url ? 'ring-2 ring-primary scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'
            )}
          >
            <Image
              src={image.url!}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 20vw, 10vw"
              data-ai-hint={image.hint}
            />
          </button>
        ))}
      </div>
    </div>
  );
}