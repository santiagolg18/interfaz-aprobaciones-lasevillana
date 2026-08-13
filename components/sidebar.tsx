"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  ListChecks,
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
import { frontLabel, parseFront } from "@/lib/invoices/business-front";

const LOGO_URL =
  "https://res.cloudinary.com/dqnsskjfg/image/upload/q_auto/f_auto/v1776400960/Logo-La-Sevillana-white_1_cjoldw.png";

// `front` distingue las dos secciones de Facturas del admin (que comparten el
// path /facturas y solo difieren en el query param). null = sin frente.
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  front?: "parrilla" | "agropecuaria";
};

function navForRole(
  role: CurrentUserRole,
  businessFront: string | null,
): NavItem[] {
  if (role === "approver") {
    return [{ href: "/mis-aprobaciones", label: "Mis aprobaciones", icon: CheckSquare }];
  }

  // Admin y Compras con "ambos": dos secciones separadas, una por frente.
  // Compras con un solo frente: una sola sección, etiquetada con su frente
  // asignado (el filtrado lo fuerza el servidor según su perfil).
  const facturasItems: NavItem[] =
    role === "admin" || businessFront === "ambos"
      ? [
          {
            href: "/facturas?front=parrilla",
            label: "Facturas Parrilla",
            icon: Receipt,
            front: "parrilla",
          },
          {
            href: "/facturas?front=agropecuaria",
            label: "Facturas Agropecuaria",
            icon: Receipt,
            front: "agropecuaria",
          },
        ]
      : [
          {
            href: "/facturas",
            label: (() => {
              const f = parseFront(businessFront);
              return f ? `Facturas ${frontLabel(f)}` : "Facturas";
            })(),
            icon: Receipt,
          },
        ];

  const base: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...facturasItems,
    { href: "/proveedores", label: "Proveedores", icon: Building2 },
    { href: "/aprobadores", label: "Aprobadores", icon: Users },
    { href: "/reportes", label: "Reportes", icon: FileSpreadsheet },
    // Historial global de acciones sobre facturas (auditoría).
    { href: "/actividad", label: "Actividad", icon: History },
  ];
  if (role === "admin") {
    // Admin gestiona el checklist desde dentro de Configuración, así no se
    // duplica como sección aparte en el menú.
    base.push({ href: "/configuracion", label: "Configuración", icon: Settings });
  } else {
    // Compras no tiene acceso a Configuración, así que llega al checklist
    // directamente desde el menú.
    base.push({ href: "/configuracion/checklist", label: "Checklist", icon: ListChecks });
  }
  return base;
}

function NavLinks({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFront = searchParams.get("front");
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon, front }) => {
        const onFacturas =
          pathname === "/facturas" || pathname.startsWith("/facturas/");
        // Las dos entradas de Facturas del admin comparten path: se distinguen
        // por el query param `front`.
        const active = front
          ? onFacturas && currentFront === front
          : pathname === href || pathname.startsWith(`${href}/`);
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
  businessFront,
  onNavigate,
}: {
  userEmail: string;
  role: CurrentUserRole;
  businessFront: string | null;
  onNavigate?: () => void;
}) {
  const userDisplay = userEmail.split("@")[0] || userEmail;
  const nav = navForRole(role, businessFront);
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
  businessFront,
}: {
  userEmail: string;
  role: CurrentUserRole;
  businessFront: string | null;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:border-r lg:bg-white">
        <SidebarBody userEmail={userEmail} role={role} businessFront={businessFront} />
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
            <SidebarBody userEmail={userEmail} role={role} businessFront={businessFront} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
