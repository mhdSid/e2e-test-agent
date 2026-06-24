import { test, expect } from '@playwright/test'

test.describe('Route /#/', () => {
  test('H1 – Home page title is displayed', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-title')).toHaveText('Hotel Booking')
  })

  test('H2 – Home page subtitle is displayed', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-subtitle')).toHaveText('Find and book your perfect stay')
  })

  test('H3 – Home CTA Browse Plans button is displayed', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-cta-plans')).toHaveText('Browse Plans')
  })

  test('H4 – Home CTA Search button is displayed', async ({ page }) => {
    await page.goto('http://localhost:5173/#/')
    await expect(page.getByTestId('home-cta-search')).toHaveText('Search')
  })
})

test.describe('Route /#/plans', () => {
  test('P1 – plan-status shows "Sold out" when plan.seats === 0', async ({ page }) => {
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
  })

  test('P2 – plan-status fallback renders for plans with no seats (no Book button shown)', async ({ page }) => {
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

  test('P3 – plan-badge "Featured" is shown when plan.featured is true', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    const badges = page.getByTestId('plan-badge')
    await expect(badges).toHaveCount(2)
    const count = await badges.count()
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toHaveText('Featured')
    }
  })

  test('P4 – plan-book "Book" button is shown when plan.seats > 0', async ({ page }) => {
    await page.goto('http://localhost:5173/#/plans')
    const bookButtons = page.getByTestId('plan-book')
    await expect(bookButtons).toHaveCount(2)
    const count = await bookButtons.count()
    for (let i = 0; i < count; i++) {
      await expect(bookButtons.nth(i)).toHaveText('Book')
    }
  })
})

test.describe('Route /#/search', () => {
  test('S1 – Search page title is displayed', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await expect(page.getByTestId('search-title')).toHaveText('Search Plans')
  })

  test('S2 – Submitting a query that matches results shows result-count, result-list, result-item, result-name, result-price', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Basic')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
    await expect(page.getByTestId('result-list')).toHaveCount(1)
    await expect(page.getByTestId('result-item')).toHaveCount(1)
    await expect(page.getByTestId('result-name')).toContainText('Basic')
    await expect(page.getByTestId('result-price')).toContainText('¥')
  })

  test('S3 – Submitting a query that matches nothing shows no-results', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('zzznomatch')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('no-results')).toHaveText('No plans found')
  })

  test('S4 – form-valid-submit: valid query submission proceeds', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Standard')
    await page.getByTestId('search-btn').click()
    await expect(page).toHaveURL(/\/#\/search/)
    await expect(page.getByTestId('result-count')).toContainText('result(s)')
  })

  test('S5 – filter-query: entering a query narrows result-list', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('Premium')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('result-list')).toHaveCount(1)
    await expect(page.getByTestId('result-item')).toHaveCount(1)
  })

  test('S6 – search-empty: filters matching nothing show empty state with zero result items', async ({ page }) => {
    await page.goto('http://localhost:5173/#/search')
    await page.getByTestId('search-input').fill('xyznotaplan')
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('no-results')).toHaveText('No plans found')
    await expect(page.getByTestId('result-item')).toHaveCount(0)
  })
})

test.describe('Route /#/book/1', () => {
  test('B1 – Book form renders when plan has seats > 0', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('book-title')).toContainText('Book:')
    await expect(page.getByTestId('book-price')).toHaveText('¥3,000')
    await expect(page.getByTestId('book-form')).toHaveCount(1)
    await expect(page.getByTestId('input-name')).toHaveAttribute('required', '')
    await expect(page.getByTestId('input-email')).toHaveAttribute('required', '')
    await expect(page.getByTestId('submit-btn')).toHaveText('Confirm Booking')
  })

  test('B2 – error-msg and back-link are absent when plan is available', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await expect(page.getByTestId('error-msg')).toHaveCount(0)
    await expect(page.getByTestId('back-link')).toHaveCount(0)
  })

  test('B3 – Fallback branch renders error-msg and back-link when plan is unavailable (sold out)', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('error-msg')).toHaveText('Plan unavailable')
    await expect(page.getByTestId('back-link')).toHaveText('Back to plans')
  })

  test('B4 – book-title, book-price, book-form, input-name, input-email, submit-btn are absent on unavailable plan', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/3')
    await expect(page.getByTestId('book-title')).toHaveCount(0)
    await expect(page.getByTestId('book-price')).toHaveCount(0)
    await expect(page.getByTestId('book-form')).toHaveCount(0)
    await expect(page.getByTestId('input-name')).toHaveCount(0)
    await expect(page.getByTestId('input-email')).toHaveCount(0)
    await expect(page.getByTestId('submit-btn')).toHaveCount(0)
  })

  test('B5 – form-valid-submit: filling valid name and email and clicking Confirm Booking navigates to /#/confirm', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/\/#\/confirm/)
  })
})

test.describe('Route /#/confirm', () => {
  test('C1 – Confirm page shows booking details when store.booking is set (via full booking journey)', async ({ page }) => {
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
    await expect(page.getByTestId('back-home')).toHaveText('Back to home')
  })

  test('C2 – no-booking and back-plans are absent when booking is confirmed', async ({ page }) => {
    await page.goto('http://localhost:5173/#/book/1')
    await page.getByTestId('input-name').fill('Alice')
    await page.getByTestId('input-email').fill('alice@example.com')
    await page.getByTestId('submit-btn').click()
    await expect(page).toHaveURL(/\/#\/confirm/)
    await expect(page.getByTestId('no-booking')).toHaveCount(0)
    await expect(page.getByTestId('back-plans')).toHaveCount(0)
  })

  test('C3 – Fallback branch renders no-booking and back-plans when navigating to /#/confirm without a booking', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('no-booking')).toHaveText('No active booking')
    await expect(page.getByTestId('back-plans')).toHaveText('Browse plans')
  })

  test('C4 – confirm-title, confirm-name, confirm-email, confirm-plan, confirm-price, back-home are absent without a booking', async ({ page }) => {
    await page.goto('http://localhost:5173/#/confirm')
    await expect(page.getByTestId('confirm-title')).toHaveCount(0)
    await expect(page.getByTestId('confirm-name')).toHaveCount(0)
    await expect(page.getByTestId('confirm-email')).toHaveCount(0)
    await expect(page.getByTestId('confirm-plan')).toHaveCount(0)
    await expect(page.getByTestId('confirm-price')).toHaveCount(0)
    await expect(page.getByTestId('back-home')).toHaveCount(0)
  })
})
