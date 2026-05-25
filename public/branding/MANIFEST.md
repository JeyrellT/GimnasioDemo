# Branding Assets Manifest

Generated for the Blackline Fitness branding migration.
Source: Claude Design exports (`~/Desktop/assets` + `~/Desktop/uploads`).
Target: `public/branding/` (served as `/branding/...` at runtime).

Canonical asset paths consumed by the app live in
`src/branding/assets.ts` — keep filenames in sync with that module.

## Criticos (referenciados por el codigo)

| Archivo                | Bytes   | Uso                               |
| ---------------------- | ------- | --------------------------------- |
| `logo-transparent.png` | 425,395 | nav + footer + phone preview logo |
| `exercise-1.png`       | 460,905 | phone preview card 1              |
| `exercise-2.png`       | 463,379 | phone preview card 2              |
| `exercise-3.png`       | 456,298 | phone preview card 3              |
| `exercise-4.png`       | 464,552 | phone preview card 4              |

## Adicionales (disponibles, no usados aun)

| Archivo                                  | Bytes   | Notas                                                                  |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `logo-solid.png`                         | 573,745 | Variante del logo (fondo solido). Renombrado desde `assets/logo.png`.  |
| `uploads/logo-1779728507008.png`         | 573,745 | Duplicado byte-a-byte de `logo-solid.png` (verificado con `cmp`).      |
| `uploads/pasted-1779727852342-0.png`     | 47,679  | Captura sin clasificar.                                                |
| `uploads/pasted-1779727880778-0.png`     | 51,615  | Captura sin clasificar.                                                |
| `uploads/pasted-1779727900929-0.png`     | 14,736  | Captura sin clasificar.                                                |
| `uploads/pasted-1779734964398-0.png`     | 20,320  | Captura sin clasificar.                                                |
| `uploads/pasted-1779735058656-0.png`     | 9,046   | Captura sin clasificar.                                                |
| `uploads/pasted-1779735076365-0.png`     | 3,613   | Captura sin clasificar (mas chica del set).                            |
| `uploads/pasted-1779735138520-0.png`     | 72,821  | Captura sin clasificar.                                                |
| `uploads/pasted-1779735251346-0.png`     | 53,844  | Captura sin clasificar.                                                |
| `uploads/pasted-1779735840459-0.png`     | 163,325 | Captura sin clasificar.                                                |
| `uploads/pasted-1779735894001-0.png`     | 98,035  | Captura sin clasificar.                                                |
| `uploads/pasted-1779735941948-0.png`     | 278,451 | Captura sin clasificar (la mas grande del set).                        |
| `uploads/pasted-1779736159175-0.png`     | 12,322  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736209844-0.png`     | 84,701  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736240422-0.png`     | 10,546  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736398257-0.png`     | 120,650 | Captura sin clasificar.                                                |
| `uploads/pasted-1779736523709-0.png`     | 12,489  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736579308-0.png`     | 80,738  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736638099-0.png`     | 85,244  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736652487-0.png`     | 49,753  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736702721-0.png`     | 125,887 | Captura sin clasificar.                                                |
| `uploads/pasted-1779736755035-0.png`     | 67,295  | Captura sin clasificar.                                                |
| `uploads/pasted-1779736831194-0.png`     | 22,181  | Captura sin clasificar.                                                |

## Ignorados en origen

Estos archivos venian en `~/Desktop/assets/` pero son duplicados exactos
(verificado con `cmp` byte-a-byte) y no se copiaron:

- `ex-1.png` == `exercise-1.png`
- `ex-2.png` == `exercise-2.png`
- `ex-3.png` == `exercise-3.png`
- `ex-4.png` == `exercise-4.png`

## Total

- **29 archivos PNG** (6 en raiz de `public/branding/`, 23 en `uploads/`).
- **4,903,310 bytes** (~4.68 MB).
- 1 duplicado conocido entre raiz y uploads: `logo-solid.png` <-> `uploads/logo-1779728507008.png`.
