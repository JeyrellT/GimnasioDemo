"use client";

// =============================================================================
// BLACKLINE FITNESS — ExerciseForm
// Shared create/edit form for exercises. Uses react-hook-form + zodResolver.
//
// Left column:  text fields, select, radio, textarea, URL fields.
// Right column: BodyMapPicker (primary + secondary muscles).
//
// On submit:
//   - Creating: calls createPrivateExercise server action
//   - Editing:  calls updateExercise server action (Agent 4 owns this action)
// =============================================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { MuscleGroup, ExerciseEquipment, ExerciseDifficulty } from "@prisma/client";

import { createPrivateExercise, updateExercise } from "@/app/actions/exercises";
import { BodyMapPicker } from "@/components/charts/body-map-picker";
import { ExerciseMediaUpload } from "@/components/forms/exercise-media-upload";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// `updateExercise` and `createPrivateExercise` are imported statically above.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MUSCLE_GROUP_VALUES = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "ABS",
  "OBLIQUES",
  "GLUTES",
  "QUADS",
  "HAMSTRINGS",
  "CALVES",
  "NECK",
  "FULL_BODY",
] as const satisfies readonly MuscleGroup[];

const EQUIPMENT_VALUES = [
  "BODYWEIGHT",
  "BARBELL",
  "DUMBBELL",
  "KETTLEBELL",
  "MACHINE",
  "CABLE",
  "BAND",
  "OTHER",
] as const satisfies readonly ExerciseEquipment[];

const DIFFICULTY_VALUES = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
] as const satisfies readonly ExerciseDifficulty[];

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  BODYWEIGHT: "Peso corporal",
  BARBELL: "Barra",
  DUMBBELL: "Mancuerna",
  KETTLEBELL: "Kettlebell",
  MACHINE: "Máquina",
  CABLE: "Cable",
  BAND: "Banda",
  OTHER: "Otro",
};

export const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const exerciseFormSchema = z.object({
  nameEs: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  instructionsEs: z
    .string()
    .trim()
    .min(10, "Describí con al menos 10 caracteres")
    .max(3000),
  primaryMuscle: z.enum(MUSCLE_GROUP_VALUES, {
    required_error: "Seleccioná el músculo principal en el mapa",
  }),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUP_VALUES)).max(5),
  equipment: z.enum(EQUIPMENT_VALUES, {
    required_error: "Seleccioná el equipo",
  }),
  difficulty: z.enum(DIFFICULTY_VALUES, {
    required_error: "Seleccioná la dificultad",
  }),
  thumbnailUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  gifUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  mediaUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExerciseData {
  id: string;
  nameEs: string;
  nameEn: string | null;
  instructionsEs: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: ExerciseEquipment;
  difficulty: ExerciseDifficulty;
  thumbnailUrl: string | null;
  gifUrl: string | null;
  mediaUrl: string | null;
}

