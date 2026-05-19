import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('carga landing page sin errores', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Blackline Fitness|blackline-fitness/)
  })

  test('muestra tagline de Blackline Fitness', async ({ page }) => {
    await page.goto('/')
    const tagline = page.getByText(/Cada repetición te blackline-fitness/i)
    await expect(tagline).toBeVisible()
  })

  test('muestra CTA principal (Empezar)', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /empezar|comenzar|registrate/i })
    await expect(cta).toBeVisible()
  })

  test('muestra logo de Blackline Fitness', async ({ page }) => {
    await page.goto('/')
    const logo = page.getByRole('img', { name: /blackline-fitness|logo/i })
    await expect(logo).toBeVisible()
  })

  test('página está en español (lang=es-CR)', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const lang = await html.getAttribute('lang')
    expect(lang).toMatch(/es-CR|es/)
  })

  test('CTA es navegable', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /empezar|comenzar|registrate/i })
    // Verificar que es un link funcional (tiene href)
    const href = await cta.getAttribute('href')
    expect(href).toBeTruthy()
  })

  test('render sin errores de consola críticos', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    await page.goto('/')
    // Permitir algunos errores de analytics/terceros, pero no de app
    const appErrors = errors.filter(e => !e.includes('gtag') && !e.includes('sentry'))
    expect(appErrors.length).toBe(0)
  })

  test('página es responsive (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    const tagline = page.getByText(/Cada repetición te blackline-fitness/i)
    await expect(tagline).toBeVisible()
  })

  test('página es responsive (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    const tagline = page.getByText(/Cada repetición te blackline-fitness/i)
    await expect(tagline).toBeVisible()
  })
})
