/**
 * Captura de pantallas de toda la app — material visual para marketing.
 *
 * Uso (PowerShell):
 *   $env:CAPTURE_COACH_EMAIL="jorgeheadcoachcr@gmail.com"
 *   $env:CAPTURE_COACH_PASSWORD="<la contraseña>"
 *   $env:CAPTURE_CLIENT_EMAIL="geovannynunez16@gmail.com"
 *   $env:CAPTURE_CLIENT_PASSWORD="<la contraseña>"
 *   node scripts/capturar-pantallas.mjs
 *
 * Las contraseñas se leen SOLO de variables de entorno: no se escriben en el
 * archivo ni quedan en el historial del repo. Podés capturar un solo rol
 * dejando el otro par de variables sin definir.
 *
 * Salida: carpeta `capturas/` con esta estructura, y un zip al final.
 *
 *   capturas/
 *     01-publico/escritorio/*.png     <- no necesita login
 *     01-publico/celular/*.png
 *     02-coach/escritorio/*.png
 *     02-coach/celular/*.png
 *     03-cliente/escritorio/*.png
 *     03-cliente/celular/*.png
 *
 * Nota: las capturas son de PRODUCCIÓN, así que pueden contener nombres y
 * correos de clientes reales. Revisalas antes de compartirlas.
 */

import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE =
	process.env.CAPTURE_BASE_URL ??
	"https://gimnasiodemo-production-f90a.up.railway.app";
const OUT = path.resolve("capturas");

const VIEWPORTS = [
	{ nombre: "escritorio", width: 1440, height: 900, isMobile: false },
	{ nombre: "celular", width: 390, height: 844, isMobile: true },
];

/** Rutas públicas — no requieren sesión. */
// `/registrarse` no se captura: redirige a `/ingresar` porque el registro vive
// como diálogo dentro de esa misma pantalla.
const PUBLICAS = [
	["01-landing", "/"],
	["02-ingresar", "/ingresar"],
	["03-precios", "/pricing"],
	["04-recuperar-clave", "/recuperar"],
];

/** Rutas del coach. */
const COACH = [
	["01-inicio", "/inicio"],
	["02-clientes", "/trainer/clientes"],
	["03-invitar-cliente", "/trainer/clientes/invitar"],
	["04-rutinas", "/trainer/rutinas"],
	["05-rutina-nueva", "/trainer/rutinas/nueva"],
	["06-importar-rutina-con-foto", "/trainer/rutinas/importar"],
	["07-ejercicios", "/trainer/ejercicios"],
	["08-ejercicio-nuevo", "/trainer/ejercicios/nuevo"],
	["09-calentamientos", "/trainer/calentamientos"],
	["10-asistente-ia", "/trainer/asistente"],
	["11-finanzas", "/trainer/finanzas"],
	["12-finanzas-movimiento-nuevo", "/trainer/finanzas/nuevo"],
	["13-finanzas-ubicaciones", "/trainer/finanzas/ubicaciones"],
	["14-facturacion", "/trainer/facturacion"],
	["15-ajustes", "/trainer/ajustes"],
	["16-perfil", "/perfil"],
];

/** Rutas del cliente. */
const CLIENTE = [
	["01-inicio", "/inicio"],
	["02-mis-rutinas", "/client/rutinas"],
	["03-sesion-de-hoy", "/client/sesion"],
	["04-progreso", "/client/progreso"],
	["05-mediciones", "/client/mediciones"],
	["06-medicion-nueva", "/client/mediciones/nueva"],
	["07-fotos-de-progreso", "/client/fotos"],
	["08-mi-entrenador", "/client/entrenador"],
	["09-ajustes", "/client/ajustes"],
	["10-perfil", "/perfil"],
];

// ---------------------------------------------------------------------------
// Anonimización
// ---------------------------------------------------------------------------

/**
 * Nombres y correos ficticios que sustituyen a los reales SOLO en la imagen.
 * No se toca la base de datos: el reemplazo ocurre en el navegador, en el
 * instante previo a la captura. Los ejercicios, videos, rutinas y números
 * quedan intactos — es data real, solo cambian las identidades.
 *
 * Si aparecen más personas en las pantallas, agregalas acá.
 */
