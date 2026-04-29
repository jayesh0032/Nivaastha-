import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center items-center">
          <div className="p-3 rounded-full bg-accent/20">
            <FileText className="mx-auto h-10 w-10 text-accent-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground pt-1">Last updated: August 1, 2024</p>
        </CardHeader>
        <CardContent className="text-foreground/90 leading-relaxed space-y-6 px-8 pb-8">
          <p>
            Please read these Terms of Service ("Terms") carefully before using the Nivaastha website (the "Service") operated by us. Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service. By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">1. Accounts</h3>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">2. Property Listings</h3>
          <p>
            Property owners are solely responsible for the accuracy, legality, and content of their listings. Nivaastha does not verify the authenticity of listings and is not responsible for any misrepresentation. We reserve the right, at our sole discretion, to remove any listing that violates our policies, is deemed inappropriate, or is reported by our community.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">3. User Conduct</h3>
          <p>
            You agree not to use the Service to post any content that is unlawful, harmful, threatening, abusive, fraudulent, or otherwise objectionable. You may not impersonate any person or entity, or violate any applicable local, state, national, or international law.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">4. Limitation Of Liability</h3>
          <p>
            In no event shall Nivaastha, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">5. Changes</h3>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">Contact Us</h3>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:contact@nivaastha.com" className="text-primary hover:underline">contact@nivaastha.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
