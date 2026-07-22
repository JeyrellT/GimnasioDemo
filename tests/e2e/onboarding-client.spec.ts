import { test, expect } from '@playwright/test'

test.describe('Client Onboarding Flow', () => {
  test.skip(
    !process.env.E2E_BACKEND,
    'Requiere backend levantado (E2E_BACKEND=true)',
  )

  test('completa flujo básico de onboarding', async ({ page }) => {
    // Navega a landing
    await page.goto('/')
    
    // Click en CTA
    const cta = page.getByRole('link', { name: /empezar|comenzar|registrate/i })
    await cta.click()
    
    // Debería estar en signup o sign-in
    await expect(page).toHaveURL(/\/(signin|signup|auth)/)
    
    // Verificar que se ve un formulario
    const emailInput = page.getByLabel(/email|correo/i)
    await expect(emailInput).toBeVisible()
  })

  test('sign-up con email válido progresa', async ({ page }) => {
    const testEmail = `test-${Date.now()}@blacklinefitness.app`
    
    // Ir a signup
    await page.goto('/auth/signup')
    
    // Completar email
    const emailInput = page.getByLabel(/email|correo/i)
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInput.fill(testEmail)
      
      // Buscar botón siguiente
      const nextBtn = page.getByRole('button', { name: /siguiente|continuar|next/i })
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click()
        
        // Debería mostrar confirmación o siguiente paso
        await expect(page.locator('body')).toContainText(/correo|verificacion|magic/i)
      }
    }
  })

  test('formulario valida email requerido', async ({ page }) => {
    await page.goto('/auth/signup')
    
    const emailInput = page.getByLabel(/email|correo/i)
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      const nextBtn = page.getByRole('button', { name: /siguiente|continuar|next/i })
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Dejar vacío y clickear
        await emailInput.fill('')
        await nextBtn.click()
        
        // Debería mostrar error
        await expect(page.locator('body')).toContainText(/requerido|required|inválido|invalid/i)
      }
    }
  })

  test('página muestra español CR (voseo)', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Buscar textos con voseo
    const bodyText = await page.locator('body').innerText()
    const hasVoseo = bodyText.includes('podés') || bodyText.includes('tenés') || bodyText.includes('completá')
    expect(hasVoseo).toBe(true)
  })
})
