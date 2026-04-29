import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center items-center">
           <div className="p-3 rounded-full bg-accent/20">
            <Shield className="mx-auto h-10 w-10 text-accent-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground pt-1">Last updated: August 1, 2024</p>
        </CardHeader>
        <CardContent className="text-foreground/90 leading-relaxed space-y-6 px-8 pb-8">
          <p>
            This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data. We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">1. Information Collection and Use</h3>
          <p>
            We collect several different types of information for various purposes to provide and improve our Service to you. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to, your name, mobile number, and location.</li>
            <li><strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used. This may include information such as your computer's IP address, browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, and other diagnostic data.</li>
            <li><strong>Property Data:</strong> Information and photos you provide for property listings, which are made public on our platform to facilitate rentals.</li>
          </ul>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">2. Use of Data</h3>
          <p>
            Nivaastha uses the collected data for various purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide, maintain, and improve our Service.</li>
            <li>To notify you about changes to our Service.</li>
            <li>To allow you to participate in interactive features of our Service.</li>
            <li>To provide customer care and support.</li>
            <li>To monitor the usage of the Service and prevent fraudulent activity.</li>
          </ul>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">3. Data Security</h3>
          <p>
            The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">4. Changes to This Privacy Policy</h3>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </p>

          <h3 className="font-headline text-2xl pt-4 border-b pb-2">Contact Us</h3>
          <p>
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:contact@nivaastha.com" className="text-primary hover:underline">contact@nivaastha.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
