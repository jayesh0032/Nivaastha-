
'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Camera, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhotoUploadFieldProps {
  name: string;
  label: string;
  description: string;
  multiple?: boolean;
  initialPreviews?: string[];
}

const fileToDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function PhotoUploadField({ name, label, description, multiple = false, initialPreviews = [] }: PhotoUploadFieldProps) {
  const { setValue, watch, formState: { errors } } = useFormContext();
  const { toast } = useToast();
  const [newFilePreviews, setNewFilePreviews] = React.useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const filesValue = watch(name);
  
  // Normalize files to an array for preview logic
  const getFilesArray = (val: any): File[] => {
    if (!val) return [];
    if (val instanceof FileList) return Array.from(val);
    if (Array.isArray(val)) return val;
    return [val];
  };

  React.useEffect(() => {
    const filesArray = getFilesArray(filesValue);
    if (filesArray.length > 0) {
      Promise.all(filesArray.map(fileToDataURI))
        .then(setNewFilePreviews)
        .catch((error) => {
            console.error('Error creating previews:', error);
            toast({
                title: 'Error creating previews',
                description: 'Could not read one or more image files.',
                variant: 'destructive',
            });
            setNewFilePreviews([]);
        });
    } else {
        setNewFilePreviews([]);
    }
  }, [filesValue, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const currentFiles = getFilesArray(filesValue);
      const newSelected = Array.from(selectedFiles);
      const updatedFiles = multiple ? [...currentFiles, ...newSelected] : newSelected;
      setValue(name, updatedFiles, { shouldValidate: true });
    }
  };

  const handleRemoveAll = (e: React.MouseEvent) => {
    e.preventDefault();
    setValue(name, null, { shouldValidate: true });
    setNewFilePreviews([]);
    if(inputRef.current) {
        inputRef.current.value = "";
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      setIsCameraOpen(true);
      
      // We need to wait for the dialog to open and video ref to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this feature.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const currentFiles = getFilesArray(filesValue);
            const updatedFiles = multiple ? [...currentFiles, file] : [file];
            setValue(name, updatedFiles, { shouldValidate: true });
            stopCamera();
          }
        }, 'image/jpeg', 0.85);
      }
    }
  };
  
  const hasError = !!errors[name];
  const displayedPreviews = newFilePreviews.length > 0 ? newFilePreviews : initialPreviews;

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className={cn("border-2 border-dashed rounded-lg p-4 text-center transition-colors", displayedPreviews.length > 0 && "border-primary", hasError && "border-destructive")}>
        {displayedPreviews.length > 0 ? (
          <div className="relative">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {displayedPreviews.map((src, index) => (
                <div key={index} className="relative aspect-square">
                  <Image src={src} alt="Preview" fill className="rounded-md object-cover" />
                </div>
              ))}
            </div>
             <Button variant="ghost" size="sm" className="absolute -top-2 -right-2 bg-background h-7 w-7 p-1 rounded-full shadow-md" onClick={handleRemoveAll}>
              <X className="h-4 w-4"/>
              <span className="sr-only">Remove all</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}
        
        <FormControl>
            <Input
                type="file"
                accept="image/*"
                multiple={multiple}
                className="hidden"
                ref={inputRef}
                onChange={handleFileChange}
            />
        </FormControl>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {displayedPreviews.length > 0 ? 'Add Photos' : 'Choose Photos'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={startCamera}>
            <Camera className="mr-2 h-4 w-4" />
            Take Live Photo
          </Button>
        </div>
      </div>
      <FormMessage />

      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Property Photo</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive" className="bg-background/90 backdrop-blur-sm">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access to take live photos of your property.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter className="flex sm:justify-center gap-2">
            <Button variant="outline" onClick={stopCamera}>Cancel</Button>
            <Button onClick={capturePhoto} disabled={hasCameraPermission === false}>
              <Camera className="mr-2 h-4 w-4" />
              Capture Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormItem>
  );
}
