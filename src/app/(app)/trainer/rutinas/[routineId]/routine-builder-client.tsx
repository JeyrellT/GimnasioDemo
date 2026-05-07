"use client";

import { useEffect } from "react";
import { RoutineBuilder } from "@/components/forms/routine-builder";
import { useRoutineBuilderStore } from "@/stores/routine-builder-store";
import type { RoutineWithDays } from "@/types/domain";

interface RoutineBuilderClientProps {
  routine: RoutineWithDays;
}

export function RoutineBuilderClient({ routine }: RoutineBuilderClientProps) {
  const initFromExisting = useRoutineBuilderStore((s) => s.initFromExisting);

  useEffect(() => {
    initFromExisting(routine);
  }, [routine, initFromExisting]);

  return <RoutineBuilder routineId={routine.id} />;
}
