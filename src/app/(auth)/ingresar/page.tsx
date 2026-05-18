"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dumbbell, User, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { SignInForm } from "@/components/forms/sign-in-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { registerUser } from "@/app/actions/auth";

// ---------------------------------------------------------------------------
// Demo: selector de perfiles (sin auth real)
// ---------------------------------------------------------------------------

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface DemoProfile {
  id: string;
  name: string;
  email: string;
  role: "TRAINER" | "CLIENT";
  avatarInitials: string;
}

const DEMO_PROFILES: DemoProfile[] = [
  { id: "trainer-demo-001", name: "Coach Demo", email: "demo@vizion.app", role: "TRAINER", avatarInitials: "CD" },
  { id: "client-ana", name: "Ana Solis Mora", email: "ana.solis@demo.local", role: "CLIENT", avatarInitials: "AS" },
  { id: "client-bruno", name: "Bruno Jimenez Rojas", email: "bruno.jimenez@demo.local", role: "CLIENT", avatarInitials: "BJ" },
  { id: "client-diana", name: "Diana Mora Quesada", email: "diana.mora@demo.local", role: "CLIENT", avatarInitials: "DM" },
];

function DemoProfileSelector() {
  function handleSelect(profile: DemoProfile) {
    localStorage.setItem("vizion-demo-profile", JSON.stringify(profile.id));
    window.location.href = profile.role === "TRAINER" ? "/inicio" : "/client/rutinas";
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Vizion Demo</h1>
        <p className="text-sm text-[#71717A]">
          Elegí un perfil para explorar la demo. Tus datos se guardan solo en
          este navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {DEMO_PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile)}
            className="group flex items-center gap-4 rounded-xl border border-[#3F3F46] bg-[#27272A]/60 px-4 py-3.5 text-left transition-all hover:border-[#FF6A1A]/50 hover:bg-[#27272A]/80"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3F3F46] text-sm font-semibold text-[#D4D4D8] group-hover:bg-[#FF6A1A]/20 group-hover:text-[#FF6A1A]">
              {profile.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#FAFAFA]">{profile.name}</p>
              <p className="text-xs text-[#71717A]">
                {profile.role === "TRAINER" ? (
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    Entrenador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Cliente
                  </span>
                )}
                <span className="mx-1.5">&middot;</span>
                {profile.email}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#52525B] transition-colors group-hover:text-[#FF6A1A]" />
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-[#52525B]">
        Versión demo &middot; Sin servidor &middot; Datos en localStorage
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema de validación para el registro
// ---------------------------------------------------------------------------

const registerFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Mínimo 2 caracteres")
      .max(100, "Máximo 100 caracteres"),
    email: z.string().trim().email("Email inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

// ---------------------------------------------------------------------------
// Estilos de input reutilizables (oscuros, con foco naranja)
// ---------------------------------------------------------------------------

const inputClassName =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A1A] transition-colors";

// ---------------------------------------------------------------------------
// Dialog de Login
// ---------------------------------------------------------------------------

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onGoToRegister: () => void;
}

function LoginDialog({ open, onClose, onGoToRegister }: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ingresar</DialogTitle>
          <DialogDescription>
            Ingresá con tu correo y contraseña o solicitá un enlace mágico.
          </DialogDescription>
        </DialogHeader>

        <SignInForm callbackUrl="/inicio" />

        {/* Enlace hacia el registro */}
        <p className="text-center text-sm text-[#71717A]">
          ¿No tenés cuenta?{" "}
          <button
            type="button"
            onClick={onGoToRegister}
            className="font-medium text-[#FF6A1A] hover:text-[#E55A0E] transition-colors underline-offset-4 hover:underline"
          >
            Registrate
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog de Registro
// ---------------------------------------------------------------------------

interface RegisterDialogProps {
  open: boolean;
  selectedRole: "TRAINER" | "CLIENT";
  onClose: () => void;
  onGoToLogin: () => void;
}

function RegisterDialog({
  open,
  selectedRole,
  onClose,
  onGoToLogin,
}: RegisterDialogProps) {
  // Estado de éxito: mostramos confirmación en lugar del form
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
  });

  // Cuando el dialog se cierra, reseteamos el form y el estado de éxito
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset();
      setRegistered(false);
      onClose();
    }
  }

  async function onSubmit(data: RegisterFormValues) {
    // Construimos FormData: registerUser() espera FormData, no un objeto plano
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("email", data.email);
    fd.set("password", data.password);
    fd.set("role", selectedRole);

    const result = await registerUser(fd);

    if (!result.ok) {
      toast.error(result.error?.message ?? "No se pudo crear la cuenta. Reintentá.");
      return;
    }

    setRegistered(true);
  }

  const roleLabel = selectedRole === "TRAINER" ? "Entrenador/a" : "Cliente";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        {/* Pantalla de confirmación post-registro */}
        {registered ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-[#FF6A1A]" aria-hidden="true" />
            <DialogTitle>Revisá tu correo</DialogTitle>
            <DialogDescription>
              Te enviamos un link mágico para activar tu cuenta. Si no lo ves,
              chequeá la carpeta de spam.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              {/* Badge del rol seleccionado */}
              <div className="mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6A1A]/30 bg-[#FF6A1A]/10 px-2.5 py-0.5 text-xs font-medium text-[#FF6A1A]">
                  {selectedRole === "TRAINER" ? (
                    <Dumbbell className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <User className="h-3 w-3" aria-hidden="true" />
                  )}
                  {roleLabel}
                </span>
              </div>
              <DialogTitle>Crear tu cuenta</DialogTitle>
              <DialogDescription>30 días gratis. Sin tarjeta.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Nombre completo */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-name"
                  className="block text-sm font-medium text-[#FAFAFA]"
                >
                  Nombre completo
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  className={inputClassName}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-email"
                  className="block text-sm font-medium text-[#FAFAFA]"
                >
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="vos@ejemplo.com"
                  className={inputClassName}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-password"
                  className="block text-sm font-medium text-[#FAFAFA]"
                >
                  Contraseña
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={inputClassName}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-sm font-medium text-[#FAFAFA]"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repetí tu contraseña"
                  className={inputClassName}
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Botón de submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#FF6A1A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E55A0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    Crear cuenta gratis
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Enlace hacia el login */}
            <p className="text-center text-sm text-[#71717A]">
              ¿Ya tenés cuenta?{" "}
              <button
                type="button"
                onClick={onGoToLogin}
                className="font-medium text-[#FF6A1A] hover:text-[#E55A0E] transition-colors underline-offset-4 hover:underline"
              >
                Ingresá
              </button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Hub de producción: selección de rol + dialogs
// ---------------------------------------------------------------------------

type View = "landing" | "login" | "register";

function ProdHub() {
  const [view, setView] = useState<View>("landing");
  const [selectedRole, setSelectedRole] = useState<"TRAINER" | "CLIENT">("TRAINER");

  function openRegister(role: "TRAINER" | "CLIENT") {
    setSelectedRole(role);
    setView("register");
  }

  function openLogin() {
    setView("login");
  }

  function closeBothDialogs() {
    setView("landing");
  }

  // Transición entre dialogs: cerrar uno y abrir el otro sin pasar por landing
  function switchToRegister() {
    // Mantenemos el rol previamente seleccionado (o TRAINER por defecto)
    setView("register");
  }

  function switchToLogin() {
    setView("login");
  }

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Estado landing: selección de rol                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Bienvenido a Vizion</h1>
          <p className="text-sm text-[#71717A]">
            Seleccioná tu perfil para empezar
          </p>
        </div>

        {/* Tarjetas de rol */}
        <div className="grid grid-cols-2 gap-3">
          {/* Entrenador/a */}
          <button
            type="button"
            onClick={() => openRegister("TRAINER")}
            className="group flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-[#3F3F46] p-4 text-left transition-all hover:border-[#FF6A1A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]"
            style={{ borderLeftWidth: "3px", borderLeftColor: "#FF6A1A" }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6A1A]/10 text-[#FF6A1A] transition-colors group-hover:bg-[#FF6A1A]/20">
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#FAFAFA]">Entrenador/a</p>
              <p className="text-xs text-[#71717A]">
                Gestioná clientes y creá rutinas
              </p>
            </div>
          </button>

          {/* Cliente */}
          <button
            type="button"
            onClick={() => openRegister("CLIENT")}
            className="group flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-[#3F3F46] p-4 text-left transition-all hover:border-[#FF6A1A] focus-visible:border-[#FF6A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]"
            style={{ borderLeftWidth: "3px", borderLeftColor: "#FF6A1A" }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6A1A]/10 text-[#FF6A1A] transition-colors group-hover:bg-[#FF6A1A]/20">
              <User className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#FAFAFA]">Cliente</p>
              <p className="text-xs text-[#71717A]">Entrenás con un coach</p>
            </div>
          </button>
        </div>

        {/* Enlace al login para usuarios existentes */}
        <p className="text-center text-sm text-[#71717A]">
          ¿Ya tenés cuenta?{" "}
          <button
            type="button"
            onClick={openLogin}
            className="font-medium text-[#FF6A1A] hover:text-[#E55A0E] transition-colors underline-offset-4 hover:underline"
          >
            Ingresá
          </button>
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Dialog de login                                                     */}
      {/* ------------------------------------------------------------------ */}
      <LoginDialog
        open={view === "login"}
        onClose={closeBothDialogs}
        onGoToRegister={switchToRegister}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Dialog de registro                                                  */}
      {/* ------------------------------------------------------------------ */}
      <RegisterDialog
        open={view === "register"}
        selectedRole={selectedRole}
        onClose={closeBothDialogs}
        onGoToLogin={switchToLogin}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function IngresarPage() {
  if (IS_DEMO) return <DemoProfileSelector />;
  return <ProdHub />;
}
