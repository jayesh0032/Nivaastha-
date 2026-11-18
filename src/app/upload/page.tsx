'use client';

import { UploadForm } from '@/components/upload-form';
import { PlusSquare } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';

function UploadPageContent() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <PlusSquare className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Post a Property</h1>
      </div>
      <UploadForm />
    </div>
  );
}

export default function UploadPage() {
  return (
    <AuthGuard>
      <UploadPageContent />
    </AuthGuard>
  );
}
