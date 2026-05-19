"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dumbbell, Eye, EyeOff, User, ArrowRight, Loader2, Search, CheckCircle2, X } from "lucide-react";
import { SignInForm } from "@/components/forms/sign-in-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { registerUser, searchTrainersByName } from "@/app/actions/auth";
import type { TrainerSearchResult } from "@/app/actions/auth";
import { useDebounce } from "@/hooks/use-debounce";

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
    referredByCode: z.string().trim().max(100).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

// ---------------------------------------------------------------------------
// Password strength logic
// ---------------------------------------------------------------------------

interface PasswordStrength {
  score: number; // 0–5
  label: string;
  labelColor: string;
  segmentColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", labelColor: "", segmentColor: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Muy débil",  labelColor: "text-red-400",    segmentColor: "bg-red-500"    };
  if (score === 2) return { score, label: "Débil",      labelColor: "text-orange-400", segmentColor: "bg-orange-500" };
  if (score === 3) return { score, label: "Aceptable",  labelColor: "text-yellow-400", segmentColor: "bg-yellow-500" };
  if (score === 4) return { score, label: "Fuerte",     labelColor: "text-green-400",  segmentColor: "bg-green-500"  };
  return              { score, label: "Muy fuerte",  labelColor: "text-emerald-400", segmentColor: "bg-emerald-500" };
}

// ---------------------------------------------------------------------------
// Estilos de input reutilizables (oscuros, con foco azul)
// ---------------------------------------------------------------------------

