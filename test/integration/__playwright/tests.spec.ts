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
  test('P1 – plan-status shows "Sold out" when plan.seats === 0', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    const statuses = page.getByTestId('plan-status')
    const count = await statuses.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const text = await statuses.nth(i).textContent()
      if (text && text.includes('Sold out')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
    await expect(statuses.filter({ hasText: 'Sold out' })).toHaveCount(1)
  })

  test('P2 – plan-status shows seat count when plan.seats > 0', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-status').first()).toContainText('seats')
  })

  test('P3 – plan-badge renders "Featured" when plan.featured is true', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-badge').first()).toHaveText('Featured')
  })

  test('P4 – plan-book renders "Book" when plan.seats > 0', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plan-book').first()).toHaveText('Book')
  })

  test('P5 – plans title renders', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    await expect(page.getByTestId('plans-title')).toHaveText('Available Plans')
  })
})

test.describe('Route /#/search', () => {
  test('S1 – Search page renders title and form', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await expect(page.getByTestId('search-title')).toHaveText('Search Plans')
    await expect(page.getByTestId('search-btn')).toHaveText('Search')
  })

  test('S2 – Entering a query that matches results shows result-count and result-list', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Basic')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
    await expect(page.getByTestId('result-list')).toHaveCount(1)
    await expect(page.getByTestId('result-item')).toHaveCount(1)
    await expect(page.getByTestId('result-name')).toContainText('Basic')
    await expect(page.getByTestId('result-price')).toContainText('¥')
  })

  test('S3 – Entering a query with no matches shows no-results', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('zzznomatch')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('no-results')).toHaveText('No plans found')
  })

  test('S4 – form-valid-submit: valid query submission proceeds', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Basic')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
  })
})

test.describe('Route /#/book/1', () => {
  test('B1 – Book page renders form elements when plan has seats', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('book-title')).toContainText('Book:')
    await expect(page.getByTestId('book-price')).toHaveText('¥3,000')
    await expect(page.getByTestId('book-form')).toHaveCount(1)
    await expect(page.getByTestId('input-name')).toHaveCount(1)
    await expect(page.getByTestId('input-email')).toHaveCount(1)
    await expect(page.getByTestId('submit-btn')).toHaveText('Confirm Booking')
  })

  test('B2 – Book page does not show error-msg or back-link when plan is available', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('error-msg')).toHaveCount(0)
    await expect(page.getByTestId('back-link')).toHaveCount(0)
  })

  test('B3 – input-name has required attribute', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('input-name')).toHaveAttribute('required', '')
  })

  test('B4 – input-email has required attribute', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('input-email')).toHaveAttribute('required', '')
  })

  test('B5 – Book page fallback branch: sold-out plan shows error-msg and back-link', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('error-msg')).toHaveText('Plan unavailable')
    await expect(page.getByTestId('back-link')).toHaveText('Back to plans')
  })

  test('B6 – Book page fallback branch: form elements absent when plan unavailable', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('book-title')).toHaveCount(0)
    await expect(page.getByTestId('book-price')).toHaveCount(0)
    await expect(page.getByTestId('book-form')).toHaveCount(0)
    await expect(page.getByTestId('input-name')).toHaveCount(0)
    await expect(page.getByTestId('input-email')).toHaveCount(0)
    await expect(page.getByTestId('submit-btn')).toHaveCount(0)
  })

  test('B7 – form-valid-submit: filling valid values and submitting navigates to confirm', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/\/#\/confirm/)
  })
})

test.describe('Route /#/confirm', () => {
  test('C1 – Confirm page fallback: no booking shows no-booking and back-plans', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('no-booking')).toHaveText('No active booking')
    await expect(page.getByTestId('back-plans')).toHaveText('Browse plans')
  })

  test('C2 – Confirm page fallback: booking detail elements absent when no booking', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('confirm-title')).toHaveCount(0)
    await expect(page.getByTestId('confirm-name')).toHaveCount(0)
    await expect(page.getByTestId('confirm-email')).toHaveCount(0)
    await expect(page.getByTestId('confirm-plan')).toHaveCount(0)
    await expect(page.getByTestId('confirm-price')).toHaveCount(0)
    await expect(page.getByTestId('back-home')).toHaveCount(0)
  })

  test('C3 – Confirm page renders booking details when store.booking is set', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/\/#\/confirm/)
    await expect(page.getByTestId('confirm-title')).toHaveText('Booking Confirmed')
    await expect(page.getByTestId('confirm-name')).toContainText('Name:')
    await expect(page.getByTestId('confirm-email')).toContainText('Email:')
    await expect(page.getByTestId('confirm-plan')).toContainText('Plan:')
    await expect(page.getByTestId('confirm-price')).toContainText('Total:')
    await expect(page.getByTestId('back-home')).toContainText('Back to home')
  })

  test('C4 – Confirm page with booking: no-booking and back-plans are absent', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/\/#\/confirm/)
    await expect(page.getByTestId('no-booking')).toHaveCount(0)
    await expect(page.getByTestId('back-plans')).toHaveCount(0)
  })
})