export interface ExerciseFormProps {
  exercise: ExerciseData | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExerciseForm({ exercise }: ExerciseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: exercise
      ? {
          nameEs: exercise.nameEs,
          instructionsEs: exercise.instructionsEs,
          primaryMuscle: exercise.primaryMuscle,
          secondaryMuscles: exercise.secondaryMuscles,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          thumbnailUrl: exercise.thumbnailUrl ?? "",
          gifUrl: exercise.gifUrl ?? "",
          mediaUrl: exercise.mediaUrl ?? "",
        }
      : {
          nameEs: "",
          instructionsEs: "",
          secondaryMuscles: [],
          thumbnailUrl: "",
          gifUrl: "",
          mediaUrl: "",
        },
  });

  function onSubmit(values: ExerciseFormValues) {
    startTransition(async () => {
      const payload = {
        nameEs: values.nameEs,
        instructionsEs: values.instructionsEs,
        primaryMuscle: values.primaryMuscle,
        secondaryMuscles: values.secondaryMuscles,
        equipment: values.equipment,
        difficulty: values.difficulty,
        // Normalize empty string → undefined so actions see clean optionals
        thumbnailUrl: values.thumbnailUrl || undefined,
        gifUrl: values.gifUrl || undefined,
        mediaUrl: values.mediaUrl || undefined,
      };

      if (exercise) {
        // Edit path — updateExercise is provided by Agent 4
        const result = await updateExercise({ id: exercise.id, ...payload });
        if (!result.ok) {
          toast.error(result.error.message ?? "No se pudo actualizar el ejercicio.");
          return;
        }
        toast.success("Ejercicio actualizado.");
        router.push(`/trainer/ejercicios/${exercise.id}`);
      } else {
        // Create path
        const result = await createPrivateExercise(payload);
        if (!result.ok) {
          toast.error(result.error.message ?? "No se pudo crear el ejercicio.");
          return;
        }
        toast.success("Ejercicio creado.");
        router.push(`/trainer/ejercicios/${result.value.exerciseId}`);
      }
    });
  }

  // Watch muscles for BodyMapPicker — these live outside RHF native inputs
  const primaryMuscle = form.watch("primaryMuscle") ?? null;
  const secondaryMuscles = form.watch("secondaryMuscles") ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ─── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="nameEs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Press de banca con barra"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipo */}
            <FormField
              control={form.control}
              name="equipment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná el equipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EQUIPMENT_VALUES.map((eq) => (
                        <SelectItem key={eq} value={eq}>
                          {EQUIPMENT_LABELS[eq]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dificultad */}
            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dificultad</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-6"
                    >
                      {DIFFICULTY_VALUES.map((d) => (
                        <div key={d} className="flex items-center gap-2">
                          <RadioGroupItem value={d} id={`difficulty-${d}`} />
                          <Label
                            htmlFor={`difficulty-${d}`}
                            className="cursor-pointer text-sm text-[#A1A1AA] font-normal"
                          >
                            {DIFFICULTY_LABELS[d]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Instrucciones */}
            <FormField
              control={form.control}
              name="instructionsEs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrucciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describí la técnica correcta, posición inicial, movimiento y puntos clave de seguridad..."
                      rows={6}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GIF URL */}
            <FormField
              control={form.control}
              name="gifUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    GIF URL{" "}
                    <span className="text-[#71717A] font-normal">(opcional — URL directa o Google Drive)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://drive.google.com/file/d/..."
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video URL */}
            <FormField
              control={form.control}
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Video URL{" "}
                    <span className="text-[#71717A] font-normal">
                      (opcional — YouTube / Vimeo / Google Drive)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://drive.google.com/file/d/... o YouTube"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Thumbnail — drag & drop image upload (Agent 3's component) */}
            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Foto del ejercicio{" "}
                    <span className="text-[#71717A] font-normal">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <ExerciseMediaUpload
                      exerciseId={exercise?.id ?? null}
                      initialThumbnailUrl={field.value || null}
                      onUploaded={(url) =>
                        form.setValue("thumbnailUrl", url, { shouldDirty: true })
                      }
                      onDeleted={() =>
                        form.setValue("thumbnailUrl", "", { shouldDirty: true })
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ─── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#FAFAFA]">
                Músculos trabajados
              </h2>
              <p className="text-xs text-[#71717A] mt-0.5">
                Seleccioná el músculo principal y los secundarios en el mapa.
              </p>
            </div>

            {/* primaryMuscle validation error surfaces here (outside FormField) */}
            {form.formState.errors.primaryMuscle && (
              <p className="text-sm font-medium text-[#EF4444]">
                {form.formState.errors.primaryMuscle.message}
              </p>
            )}

            <BodyMapPicker
              primaryMuscle={primaryMuscle}
              secondaryMuscles={secondaryMuscles}
              onPrimaryChange={(muscle) => {
                // muscle can be null (deselect). RHF enum field can't hold null,
                // so we reset to undefined to trigger required_error on submit.
                if (muscle === null) {
                  form.resetField("primaryMuscle");
                } else {
                  form.setValue("primaryMuscle", muscle, { shouldValidate: true });
                }
              }}
              onSecondaryChange={(muscles) => {
                form.setValue("secondaryMuscles", muscles, { shouldValidate: true });
              }}
            />
          </div>
        </div>

        {/* ─── SUBMIT ────────────────────────────────────────────────────── */}
        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="min-w-[160px] bg-[#FF6A1A] hover:bg-[#E55A0E] text-white font-semibold disabled:opacity-60"
          >
            {isPending
              ? exercise
                ? "Guardando..."
                : "Creando..."
              : exercise
                ? "Guardar cambios"
                : "Crear ejercicio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
