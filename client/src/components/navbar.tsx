import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  GamepadIcon, 
  Crown, 
  LogOut, 
  Loader2, 
  UserCircle,
  Bookmark,
  Settings,
  Scroll
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();

  const Logo = () => (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <GamepadIcon className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden sm:block">
        Game Story Generator
      </h1>
      <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent sm:hidden">
        GSG
      </h1>
    </Link>
  );

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Logo />

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/stories">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Scroll className="h-4 w-4 mr-2" />
                My Stories
              </Button>
            </Link>
            <Link href="/plans">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <GamepadIcon className="h-4 w-4 mr-2" />
                Game Plans
              </Button>
            </Link>
            <Link href="/premium">
              <Button variant="ghost" size="sm" className="text-primary">
                <Crown className="h-4 w-4 mr-2" />
                Premium
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Premium Button - Outside Dropdown */}
            <Link href="/premium" className="md:hidden">
              <Button variant="ghost" size="sm" className="text-primary">
                <Crown className="h-4 w-4" />
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/stories" className="cursor-pointer">
                    <Scroll className="h-4 w-4 mr-2" />
                    My Stories
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/plans" className="cursor-pointer">
                    <GamepadIcon className="h-4 w-4 mr-2" />
                    Game Plans
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-red-600 cursor-pointer"
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </header>
  );
}