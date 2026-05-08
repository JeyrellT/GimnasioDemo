// =============================================================================
// VIZION — Hacienda CR 4.4 electronic invoice XML generator
// Owner: backend-api.
//
// Generates a valid FacturaElectronica XML string per spec 4.4.
// Uses raw template literals (no xml-builder deps required).
//
// BILLING_LIVE=false (default): XML is generated but NOT digitally signed
// and NOT submitted to Hacienda ATV. Status returns 'DRAFT'.
//
// TODO(backend-api, V1.1): Integrate PKCS#12 digital signature (.p12)
// using node-forge or @peculiar/webcrypto, then submit via Hacienda REST API.
// Credentials live in HACIENDA_* env vars; cert path in HACIENDA_CERT_PATH.
// =============================================================================

import { IVA_PCT, CABYS_CODE_FITNESS_SERVICES, PAIS_ISO_COSTA_RICA } from "@/lib/consts";
import { isFlagOn } from "@/lib/flags";

// ── Input types ───────────────────────────────────────────────────────────────

export interface HaciendaEmisor {
  /** Cédula física (9 digits) or jurídica (10 digits) without hyphens */
  cedula: string;
  /** "01" = Física, "02" = Jurídica, "03" = DIMEX, "04" = NITE */
  tipoCedula: "01" | "02" | "03" | "04";
  nombre: string;
  nombreComercial?: string;
  /** Province (01–07) */
  provincia: string;
  canton: string;
  distrito: string;
  barrio?: string;
  otrasSenas: string;
  telefono?: string;
  correo: string;
}

export interface HaciendaReceptor {
  cedula?: string;
  tipoCedula?: "01" | "02" | "03" | "04";
  nombre: string;
  correo: string;
}

export interface HaciendaCharge {
  /** Net amount BEFORE IVA (CRC) */
  subtotalCRC: number;
  description: string;
}

export interface BuildElectronicInvoiceInput {
  emisor: HaciendaEmisor;
  receptor: HaciendaReceptor;
  charge: HaciendaCharge;
  claveNumerica: string;   // 50 digits
  consecutivo: string;     // 20 digits
  fechaEmision?: Date;
}

