import { test, expect } from '@playwright/test'
import { installMocks, type MockTree } from './install-mocks'
import hotelTopMocks from './mocks/hotel/top'

// Demonstrates how a generated spec consumes the generated mock data: install the seeded
// tree as a client mock, navigate, and assert the page rendered the seeded state.
test('hotel top renders the featured hotel from the generated mock data', async ({ page }) => {
  await installMocks(page, hotelTopMocks as MockTree)
  await page.goto('/#/hotel/top')

  // The seed has one featured hotel (availability 'available', name 'foo').
  await expect(page.getByTestId('hotel-section')).toBeVisible()
  await expect(page.getByTestId('hotel-card')).toHaveCount(1)
  await expect(page.getByTestId('card-name')).toHaveText('foo')
  await expect(page.getByTestId('badge-available')).toBeVisible()
})