const REEMPLAZOS = [
	// --- coach ---
	["Jorge Eduardo Umaña González", "Andrés Villalobos Mora"],
	["Jorge Eduardo Umaña Gonzalez", "Andrés Villalobos Mora"],
	["Jorge Eduardo", "Andrés Villalobos"],
	["Umaña González", "Villalobos Mora"],
	["Umaña Gonzalez", "Villalobos Mora"],
	["jorgeheadcoachcr@gmail.com", "andres.coach@ejemplo.cr"],
	["Jorgecoachcr", "AndresCoachCR"],
	["jorgecoachcr", "andrescoachcr"],
	["Jorge", "Andrés"],
	// --- cliente ---
	["Geovanni Nuñez", "Mariana Solís Rojas"],
	["Geovanny Nuñez", "Mariana Solís Rojas"],
	["geovannynunez16@gmail.com", "mariana.solis@ejemplo.cr"],
	["Geovanni", "Mariana"],
	["Geovanny", "Mariana"],
	["Nuñez", "Solís"],
	// --- cuentas internas ---
	["gerencia@jcanalytic.com", "admin@ejemplo.cr"],
	["Jeyrell Tardencilla", "Sofía Ramírez"],
	["Jeyrell", "Sofía"],
	// --- número de SINPE real ---
	["7268-1035", "8888-8888"],
	["72681035", "88888888"],
];

/**
 * Sustituye identidades en el DOM antes de la captura: texto visible,
 * valores de formulario, y atributos que el navegador puede mostrar
 * (placeholder, alt, title, aria-label). Al final, cualquier correo que se
 * haya escapado se enmascara con una expresión regular.
 */
async function anonimizar(page, reemplazos) {
	await page.evaluate((pares) => {
		const aplicar = (s) => {
			if (!s) return s;
			let out = s;
			for (const [de, a] of pares) out = out.split(de).join(a);
			// Red de seguridad: cualquier correo personal que se haya escapado se
			// vuelve genérico. Los de la propia marca (@blacklinefitness.app) se
			// dejan: son públicos y forman parte de lo que queremos mostrar.
			out = out.replace(
				/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
				(correo) => {
					const c = correo.toLowerCase();
					// Ya sustituidos arriba (@ejemplo.cr) o de la propia marca: se dejan.
					if (c.endsWith("@ejemplo.cr")) return correo;
					if (c.endsWith("@blacklinefitness.app")) return correo;
					return "usuario@ejemplo.cr";
				},
			);
			return out;
		};

		// 1. Nodos de texto
		const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		const nodos = [];
		while (it.nextNode()) nodos.push(it.currentNode);
		for (const n of nodos) {
			const nuevo = aplicar(n.nodeValue);
			if (nuevo !== n.nodeValue) n.nodeValue = nuevo;
		}

		// 2. Atributos visibles y valores de formulario
		for (const el of document.querySelectorAll("*")) {
			for (const attr of [
				"placeholder",
				"alt",
				"title",
				"aria-label",
				"value",
			]) {
				const v = el.getAttribute?.(attr);
				if (v) {
					const nuevo = aplicar(v);
					if (nuevo !== v) el.setAttribute(attr, nuevo);
				}
			}
			if (
				(el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
				typeof el.value === "string"
			) {
				const nuevo = aplicar(el.value);
				if (nuevo !== el.value) el.value = nuevo;
			}
		}
	}, reemplazos);
}

// ---------------------------------------------------------------------------

async function capturar(page, carpeta, nombre, ruta) {
	const url = `${BASE}${ruta}`;
	try {
		await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
	} catch {
		// networkidle a veces no llega (polling de sesión). Con DOM basta.
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
		} catch {
			console.log(`      x ${nombre} — no cargó`);
			return false;
		}
	}
	// Deja que terminen animaciones de entrada y carga de imágenes.
	await page.waitForTimeout(2500);

	// Sustituye identidades reales JUSTO antes de disparar la foto, para que
	// ningún render posterior las vuelva a pintar.
	await anonimizar(page, REEMPLAZOS);
	await page.waitForTimeout(300);

	const destino = path.join(carpeta, `${nombre}.png`);
	await page.screenshot({ path: destino, fullPage: true });
	console.log(`      ok ${nombre}`);
	return true;
}

