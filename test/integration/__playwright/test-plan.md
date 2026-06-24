# E2E Test Plan

## Route /#/

### H1 – Home page renders title
- Navigate to `/#/`
- Assert `getByTestId("home-title")` toHaveText("Hotel Booking")

### H2 – Home page renders subtitle
- Navigate to `/#/`
- Assert `getByTestId("home-subtitle")` toHaveText("Find and book your perfect stay")

### H3 – Home page renders Browse Plans CTA
- Navigate to `/#/`
- Assert `getByTestId("home-cta-plans")` toHaveText("Browse Plans")

### H4 – Home page renders Search CTA
- Navigate to `/#/`
- Assert `getByTestId("home-cta-search")` toHaveText("Search")

---

## Route /#/plans

### P1 – plan-status shows "Sold out" when plan.seats === 0
- Navigate to `/#/plans`
- Locate all `getByTestId("plan-status")` elements
- Assert that at least one `getByTestId("plan-status")` toContainText("Sold out")

### P2 – plan-status shows seat count when plan.seats > 0 (fallback branch absent for sold-out)
- Navigate to `/#/plans`
- Assert the first `getByTestId("plan-status")` toContainText("seats")

### P3 – plan-badge renders "Featured" when plan.featured is true
- Navigate to `/#/plans`
- Assert the first `getByTestId("plan-badge")` toHaveText("Featured")

### P4 – plan-book renders "Book" when plan.seats > 0
- Navigate to `/#/plans`
- Assert the first `getByTestId("plan-book")` toHaveText("Book")

### P5 – plans title renders
- Navigate to `/#/plans`
- Assert `getByTestId("plans-title")` toHaveText("Available Plans")

---

## Route /#/search

### S1 – Search page renders title and form
- Navigate to `/#/search`
- Assert `getByTestId("search-title")` toHaveText("Search Plans")
- Assert `getByTestId("search-btn")` toHaveText("Search")

### S2 – Entering a query that matches results shows result-count and result-list (state-0: query present)
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "Basic"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("result-count")` toContainText("result(s)")
- Assert `getByTestId("result-list")` is present (toHaveCount >= 1)
- Assert `getByTestId("result-item")` toHaveCount at least 1
- Assert `getByTestId("result-name")` toContainText("Basic")
- Assert `getByTestId("result-price")` toContainText("¥")

### S3 – Entering a query with no matches shows no-results (state-1: results.length === 0)
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "zzznomatch"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("no-results")` toHaveText("No plans found")

### S4 – form-valid-submit: valid query submission proceeds (URL reflects search state)
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "Basic"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("result-count")` toContainText("result(s)")

---

## Route /#/book/1

### B1 – Book page renders form elements when plan has seats (state-0: plan && plan.seats > 0)
- Navigate to `/#/book/1`
- Assert `getByTestId("book-title")` toContainText("Book:")
- Assert `getByTestId("book-price")` toHaveText("¥3,000")
- Assert `getByTestId("book-form")` toHaveCount(1)
- Assert `getByTestId("input-name")` toHaveCount(1)
- Assert `getByTestId("input-email")` toHaveCount(1)
- Assert `getByTestId("submit-btn")` toHaveText("Confirm Booking")

### B2 – Book page does not show error-msg or back-link when plan is available
- Navigate to `/#/book/1`
- Assert `getByTestId("error-msg")` toHaveCount(0)
- Assert `getByTestId("back-link")` toHaveCount(0)

### B3 – input-name has required attribute
- Navigate to `/#/book/1`
- Assert `getByTestId("input-name")` toHaveAttribute("required", "")

### B4 – input-email has required attribute
- Navigate to `/#/book/1`
- Assert `getByTestId("input-email")` toHaveAttribute("required", "")

### B5 – Book page fallback branch: sold-out plan shows error-msg and back-link (state-1)
- Navigate to `/#/book/3`
- Assert `getByTestId("error-msg")` toHaveText("Plan unavailable")
- Assert `getByTestId("back-link")` toHaveText("Back to plans")

### B6 – Book page fallback branch: form elements absent when plan unavailable
- Navigate to `/#/book/3`
- Assert `getByTestId("book-title")` toHaveCount(0)
- Assert `getByTestId("book-price")` toHaveCount(0)
- Assert `getByTestId("book-form")` toHaveCount(0)
- Assert `getByTestId("input-name")` toHaveCount(0)
- Assert `getByTestId("input-email")` toHaveCount(0)
- Assert `getByTestId("submit-btn")` toHaveCount(0)

### B7 – form-valid-submit: filling valid values and submitting navigates to confirm
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Alice"
- Fill `getByTestId("input-email")` with "alice@example.com"
- Click `getByTestId("submit-btn")`
- Assert URL toHaveURL matching `/#/confirm`

---

## Route /#/confirm

### C1 – Confirm page fallback: no booking shows no-booking and back-plans (state-1)
- Navigate to `/#/confirm` directly (no prior booking in store)
- Assert `getByTestId("no-booking")` toHaveText("No active booking")
- Assert `getByTestId("back-plans")` toHaveText("Browse plans")

### C2 – Confirm page fallback: booking detail elements absent when no booking
- Navigate to `/#/confirm` directly
- Assert `getByTestId("confirm-title")` toHaveCount(0)
- Assert `getByTestId("confirm-name")` toHaveCount(0)
- Assert `getByTestId("confirm-email")` toHaveCount(0)
- Assert `getByTestId("confirm-plan")` toHaveCount(0)
- Assert `getByTestId("confirm-price")` toHaveCount(0)
- Assert `getByTestId("back-home")` toHaveCount(0)

### C3 – Confirm page renders booking details when store.booking is set (state-0)
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Alice"
- Fill `getByTestId("input-email")` with "alice@example.com"
- Click `getByTestId("submit-btn")`
- Assert URL toHaveURL matching `/#/confirm`
- Assert `getByTestId("confirm-title")` toHaveText("Booking Confirmed")
- Assert `getByTestId("confirm-name")` toContainText("Name:")
- Assert `getByTestId("confirm-email")` toContainText("Email:")
- Assert `getByTestId("confirm-plan")` toContainText("Plan:")
- Assert `getByTestId("confirm-price")` toContainText("Total:")
- Assert `getByTestId("back-home")` toContainText("Back to home")

### C4 – Confirm page with booking: no-booking and back-plans are absent
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Alice"
- Fill `getByTestId("input-email")` with "alice@example.com"
- Click `getByTestId("submit-btn")`
- Assert URL toHaveURL matching `/#/confirm`
- Assert `getByTestId("no-booking")` toHaveCount(0)
- Assert `getByTestId("back-plans")` toHaveCount(0)