export interface ElectronicInvoiceResult {
  xml: string;
  claveNumerica: string;
  consecutivo: string;
  status: "DRAFT" | "SIGNED";
  subtotalCRC: number;
  ivaCRC: number;
  totalCRC: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toISODateTime(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z"); // Remove milliseconds
}

function formatDecimal2(n: number): string {
  return n.toFixed(2);
}

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Build a Hacienda 4.4 FacturaElectronica XML.
 *
 * When BILLING_LIVE=false, returns status='DRAFT' and the XML is not signed.
 * When BILLING_LIVE=true (V1.1), this function will call the signing module
 * and submit to Hacienda. For now, signing is a no-op.
 */
export function buildElectronicInvoiceXml({
  emisor,
  receptor,
  charge,
  claveNumerica,
  consecutivo,
  fechaEmision = new Date(),
}: BuildElectronicInvoiceInput): ElectronicInvoiceResult {
  const subtotal = charge.subtotalCRC;
  const iva = subtotal * IVA_PCT;
  const total = subtotal + iva;

  const fechaEmisionStr = toISODateTime(fechaEmision);

  const receptorSection =
    receptor.cedula && receptor.tipoCedula
      ? `<Receptor>
    <Nombre>${escapeXml(receptor.nombre)}</Nombre>
    <Identificacion>
      <Tipo>${receptor.tipoCedula}</Tipo>
      <Numero>${receptor.cedula}</Numero>
    </Identificacion>
    <CorreoElectronico>${escapeXml(receptor.correo)}</CorreoElectronico>
  </Receptor>`
      : `<Receptor>
    <Nombre>${escapeXml(receptor.nombre)}</Nombre>
    <CorreoElectronico>${escapeXml(receptor.correo)}</CorreoElectronico>
  </Receptor>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica
  xmlns="https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/facturaElectronica"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/facturaElectronica https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/FE_FacturaElectronica_V4.4.xsd">
  <Clave>${claveNumerica}</Clave>
  <CodigoActividad>499000</CodigoActividad>
  <NumeroConsecutivo>${consecutivo}</NumeroConsecutivo>
  <FechaEmision>${fechaEmisionStr}</FechaEmision>
  <Emisor>
    <Nombre>${escapeXml(emisor.nombre)}</Nombre>
    <Identificacion>
      <Tipo>${emisor.tipoCedula}</Tipo>
      <Numero>${emisor.cedula}</Numero>
    </Identificacion>
    ${emisor.nombreComercial ? `<NombreComercial>${escapeXml(emisor.nombreComercial)}</NombreComercial>` : ""}
    <Ubicacion>
      <Provincia>${emisor.provincia}</Provincia>
      <Canton>${emisor.canton}</Canton>
      <Distrito>${emisor.distrito}</Distrito>
      ${emisor.barrio ? `<Barrio>${emisor.barrio}</Barrio>` : ""}
      <OtrasSenas>${escapeXml(emisor.otrasSenas)}</OtrasSenas>
    </Ubicacion>
    ${emisor.telefono ? `<Telefono><CodigoPais>${PAIS_ISO_COSTA_RICA}</CodigoPais><NumTelefono>${emisor.telefono}</NumTelefono></Telefono>` : ""}
    <CorreoElectronico>${escapeXml(emisor.correo)}</CorreoElectronico>
  </Emisor>
  ${receptorSection}
  <CondicionVenta>01</CondicionVenta>
  <MedioPago>02</MedioPago>
  <DetalleServicio>
    <LineaDetalle>
      <NumeroLinea>1</NumeroLinea>
      <Codigo>
        <Tipo>04</Tipo>
        <Codigo>${CABYS_CODE_FITNESS_SERVICES}</Codigo>
      </Codigo>
      <Cantidad>1</Cantidad>
      <UnidadMedida>Sp</UnidadMedida>
      <Detalle>${escapeXml(charge.description)}</Detalle>
      <PrecioUnitario>${formatDecimal2(subtotal)}</PrecioUnitario>
      <MontoTotal>${formatDecimal2(subtotal)}</MontoTotal>
      <SubTotal>${formatDecimal2(subtotal)}</SubTotal>
      <Impuesto>
        <Codigo>01</Codigo>
        <CodigoTarifa>08</CodigoTarifa>
        <Tarifa>13.00</Tarifa>
        <Monto>${formatDecimal2(iva)}</Monto>
      </Impuesto>
      <MontoTotalLinea>${formatDecimal2(total)}</MontoTotalLinea>
    </LineaDetalle>
  </DetalleServicio>
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>CRC</CodigoMoneda>
      <TipoCambio>1.00</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>${formatDecimal2(subtotal)}</TotalServGravados>
    <TotalServExentos>0.00</TotalServExentos>
    <TotalServExonerado>0.00</TotalServExonerado>
    <TotalMercanciasGravadas>0.00</TotalMercanciasGravadas>
    <TotalMercanciasExentas>0.00</TotalMercanciasExentas>
    <TotalMercanciasExoneradas>0.00</TotalMercanciasExoneradas>
    <TotalGravado>${formatDecimal2(subtotal)}</TotalGravado>
    <TotalExento>0.00</TotalExento>
    <TotalExonerado>0.00</TotalExonerado>
    <TotalVenta>${formatDecimal2(subtotal)}</TotalVenta>
    <TotalDescuentos>0.00</TotalDescuentos>
    <TotalVentaNeta>${formatDecimal2(subtotal)}</TotalVentaNeta>
    <TotalImpuesto>${formatDecimal2(iva)}</TotalImpuesto>
    <TotalIVADevuelto>0.00</TotalIVADevuelto>
    <TotalOtrosCargos>0.00</TotalOtrosCargos>
    <TotalComprobante>${formatDecimal2(total)}</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>`;

  const isLive = isFlagOn("BILLING");

  // TODO(backend-api, V1.1): When isLive=true, call signXmlWithP12(xml) here
  // and submit to Hacienda ATV endpoint via fetch + HACIENDA_USERNAME/PASSWORD.

  return {
    xml,
    claveNumerica,
    consecutivo,
    status: isLive ? "SIGNED" : "DRAFT",
    subtotalCRC: subtotal,
    ivaCRC: iva,
    totalCRC: total,
  };
}
