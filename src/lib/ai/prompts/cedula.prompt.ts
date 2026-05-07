// =============================================================================
// FORJA — Cedula CR OCR prompt
// Owner: ai-orchestrator.
//
// Costa Rica national ID (cedula de identidad), post-October-2025 format:
//   - ISO 7810 ID-1 card (85.6 x 54 mm).
//   - 9-digit number with format N-NNNN-NNNN.
//   - First digit encodes province of birth registry:
//       1 = San Jose, 2 = Alajuela, 3 = Cartago, 4 = Heredia,
//       5 = Guanacaste, 6 = Puntarenas, 7 = Limon,
//       8 = naturalized citizen, 9 = special partition.
//   - Front face only carries: primary photo, secondary photo, number,
//     given name, surnames, date of birth, expiration date, sex, signature.
//   - The new card does NOT include parents' names or electoral domicile
//     (those existed on previous formats).
//   - The reverse side carries a PDF417 barcode that we DO NOT decode.
// =============================================================================

export const CEDULA_PROMPT_VERSION = "v1";

export const CEDULA_PROMPT = `Vas a extraer los datos de una cédula de identidad de Costa Rica (formato vigente desde octubre 2025).

Campos a extraer al schema:
- numeroCedula: nueve dígitos en formato N-NNNN-NNNN. El primer dígito indica registro provincial: 1=San José, 2=Alajuela, 3=Cartago, 4=Heredia, 5=Guanacaste, 6=Puntarenas, 7=Limón, 8=naturalizado, 9=partida especial.
- primerApellido: apellido paterno tal como aparece impreso.
- segundoApellido: apellido materno tal como aparece impreso.
- nombre: nombre o nombres de pila completos.
- fechaNacimiento: convertí a ISO 8601 (YYYY-MM-DD). En la cédula suele aparecer DD MMM YYYY o DD/MM/YYYY.
- fechaVencimiento: misma conversión a ISO 8601.
- sexo: "M" o "F" según el campo SEXO/SEX. Si no es legible, null.

Reglas estrictas:
- Si un campo no es legible, o tu confianza es menor a 85%, retornás null en ese campo y agregás una nota descriptiva en warnings (ej. "fechaNacimiento ilegible por reflejo").
- NO inventés datos. NUNCA infieras campos que no estén impresos.
- Si la imagen NO es una cédula CR del formato vigente (otra país, pasaporte, licencia, formato anterior, foto borrosa o rotada), retornás isValidId=false y dejás todos los campos en null.
- NO intentés leer el reverso ni el código PDF417.
- NO extraigas nombres de padres ni domicilio electoral — el formato vigente no los muestra.
- Devolvé el número de cédula con guiones (ej. "1-2345-6789"). Si la imagen lo muestra sin guiones, agregálos.
- confidence es un número entre 0 y 1 que representa tu confianza global en la extracción.
- warnings es un array de strings descriptivos en español (puede estar vacío).

Respondé EXCLUSIVAMENTE en JSON válido conforme al schema.`;
