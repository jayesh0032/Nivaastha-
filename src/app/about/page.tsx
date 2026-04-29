import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center items-center">
          <div className="p-3 rounded-full bg-accent/20">
            <Info className="mx-auto h-10 w-10 text-accent-foreground" />
          </div>
          <CardTitle className="text-3xl font-headline mt-4">About Nivaastha</CardTitle>
        </CardHeader>
        <CardContent className="text-foreground/90 leading-relaxed space-y-6 px-8 pb-8">
          <p>
            Welcome to Nivaastha, your ultimate partner in the quest for the perfect rental property. Born from a desire to simplify the often-complex world of real estate, our mission is to create a seamless, transparent, and trustworthy bridge between property owners and potential tenants.
          </p>
          <p>
            We believe that finding your next home should be an exciting journey, not a stressful ordeal. That's why we've built a platform that is intuitive, feature-rich, and completely free to use for listing properties. Our goal is to empower users with all the tools they need to make informed decisions—from detailed listings and high-quality photos to AI-powered descriptions and precise location mapping.
          </p>
          <h3 className="font-headline text-2xl pt-4 border-b pb-2">Our Vision</h3>
          <p>
            Our vision is to become the most trusted and user-friendly rental platform in the market. We are committed to leveraging technology to solve real-world problems, ensuring that every interaction on Nivaastha is a positive one. Whether you are a property owner looking to reach a wide audience or a tenant searching for your dream home, we are here to make the process easier and more efficient.
          </p>
          <h3 className="font-headline text-2xl pt-4 border-b pb-2">Why Choose Us?</h3>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Free Listings:</strong> We don't charge a penny to list your property. Our platform is open and accessible to all owners.</li>
            <li><strong>AI-Powered Tools:</strong> Generate compelling, professional-grade property descriptions in seconds to attract the right tenants.</li>
            <li><strong>User-Centric Design:</strong> An easy-to-navigate interface designed for a hassle-free and enjoyable experience on any device.</li>
            <li><strong>Community and Trust:</strong> We prioritize creating a safe and reliable community for all our users through transparent practices.</li>
          </ul>
          <p className="pt-4 text-center text-lg font-semibold">
            Thank you for choosing Nivaastha. Let's find your dream home, together.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
