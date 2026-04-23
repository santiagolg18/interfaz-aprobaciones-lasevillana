"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://res.cloudinary.com/dqnsskjfg/image/upload/q_auto/f_auto/v1776400960/Logo-La-Sevillana-white_1_cjoldw.png";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/facturas", label: "Facturas", icon: Receipt },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/aprobadores", label: "Aprobadores", icon: Users },
  { href: "/reportes", label: "Reportes", icon: FileSpreadsheet },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ userEmail, onNavigate }: { userEmail: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand header — La Sevillana */}
      <div className="flex h-20 items-center justify-center px-6 bg-[#111111]">
        <Image
          src={LOGO_URL}
          alt="La Sevillana"
          width={160}
          height={56}
          className="object-contain"
          priority
          unoptimized
        />
      </div>

      {/* App label strip */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-white">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Receipt className="size-3.5" />
        </div>
        <div className="text-xs font-semibold leading-tight text-neutral-700">
          Aprobaciones
          <div className="text-[10px] font-normal text-muted-foreground">
            Facturas DIAN
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="px-2 text-xs text-muted-foreground truncate" title={userEmail}>
          {userEmail}
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-neutral-700 hover:bg-neutral-100"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:border-r lg:bg-white">
        <SidebarBody userEmail={userEmail} />
      </aside>

      {/* Mobile / tablet */}
      <header className="lg:hidden flex h-14 items-center justify-between border-b bg-[#111111] px-4 sticky top-0 z-40">
        <Image
          src={LOGO_URL}
          alt="La Sevillana"
          width={130}
          height={44}
          className="object-contain"
          priority
          unoptimized
        />
        <Sheet>
          <SheetTrigger
            aria-label="Abrir menú"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <SidebarBody userEmail={userEmail} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
