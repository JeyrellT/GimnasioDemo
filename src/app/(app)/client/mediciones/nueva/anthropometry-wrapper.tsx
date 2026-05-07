"use client";

import { useRouter } from "next/navigation";
import { AnthropometryForm } from "@/components/forms/anthropometry-form";

interface Props {
  ageYears: number;
}

export function AnthropometryFormWrapper({ ageYears }: Props) {
  const router = useRouter();
  return (
    <AnthropometryForm
      ageYears={ageYears}
      onSuccess={() => router.push("/client/mediciones")}
    />
  );
}
