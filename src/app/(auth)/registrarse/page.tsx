import { redirect } from "next/navigation";

// Registration now lives inside the /ingresar hub as a Dialog.
// Redirect any direct visits to the unified entry point.
export default function RegistrarsePage() {
  redirect("/ingresar");
}
