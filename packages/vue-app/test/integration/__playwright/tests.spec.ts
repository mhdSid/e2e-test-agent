import { test, expect } from '@playwright/test'

test.describe('Route /#/', () => {
  test('H1 – Home page renders title', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-title')).toHaveText('Hotel Booking')
  })

  test('H2 – Home page renders subtitle', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-subtitle')).toHaveText('Find and book your perfect stay')
  })

  test('H3 – Home page renders Browse Plans CTA', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-cta-plans')).toHaveText('Browse Plans')
  })

  test('H4 – Home page renders Search CTA', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-cta-search')).toHaveText('Search')
  })
})

test.describe('Route /#/plans', () => {
  test('P1 – [state-0] plan with seats === 0 shows "Sold out" status (not seat count)', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    const planItems = page.getByTestId('plan-item')
    const count = await planItems.count()
    let premiumItem = null
    for (let i = 0; i < count; i++) {
      const item = planItems.nth(i)
      const nameText = await item.getByTestId('plan-name').textContent()
      if (nameText && nameText.includes('Premium')) {
        premiumItem = item
        break
      }
    }
    await expect(premiumItem!.getByTestId('plan-status')).toContainText('Sold out')
    await expect(premiumItem!.getByTestId('plan-book')).toHaveCount(0)
  })

  test('P2 – [state-1] fallback branch: plan with seats > 0 shows seat count in plan-status', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-status').first()).toContainText('seats')
  })

  test('P3 – [state-2] featured plan renders plan-badge', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-badge').first()).toHaveText('Featured')
  })

  test('P4 – [state-3] plan with seats > 0 renders Book button', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-book').first()).toHaveText('Book')
  })

  test('P5 – Plans page renders title', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plans-title')).toHaveText('Available Plans')
  })
})

test.describe('Route /#/search', () => {
  test('S1 – Search page renders title', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await expect(page.getByTestId('search-title')).toHaveText('Search Plans')
  })

  test('S2 – Search page renders Search button', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await expect(page.getByTestId('search-btn')).toHaveText('Search')
  })

  test('S3 – [state-0] query with results renders result-count and result-list', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Basic')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
    await expect(page.getByTestId('result-list')).toHaveCount(1)
    await expect(page.getByTestId('result-item')).toHaveCount(1)
    await expect(page.getByTestId('result-name')).toContainText('Basic')
    await expect(page.getByTestId('result-price')).toContainText('¥')
  })

  test('S4 – [state-1] query with no matching results renders no-results', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('zzznomatch999')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('no-results')).toHaveText('No plans found')
  })

  test('S5 – [form-valid-submit] valid search submission updates result-count', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Standard')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
  })
})

test.describe('Route /#/book/1', () => {
  test('B1 – [state-0] valid plan renders booking form elements', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('book-title')).toContainText('Book:')
    await expect(page.getByTestId('book-price')).toHaveText('¥3,000')
    await expect(page.getByTestId('book-form')).toHaveCount(1)
    await expect(page.getByTestId('input-name')).toHaveCount(1)
    await expect(page.getByTestId('input-email')).toHaveCount(1)
    await expect(page.getByTestId('submit-btn')).toHaveText('Confirm Booking')
  })

  test('B2 – [state-0] valid plan does not render error-msg or back-link', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('error-msg')).toHaveCount(0)
    await expect(page.getByTestId('back-link')).toHaveCount(0)
  })

  test('B3 – [state-0] input-name has required attribute', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('input-name')).toHaveAttribute('required', '')
  })

  test('B4 – [state-0] input-email has required attribute', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('input-email')).toHaveAttribute('required', '')
  })

  test('B5 – [state-1] sold-out plan renders error-msg and back-link', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('error-msg')).toHaveText('Plan unavailable')
    await expect(page.getByTestId('back-link')).toHaveText('Back to plans')
  })

  test('B6 – [state-1] sold-out plan does not render booking form elements', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('book-title')).toHaveCount(0)
    await expect(page.getByTestId('book-price')).toHaveCount(0)
    await expect(page.getByTestId('book-form')).toHaveCount(0)
    await expect(page.getByTestId('input-name')).toHaveCount(0)
    await expect(page.getByTestId('input-email')).toHaveCount(0)
    await expect(page.getByTestId('submit-btn')).toHaveCount(0)
  })

  test('B7 – [form-valid-submit] valid booking submission navigates to /#/confirm', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Jane Doe')
    await page.getByTestId('input-email').fill('jane@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/#\/confirm/)
  })
})

test.describe('Route /#/confirm', () => {
  test('C1 – [state-1] no active booking renders no-booking message', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('no-booking')).toHaveText('No active booking')
  })

  test('C2 – [state-1] no active booking renders back-plans link', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('back-plans')).toHaveText('Browse plans')
  })

  test('C3 – [state-1] no active booking does not render confirm-title or booking details', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('confirm-title')).toHaveCount(0)
    await expect(page.getByTestId('confirm-name')).toHaveCount(0)
    await expect(page.getByTestId('confirm-email')).toHaveCount(0)
    await expect(page.getByTestId('confirm-plan')).toHaveCount(0)
    await expect(page.getByTestId('confirm-price')).toHaveCount(0)
    await expect(page.getByTestId('back-home')).toHaveCount(0)
  })

  test('C4 – [state-0] confirmed booking renders confirmation details', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Jane Doe')
    await page.getByTestId('input-email').fill('jane@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/#\/confirm/)
    await expect(page.getByTestId('confirm-title')).toHaveText('Booking Confirmed')
    await expect(page.getByTestId('confirm-name')).toContainText('Name:')
    await expect(page.getByTestId('confirm-email')).toContainText('Email:')
    await expect(page.getByTestId('confirm-plan')).toContainText('Plan:')
    await expect(page.getByTestId('confirm-price')).toContainText('Total:')
    await expect(page.getByTestId('back-home')).toHaveText('Back to home')
  })

  test('C5 – [state-0] confirmed booking does not render no-booking or back-plans', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Jane Doe')
    await page.getByTestId('input-email').fill('jane@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page.getByTestId('no-booking')).toHaveCount(0)
    await expect(page.getByTestId('back-plans')).toHaveCount(0)
  })
})