async function login(page, email, password) {
	await page.goto(`${BASE}/ingresar`, {
		waitUntil: "domcontentloaded",
		timeout: 45_000,
	});
	await page.waitForTimeout(2000);

	// El formulario NO está a la vista: /ingresar es un hub con dos botones y el
	// login vive dentro de un diálogo que abre el botón "Ingresá".
	const abrir = page.getByRole("button", { name: /^Ingresá$/ });
	if ((await abrir.count()) > 0) {
		await abrir.first().click();
		await page.waitForTimeout(1500);
	}

	// Se usa `autocomplete` y no `type`: el campo de contraseña alterna entre
	// type=password y type=text con el botón de mostrar/ocultar, así que el
	// selector por tipo es inestable.
	await page.locator('input[autocomplete="email"]').first().fill(email);
	await page
		.locator('input[autocomplete="current-password"]')
		.first()
		.fill(password);
	await page.getByRole("button", { name: /^Ingresar$/ }).first().click();

	// Espera a salir de /ingresar.
	try {
		await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"), {
			timeout: 30_000,
		});
	} catch {
		return false;
	}
	await page.waitForTimeout(2500);
	return true;
}

async function correrRol(browser, etiqueta, rutas, email, password) {
	if (!email || !password) {
		console.log(`\n[${etiqueta}] sin credenciales — se salta.`);
		return 0;
	}
	console.log(
		`\n[${etiqueta}] ${rutas.length} pantallas x ${VIEWPORTS.length} tamaños`,
	);
	let n = 0;

	for (const vp of VIEWPORTS) {
		const carpeta = path.join(OUT, etiqueta, vp.nombre);
		await mkdir(carpeta, { recursive: true });

		const ctx = await browser.newContext({
			viewport: { width: vp.width, height: vp.height },
			deviceScaleFactor: 2, // capturas nítidas para video
			isMobile: vp.isMobile,
			hasTouch: vp.isMobile,
			locale: "es-CR",
		});
		const page = await ctx.newPage();

		console.log(`   ${vp.nombre}: iniciando sesión…`);
		const ok = await login(page, email, password);
		if (!ok) {
			console.log(`   !! no se pudo iniciar sesión como ${email}`);
			await ctx.close();
			continue;
		}

		for (const [nombre, ruta] of rutas) {
			if (await capturar(page, carpeta, nombre, ruta)) n++;
		}
		await ctx.close();
	}
	return n;
}

async function main() {
	if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
	await mkdir(OUT, { recursive: true });

	const browser = await chromium.launch();
	let total = 0;

	// ── Públicas ─────────────────────────────────────────────────────────────
	console.log(
		`\n[01-publico] ${PUBLICAS.length} pantallas x ${VIEWPORTS.length} tamaños`,
	);
	for (const vp of VIEWPORTS) {
		const carpeta = path.join(OUT, "01-publico", vp.nombre);
		await mkdir(carpeta, { recursive: true });
		const ctx = await browser.newContext({
			viewport: { width: vp.width, height: vp.height },
			deviceScaleFactor: 2,
			isMobile: vp.isMobile,
			hasTouch: vp.isMobile,
			locale: "es-CR",
		});
		const page = await ctx.newPage();
		console.log(`   ${vp.nombre}:`);
		for (const [nombre, ruta] of PUBLICAS) {
			if (await capturar(page, carpeta, nombre, ruta)) total++;
		}
		await ctx.close();
	}

	total += await correrRol(
		browser,
		"02-coach",
		COACH,
		process.env.CAPTURE_COACH_EMAIL,
		process.env.CAPTURE_COACH_PASSWORD,
	);
	total += await correrRol(
		browser,
		"03-cliente",
		CLIENTE,
		process.env.CAPTURE_CLIENT_EMAIL,
		process.env.CAPTURE_CLIENT_PASSWORD,
	);

	await browser.close();
	console.log(`\nListo: ${total} capturas en ${OUT}`);
	console.log("Ahora comprimí la carpeta con:");
	console.log(
		`   Compress-Archive -Path capturas\\* -DestinationPath blackline-capturas.zip -Force`,
	);
}

main().catch((e) => {
	console.error("ERROR:", e.message);
	process.exitCode = 1;
});
