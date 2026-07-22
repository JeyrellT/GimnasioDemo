# Assistant store — persistencia y sticky client (Fase 4)

## Persistencia en IndexedDB

El store del asistente IA usa el middleware `persist` de Zustand con un adapter custom (`src/lib/storage/idb-storage.ts`) que graba en IndexedDB.

- **DB name:** `blackline-assistant`
- **Store name:** `state`
- **Key:** `blackline-assistant-conv-v1`
- **Version:** 1 (bumpear en `assistant-store.ts` si cambia la shape de manera incompatible)

### Qué se persiste

Solo los campos que sobreviven a un refresh (`partialize`):
- `messages` — historial completo, incluidos los attachments comprimidos como base64.
- `stickyClient` — { clientId, name } del cliente activo.

**No** se persiste:
- `pendingAttachments` (transient — pre-envío).
- `isThinking`, `pendingConfirmation`, `lastError` (estado de vida de un turn).

### Cómo borrar la conversación persistida

- Desde la UI: botón "Nueva conversación" en el header.
- Desde DevTools: Application → IndexedDB → `blackline-assistant` → eliminar la base.
- Programáticamente: `useAssistantStore.persist.clearStorage()`.

## Sticky client

Cuando el coach selecciona un cliente activo desde el badge en el header, el agent-runtime inyecta un sufijo en el system instruction:

```
CONTEXTO ACTIVO DE LA SESIÓN:
El coach está trabajando con el cliente "<name>" (clientId="<id>", clientUserId="<id>").
Cuando una herramienta acepte clientId o clientUserId y el coach no especifique
otro cliente, usá este como default.
Si el coach menciona otro cliente por nombre, NO uses este — resolvé el otro
con list_my_clients primero.
```

El modelo respeta esto en cualquier tool que acepte `clientId` / `clientUserId`:
- `get_client_profile`
- `record_body_metric`
- `assign_routine_to_client`

El sticky **sobrevive a refresh** (se persiste con la conversación) y a "Nueva conversación" (intencionalmente — el coach suele seguir trabajando con el mismo cliente). Para limpiarlo: clic en la X del badge.

## Compresión de imágenes

`src/lib/storage/compress-image.ts` se ejecuta en `addAttachment` antes de guardar en `pendingAttachments`:

- Si la imagen pesa ≤ 500KB → pasa sin tocar.
- Si la dimensión más larga > 1500px → resize manteniendo aspect ratio.
- Re-encode como JPEG q0.85 (PNG queda PNG para preservar alpha).
- Fallback graceful si `createImageBitmap` falla (HEIC en Chrome/Firefox).

Resultado típico: foto de iPhone (12MP, ~4MB) → ~200-400KB.
