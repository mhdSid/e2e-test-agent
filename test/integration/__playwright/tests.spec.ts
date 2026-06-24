import { test, expect } from '@playwright/test'

test.describe('Route /#/', () => {
  test('H1 – Home page renders static title', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-title')).toHaveText('Hotel Booking')
  })

  test('H2 – Home page renders static subtitle', async ({ page }) => {
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
  test('P1 – [state-0] plan with seats === 0 shows "Sold out" status (no Book button)', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    const planItems = page.getByTestId('plan-item')
    const premiumItem = planItems.nth(2)
    await expect(premiumItem.getByTestId('plan-status')).toContainText('Sold out')
    await expect(premiumItem.getByTestId('plan-book')).toHaveCount(0)
  })

  test('P2 – [state-1] fallback branch: sold-out plan does not render a Book button', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    const planItems = page.getByTestId('plan-item')
    const premiumItem = planItems.nth(2)
    await expect(premiumItem.getByTestId('plan-book')).toHaveCount(0)
    const soldOutStatus = page.getByTestId('plan-status').filter({ hasText: 'Sold out' })
    await expect(soldOutStatus).toHaveText('Sold out')
  })

  test('P3 – [state-2] featured plan renders the Featured badge', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-badge').first()).toHaveText('Featured')
  })

  test('P4 – [state-3] plan with seats > 0 renders the Book button', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-book').first()).toHaveText('Book')
    await expect(page.getByTestId('plan-status').first()).toContainText('seats')
  })
})

test.describe('Route /#/search', () => {
  test('S1 – [state-0] entering a query renders result elements', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Basic')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
    await expect(page.getByTestId('result-list')).toHaveCount(1)
    await expect(page.getByTestId('result-item').first()).toBeVisible()
    await expect(page.getByTestId('result-item')).toHaveCount(1)
    await expect(page.getByTestId('result-name').first()).toContainText('Basic')
    await expect(page.getByTestId('result-price').first()).toContainText('¥')
  })

  test('S2 – [state-1] query with no matches renders no-results message', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('zzznomatch')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('no-results')).toHaveText('No plans found')
  })

  test('S3 – [form-valid-submit] valid search submission proceeds (URL reflects search state)', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Standard')
    await page.getByTestId('search-btn').click()
    await expect(page).toHaveURL(/\/#\/search/)
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
  })
})

test.describe('Route /#/book/1', () => {
  test('B1 – [state-0] valid plan renders booking form elements', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('book-title')).toContainText('Book:')
    await expect(page.getByTestId('book-price')).toHaveText('¥3,000')
    await expect(page.getByTestId('book-form')).toHaveCount(1)
    await expect(page.getByTestId('input-name')).toHaveAttribute('required', '')
    await expect(page.getByTestId('input-email')).toHaveAttribute('required', '')
    await expect(page.getByTestId('submit-btn')).toHaveText('Confirm Booking')
  })

  test('B2 – [state-0] valid plan does not render error-msg or back-link', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('error-msg')).toHaveCount(0)
    await expect(page.getByTestId('back-link')).toHaveCount(0)
  })

  test('B3 – [state-1] sold-out plan renders error-msg and back-link', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('error-msg')).toHaveText('Plan unavailable')
    await expect(page.getByTestId('back-link')).toHaveText('Back to plans')
  })

  test('B4 – [state-1] sold-out plan does not render booking form elements', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('book-title')).toHaveCount(0)
    await expect(page.getByTestId('book-price')).toHaveCount(0)
    await expect(page.getByTestId('book-form')).toHaveCount(0)
    await expect(page.getByTestId('input-name')).toHaveCount(0)
    await expect(page.getByTestId('input-email')).toHaveCount(0)
    await expect(page.getByTestId('submit-btn')).toHaveCount(0)
  })

  test('B5 – [form-valid-submit] valid booking form submission navigates to confirm', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/\/#\/confirm/)
  })
})

test.describe('Route /#/confirm', () => {
  test('C1 – [state-0] confirm page with active booking renders confirmation details', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page.getByTestId('confirm-title')).toHaveText('Booking Confirmed')
    await expect(page.getByTestId('confirm-name')).toContainText('Name:')
    await expect(page.getByTestId('confirm-email')).toContainText('Email:')
    await expect(page.getByTestId('confirm-plan')).toContainText('Plan:')
    await expect(page.getByTestId('confirm-price')).toContainText('Total:')
    await expect(page.getByTestId('back-home')).toHaveText('Back to home')
  })

  test('C2 – [state-0] confirm page with active booking does not render no-booking or back-plans', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page.getByTestId('no-booking')).toHaveCount(0)
    await expect(page.getByTestId('back-plans')).toHaveCount(0)
  })

  test('C3 – [state-1] confirm page without booking renders fallback no-booking message', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('no-booking')).toHaveText('No active booking')
    await expect(page.getByTestId('back-plans')).toHaveText('Browse plans')
  })

  test('C4 – [state-1] confirm page without booking does not render confirmation elements', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('confirm-title')).toHaveCount(0)
    await expect(page.getByTestId('confirm-name')).toHaveCount(0)
    await expect(page.getByTestId('confirm-email')).toHaveCount(0)
    await expect(page.getByTestId('confirm-plan')).toHaveCount(0)
    await expect(page.getByTestId('confirm-price')).toHaveCount(0)
    await expect(page.getByTestId('back-home')).toHaveCount(0)
  })
})
