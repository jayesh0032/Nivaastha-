
'use client';

import Link from 'next/link';
import { Home, PlusSquare, Bookmark, UserCircle, LogOut, ChevronDown, Facebook, Twitter, Instagram, Youtube, Menu, ClipboardList, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth-store';
import * as React from 'react';
import { Logo } from '@/components/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from '@/components/ui/separator';
import { useUserStore } from '@/hooks/use-user-store';

const mainNavLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/for-sale', label: 'For Sale', icon: Building },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/my-properties', label: 'My Properties', icon: ClipboardList },
];

const mobileNavLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/for-sale', label: 'For Sale', icon: Building },
  { href: '/upload', label: 'List Property', icon: PlusSquare },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/my-properties', label: 'My Properties', icon: ClipboardList },
];


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, userMobile } = useAuthStore();
  const { findUserByMobile } = useUserStore();
  const [isClient, setIsClient] = React.useState(false);
  
  const user = userMobile ? findUserByMobile(userMobile) : null;

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-2.5 text-foreground">
            <Logo className="h-9 w-9" />
            <div className="text-xl font-bold font-headline">Nivaastha</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {mainNavLinks.map((link) => (
              <Button key={link.href} variant="ghost" asChild className={cn(
                "font-semibold",
                pathname === link.href && "bg-primary/10 text-primary"
              )}>
                <Link href={link.href} className="flex items-center gap-2">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="font-semibold">
                  More
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Legal & Info</DropdownMenuLabel>
                  <DropdownMenuItem asChild><Link href="/about">About Us</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/privacy">Privacy Policy</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/terms">Terms of Service</Link></DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                 <DropdownMenuGroup>
                  <DropdownMenuLabel>Follow Us</DropdownMenuLabel>
                  <div className="flex items-center justify-around p-2">
                      <Link href="#" className="text-muted-foreground hover:text-primary transition-colors p-1"><Facebook className="h-5 w-5" /></Link>
                      <Link href="#" className="text-muted-foreground hover:text-primary transition-colors p-1"><Twitter className="h-5 w-5" /></Link>
                      <Link href="#" className="text-muted-foreground hover:text-primary transition-colors p-1"><Instagram className="h-5 w-5" /></Link>
                      <Link href="#" className="text-muted-foreground hover:text-primary transition-colors p-1"><Youtube className="h-5 w-5" /></Link>
                  </div>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="pl-4 flex items-center gap-4">
              <Button asChild>
                <Link href="/upload">
                  <PlusSquare />
                  List Property
                </Link>
              </Button>
             {isClient && (
                <>
                  {isAuthenticated && user ? (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2">
                                <UserCircle className="h-6 w-6" />
                                <span>{user.name.split(' ')[0]}</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                            <DropdownMenuLabel className="font-normal text-muted-foreground -mt-2">{user.mobileNumber}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Logout</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button asChild variant="secondary">
                      <Link href="/login">
                          <UserCircle className="h-5 w-5" />
                          Login
                      </Link>
                    </Button>
                  )}
                </>
             )}
             </div>
          </nav>

           {/* Mobile Navigation */}
           <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[360px] p-0 flex flex-col">
                  <SheetHeader className="p-6 pb-0">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">
                      A navigation menu with links to different pages of the app.
                    </SheetDescription>
                      <Link href="/" className="flex items-center gap-2.5 text-foreground">
                        <Logo className="h-9 w-9" />
                        <div className="text-xl font-bold font-headline">Nivaastha</div>
                      </Link>
                  </SheetHeader>
                  <nav className="flex flex-col h-full">
                    <div className="flex-grow space-y-2 pt-8 px-4">
                      {mobileNavLinks.map((link) => (
                        <SheetClose asChild key={link.href}>
                           <Link href={link.href}>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "font-semibold w-full justify-start text-base py-6",
                                  pathname === link.href && "bg-primary/10 text-primary"
                                )}
                              >
                                <link.icon className="h-5 w-5 mr-3" />
                                {link.label}
                              </Button>
                            </Link>
                        </SheetClose>
                      ))}
                      <Separator className="my-4" />
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="more-info" className="border-b-0">
                          <AccordionTrigger className="font-semibold text-base py-3 px-4 hover:no-underline">More Info</AccordionTrigger>
                          <AccordionContent className="pl-8 pr-4 space-y-4">
                            <div>
                                <h4 className="font-semibold text-muted-foreground mb-2 text-sm">Legal</h4>
                                <SheetClose asChild><Link href="/about" className="block py-1.5 text-muted-foreground hover:text-primary">About Us</Link></SheetClose>
                                <SheetClose asChild><Link href="/privacy" className="block py-1.5 text-muted-foreground hover:text-primary">Privacy Policy</Link></SheetClose>
                                <SheetClose asChild><Link href="/terms" className="block py-1.5 text-muted-foreground hover:text-primary">Terms of Service</Link></SheetClose>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold text-muted-foreground mb-2 text-sm">Follow Us</h4>
                                <div className="flex space-x-4">
                                  <Link href="#" className="text-muted-foreground hover:text-primary"><Facebook /></Link>
                                  <Link href="#" className="text-muted-foreground hover:text-primary"><Twitter /></Link>
                                  <Link href="#" className="text-muted-foreground hover:text-primary"><Instagram /></Link>
                                  <Link href="#" className="text-muted-foreground hover:text-primary"><Youtube /></Link>
                                </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    <div className="mt-auto border-t">
                       {isClient && (
                          <div className="p-4">
                            {isAuthenticated && user ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserCircle className="h-10 w-10 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold">{user.name}</p>
                                            <p className="text-sm text-muted-foreground">{user.mobileNumber}</p>
                                        </div>
                                    </div>
                                    <SheetClose asChild>
                                      <Button variant="ghost" size="icon" onClick={handleLogout}>
                                          <LogOut className="h-5 w-5" />
                                      </Button>
                                    </SheetClose>
                                </div>
                            ) : (
                              <SheetClose asChild>
                                <Link href="/login" className="w-full">
                                  <Button className="w-full justify-center text-base py-6">
                                    <UserCircle className="mr-3 h-5 w-5" />
                                    Login / Signup
                                  </Button>
                                </Link>
                              </SheetClose>
                            )}
                          </div>
                       )}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
           </div>
        </div>
      </div>
    </header>
  );
}