const inputClassName =
  "w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#71717A] focus-visible:border-[#3B82F6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3B82F6] transition-colors";

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
            className="font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors underline-offset-4 hover:underline"
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
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
  });

  const watchedPassword = watch("password", "");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // -- Trainer referral search state --
  const [referralQuery, setReferralQuery] = useState("");
  const [trainerResults, setTrainerResults] = useState<TrainerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [confirmedTrainer, setConfirmedTrainer] = useState<TrainerSearchResult | null>(null);
  const referralContainerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(referralQuery, 350);

  useEffect(() => {
    if (confirmedTrainer) return;
    if (debouncedQuery.trim().length < 2) {
      setTrainerResults([]);
      setShowResults(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    searchTrainersByName(debouncedQuery).then((result) => {
      if (cancelled) return;
      setIsSearching(false);
      if (result.ok) {
        setTrainerResults(result.value);
        setShowResults(true);
      }
    });

    return () => { cancelled = true; };
  }, [debouncedQuery, confirmedTrainer]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (referralContainerRef.current && !referralContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectTrainer(trainer: TrainerSearchResult) {
    setConfirmedTrainer(trainer);
    setReferralQuery("");
    setShowResults(false);
    setValue("referredByCode", `trainer:${trainer.id}`);
  }

  function clearTrainer() {
    setConfirmedTrainer(null);
    setReferralQuery("");
    setValue("referredByCode", "");
  }

  // Cuando el dialog se cierra, reseteamos el form
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset();
      setReferralQuery("");
      setConfirmedTrainer(null);
      setTrainerResults([]);
      setShowResults(false);
      onClose();
    }
  }

  async function onSubmit(data: RegisterFormValues) {
    // Construimos FormData: registerUser() espera FormData, no un objeto plano
    const email = data.email.trim().toLowerCase();
    const fd = new FormData();
    fd.set("name", data.name.trim());
    fd.set("email", email);
    fd.set("password", data.password);
    fd.set("role", selectedRole);
    if (data.referredByCode) fd.set("referredByCode", data.referredByCode);

    const result = await registerUser(fd);

    if (!result.ok) {
      toast.error(result.error?.message ?? "No se pudo crear la cuenta. Reintentá.");
      return;
    }

    // Auto-login con las credenciales recién creadas — entra directo a la app
    // sin esperar el link mágico de verificación.
    const signInResult = await signIn("credentials", {
      email,
      password: data.password,
      redirect: false,
    });

    if (!signInResult || signInResult.error) {
      // Fallback: cuenta creada pero auto-login falló. Cerramos el dialog
      // y dejamos que el usuario ingrese manualmente.
      toast.success("Cuenta creada. Ingresá con tu email y contraseña.");
      reset();
      onClose();
      return;
    }

    toast.success("¡Bienvenido a Blackline Fitness!");
    reset();
    onClose();
    router.push("/inicio");
    router.refresh();
  }

  const roleLabel = selectedRole === "TRAINER" ? "Entrenador/a" : "Cliente";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
          <DialogHeader>
              {/* Badge del rol seleccionado */}
              <div className="mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2.5 py-0.5 text-xs font-medium text-[#3B82F6]">
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
                  autoFocus
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
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputClassName} pr-10`}
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
                {/* Strength meter */}
                {watchedPassword.length > 0 && (() => {
                  const strength = getPasswordStrength(watchedPassword);
                  return (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                              i < strength.score ? strength.segmentColor : "bg-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${strength.labelColor}`}>
                        {strength.label}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-sm font-medium text-[#FAFAFA]"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repetí tu contraseña"
                    className={`${inputClassName} pr-10`}
                    aria-invalid={!!errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Código de referencia (solo trainers) */}
              {selectedRole === "TRAINER" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-referral"
                    className="block text-sm font-medium text-[#FAFAFA]"
                  >
                    ¿Quién te refirió? <span className="text-[#71717A] font-normal">(opcional)</span>
                  </label>

                  {confirmedTrainer ? (
                    <div className="flex items-center gap-3 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/5 px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/20 text-xs font-semibold text-[#3B82F6]">
                        {confirmedTrainer.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#FAFAFA] truncate">{confirmedTrainer.name}</p>
                        {confirmedTrainer.specialty && (
                          <p className="text-xs text-[#71717A] truncate">{confirmedTrainer.specialty}</p>
                        )}
                      </div>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3B82F6]" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={clearTrainer}
                        className="shrink-0 rounded p-0.5 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                        aria-label="Quitar entrenador seleccionado"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div ref={referralContainerRef} className="relative">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" aria-hidden="true" />
                        <input
                          id="reg-referral"
                          type="text"
                          placeholder="Buscá por nombre del entrenador"
                          className={`${inputClassName} pl-9`}
                          value={referralQuery}
                          onChange={(e) => {
                            setReferralQuery(e.target.value);
                          }}
                          onFocus={() => {
                            if (trainerResults.length > 0 || debouncedQuery.trim().length >= 2) setShowResults(true);
                          }}
                          autoComplete="off"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#71717A]" aria-hidden="true" />
                        )}
                      </div>

                      {showResults && trainerResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#3F3F46] bg-[#27272A] shadow-xl">
                          <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
                            Seleccioná tu entrenador
                          </p>
                          {trainerResults.map((trainer) => (
                            <button
                              key={trainer.id}
                              type="button"
                              onClick={() => selectTrainer(trainer)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#3F3F46]/50 first:rounded-t-lg last:rounded-b-lg"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3F3F46] text-xs font-semibold text-[#D4D4D8]">
                                {trainer.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#FAFAFA] truncate">{trainer.name}</p>
                                <p className="text-xs text-[#71717A] truncate">
                                  {trainer.tradeName && trainer.tradeName !== trainer.name
                                    ? trainer.tradeName
                                    : trainer.specialty || "Entrenador"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {showResults && trainerResults.length === 0 && !isSearching && debouncedQuery.trim().length >= 2 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#3F3F46] bg-[#27272A] px-3 py-3 shadow-xl">
                          <p className="text-center text-xs text-[#71717A]">
                            No se encontró ningún entrenador con ese nombre.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* Botón de submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors underline-offset-4 hover:underline"
              >
                Ingresá
              </button>
            </p>
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
          <h1 className="text-2xl font-bold text-[#FAFAFA]">Bienvenido a Blackline Fitness</h1>
          <p className="text-sm text-[#71717A]">
            Seleccioná tu perfil para empezar
          </p>
        </div>

        {/* Tarjeta de rol — solo Entrenador/a */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openRegister("TRAINER")}
            className="group flex w-full max-w-xs cursor-pointer flex-col items-start gap-3 rounded-xl border border-[#3F3F46] p-4 text-left transition-all hover:border-[#3B82F6] focus-visible:border-[#3B82F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18181B]"
            style={{ borderLeftWidth: "3px", borderLeftColor: "#3B82F6" }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] transition-colors group-hover:bg-[#3B82F6]/20">
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#FAFAFA]">Entrenador/a</p>
              <p className="text-xs text-[#71717A]">
                Gestioná clientes y creá rutinas
              </p>
            </div>
          </button>
        </div>

        {/* Info para clientes nuevos (sin link — solo informativo) */}
        <p className="text-center text-xs text-[#71717A]">
          ¿Sos cliente nuevo? Pedile a tu coach que te agregue.
        </p>

        {/* Único enlace al login — sirve para coach y cliente con cuenta */}
        <p className="text-center text-sm text-[#71717A]">
          ¿Ya tenés cuenta?{" "}
          <button
            type="button"
            onClick={openLogin}
            className="font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors underline-offset-4 hover:underline"
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
  return <ProdHub />;
}
