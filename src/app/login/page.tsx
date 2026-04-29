'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUserStore } from '@/hooks/use-user-store';
import { Logo } from '@/components/logo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indianStates } from '@/lib/location-data';

// --- Signup Form Schema ---
const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  mobileNumber: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit mobile number.' }),
  pinCode: z.string().min(6, { message: 'PIN code must be at least 6 characters.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  state: z.string().min(2, { message: 'State is required.' }),
  country: z.string().min(2, { message: 'Country is required.' }),
});
type SignupFormValues = z.infer<typeof signupSchema>;

// --- Signup Component ---
function SignupForm({ onSignupSuccess, onBack }: { onSignupSuccess: () => void; onBack: () => void }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const { addUser, findUserByMobile } = useUserStore();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', mobileNumber: '', pinCode: '', city: '', state: '', country: 'India' },
  });

  const onSubmit = (data: SignupFormValues) => {
    setIsLoading(true);
    if (findUserByMobile(data.mobileNumber)) {
      toast({ title: 'User Exists', description: 'A user with this mobile number already exists. Please log in.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      addUser(data);
      toast({ title: 'Signup Successful!', description: 'You can now log in with your mobile number.' });
      setIsLoading(false);
      onSignupSuccess();
    }, 400);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField control={form.control} name="mobileNumber" render={({ field }) => ( <FormItem> <FormLabel>Mobile Number</FormLabel> <FormControl><Input type="tel" placeholder="e.g., 9876543210" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField control={form.control} name="pinCode" render={({ field }) => ( <FormItem> <FormLabel>Pin Code</FormLabel> <FormControl><Input placeholder="e.g., 400050" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField control={form.control} name="city" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {indianStates.map((stateName) => (
                    <SelectItem key={stateName} value={stateName}>
                      {stateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
          <Button variant="link" type="button" onClick={onBack}>
            Already have an account? Login
          </Button>
        </div>
      </form>
    </Form>
  );
}


// --- Login Component ---
function LoginForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = React.useState(1);
  const [mobileNumber, setMobileNumber] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuthStore();
  const { findUserByMobile } = useUserStore();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) {
      toast({ title: 'Invalid Mobile Number', description: 'Please enter a valid 10-digit mobile number.', variant: 'destructive' });
      return;
    }

    if (!findUserByMobile(mobileNumber)) {
        toast({ title: 'User Not Found', description: 'No account exists with this mobile number. Please sign up.', variant: 'destructive' });
        return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${mobileNumber}. (It's 123456)` });
      setStep(2);
      setIsLoading(false);
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456') {
      toast({ title: 'Invalid OTP', description: 'The OTP you entered is incorrect.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      toast({ title: 'Login Successful', description: 'Welcome back to Nivaastha!' });
      login(mobileNumber);
      router.push('/');
      setIsLoading(false);
    }, 400);
  };
  
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onBack();
    }
  }

  return (
    <>
      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="e.g., 9876543210"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
            />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
             <Button variant="link" type="button" onClick={handleBack}>
                Go Back
             </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">One-Time Password (OTP)</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
           <div className="flex flex-col gap-2 pt-2">
             <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Login
              </Button>
              <Button variant="link" type="button" onClick={handleBack}>
                Go Back
              </Button>
           </div>
        </form>
      )}
    </>
  );
}

// --- Main Page Component ---
export default function LoginPage() {
  const [mode, setMode] = React.useState<'initial' | 'login' | 'signup'>('initial');

  const getTitle = () => {
    switch(mode) {
      case 'login': return 'Login to Your Account';
      case 'signup': return 'Create Your Account';
      case 'initial':
      default:
        return 'Welcome to Nivaastha';
    }
  };

  const getDescription = () => {
     switch(mode) {
      case 'login': return 'Enter your mobile number to receive an OTP.';
      case 'signup': return 'Join us and find your next home with ease.';
      case 'initial':
      default:
        return 'The best place to find your next rental. Log in or sign up to continue.';
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
            <Logo className="mx-auto h-14 w-14 text-primary" />
            <CardTitle className="text-3xl font-headline pt-4">{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'initial' && (
            <div className="flex flex-col gap-4 pt-4">
              <Button size="lg" className="w-full" onClick={() => setMode('login')}>Login with Mobile</Button>
              <Button size="lg" className="w-full" variant="secondary" onClick={() => setMode('signup')}>New User? Sign Up</Button>
            </div>
          )}
          {mode === 'login' && <LoginForm onBack={() => setMode('initial')} />}
          {mode === 'signup' && <SignupForm onSignupSuccess={() => setMode('login')} onBack={() => setMode('initial')} />}
        </CardContent>
      </Card>
    </div>
  );
}