"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { CurrentUserRole } from "@/lib/auth/current-user";

const LOGO_URL =
  "https://res.cloudinary.com/dqnsskjfg/image/upload/q_auto/f_auto/v1776400960/Logo-La-Sevillana-white_1_cjoldw.png";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

function navForRole(role: CurrentUserRole): NavItem[] {
  if (role === "approver") {
    return [{ href: "/mis-aprobaciones", label: "Mis aprobaciones", icon: CheckSquare }];
  }
  const base: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/facturas", label: "Facturas", icon: Receipt },
    { href: "/proveedores", label: "Proveedores", icon: Building2 },
    { href: "/aprobadores", label: "Aprobadores", icon: Users },
    { href: "/reportes", label: "Reportes", icon: FileSpreadsheet },
  ];
  if (role === "admin") {
    base.push({ href: "/configuracion", label: "Configuración", icon: Settings });
  }
  return base;
}

function NavLinks({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2.5 rounded-md px-3 py-2 min-h-11 lg:min-h-0 text-sm font-medium transition-colors",
              "before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:transition-colors",
              active
                ? "bg-primary/10 text-primary before:bg-primary"
                : "text-neutral-700 before:bg-transparent hover:bg-neutral-100 hover:text-neutral-900",
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-neutral-500")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  userEmail,
  role,
  onNavigate,
}: {
  userEmail: string;
  role: CurrentUserRole;
  onNavigate?: () => void;
}) {
  const userDisplay = userEmail.split("@")[0] || userEmail;
  const nav = navForRole(role);
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
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-white">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <Receipt className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-neutral-900">Aprobaciones</div>
          <div className="text-xs text-muted-foreground">Facturas DIAN</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks nav={nav} onNavigate={onNavigate} />
      </div>

      <div className="border-t p-3 space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={userDisplay} size="sm" tone="primary" />
          <div className="min-w-0 leading-tight">
            <div
              className="text-sm font-medium text-neutral-900 truncate"
              title={userDisplay}
            >
              {userDisplay}
            </div>
            <div
              className="text-xs text-muted-foreground truncate"
              title={userEmail}
            >
              {userEmail}
            </div>
          </div>
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
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

export function Sidebar({
  userEmail,
  role,
}: {
  userEmail: string;
  role: CurrentUserRole;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:border-r lg:bg-white">
        <SidebarBody userEmail={userEmail} role={role} />
      </aside>

      {/* Mobile / tablet */}
      <header className="lg:hidden flex h-14 items-center justify-between border-b bg-[#111111] px-4 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
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
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "text-white hover:bg-white/10 hover:text-white",
            )}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-72 p-0">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <SidebarBody userEmail={userEmail} role={role} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
