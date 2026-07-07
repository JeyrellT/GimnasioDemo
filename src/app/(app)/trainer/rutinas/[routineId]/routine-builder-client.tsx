"use client";

import { useEffect } from "react";
import { RoutineBuilder } from "@/components/forms/routine-builder";
import { useRoutineBuilderStore } from "@/stores/routine-builder-store";
import type { RoutineWithDays } from "@/types/domain";

interface RoutineBuilderClientProps {
  routine: RoutineWithDays;
  assignedRoutineId?: string;
}

export function RoutineBuilderClient({
  routine,
  assignedRoutineId,
}: RoutineBuilderClientProps) {
  const initFromExisting = useRoutineBuilderStore((s) => s.initFromExisting);

  useEffect(() => {
    initFromExisting(routine);
  }, [routine, initFromExisting]);

  return <RoutineBuilder routineId={routine.id} assignedRoutineId={assignedRoutineId} />;
}
