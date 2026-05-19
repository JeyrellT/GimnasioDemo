"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/offline/db";
import { NotasClient } from "./notas-client";

export default function NotasPageContent({ clientId }: { clientId: string }) {
  const [initialNotes, setInitialNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    db.demoTrainerClients
      .where({ clientUserId: clientId })
      .first()
      .then((link) => {
        if (!link) {
          setNotFound(true);
        } else {
          setInitialNotes(link.notesPrivate ?? "");
        }
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (notFound || initialNotes === null) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[#71717A]">
        Cliente no encontrado.
      </div>
    );
  }

  return <NotasClient clientId={clientId} initialNotes={initialNotes} />;
}
