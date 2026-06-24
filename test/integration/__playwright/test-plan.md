# E2E Test Plan

## Route /#/

### H1 – Home page title is displayed
1. Navigate to `/#/`
2. Assert `getByTestId("home-title")` toHaveText("Hotel Booking")

### H2 – Home page subtitle is displayed
1. Navigate to `/#/`
2. Assert `getByTestId("home-subtitle")` toHaveText("Find and book your perfect stay")

### H3 – Home CTA Browse Plans button is displayed
1. Navigate to `/#/`
2. Assert `getByTestId("home-cta-plans")` toHaveText("Browse Plans")

### H4 – Home CTA Search button is displayed
1. Navigate to `/#/`
2. Assert `getByTestId("home-cta-search")` toHaveText("Search")

---

## Route /#/plans

### P1 – plan-status shows "Sold out" when plan.seats === 0
1. Navigate to `/#/plans`
2. Locate the plan-item whose `plan-name` contains "Premium" (seats === 0)
3. Assert `getByTestId("plan-status")` (within that item) toContainText("Sold out")

### P2 – plan-status fallback renders for plans with no seats (no Book button shown)
1. Navigate to `/#/plans`
2. Locate the plan-item whose `plan-name` contains "Premium"
3. Assert `getByTestId("plan-status")` toContainText("Sold out")
4. Assert no `plan-book` element is present within that item

### P3 – plan-badge "Featured" is shown when plan.featured is true
1. Navigate to `/#/plans`
2. Assert all instances of `getByTestId("plan-badge")` toHaveText("Featured")
3. Assert `getByTestId("plan-badge")` count toHaveCount(2)

### P4 – plan-book "Book" button is shown when plan.seats > 0
1. Navigate to `/#/plans`
2. Assert all instances of `getByTestId("plan-book")` toHaveText("Book")
3. Assert `getByTestId("plan-book")` toHaveCount(2)

---

## Route /#/search

### S1 – Search page title is displayed
1. Navigate to `/#/search`
2. Assert `getByTestId("search-title")` toHaveText("Search Plans")

### S2 – Submitting a query that matches results shows result-count, result-list, result-item, result-name, result-price
1. Navigate to `/#/search`
2. Fill `getByTestId("search-input")` with "Basic"
3. Click `getByTestId("search-btn")`
4. Assert `getByTestId("result-count")` toContainText("result(s)")
5. Assert `getByTestId("result-list")` is present
6. Assert `getByTestId("result-item")` toHaveCount(1)
7. Assert `getByTestId("result-name")` toContainText("Basic")
8. Assert `getByTestId("result-price")` toContainText("¥")

### S3 – Submitting a query that matches nothing shows no-results
1. Navigate to `/#/search`
2. Fill `getByTestId("search-input")` with "zzznomatch"
3. Click `getByTestId("search-btn")`
4. Assert `getByTestId("no-results")` toHaveText("No plans found")

### S4 – form-valid-submit: valid query submission proceeds (URL remains /#/search or updates)
1. Navigate to `/#/search`
2. Fill `getByTestId("search-input")` with "Standard"
3. Click `getByTestId("search-btn")`
4. Assert page toHaveURL containing `/#/search`)
5. Assert `getByTestId("result-count")` toContainText("result(s)")

### S5 – filter-query: entering a query narrows result-list
1. Navigate to `/#/search`
2. Fill `getByTestId("search-input")` with "Premium"
3. Click `getByTestId("search-btn")`
4. Assert `getByTestId("result-list")` is present
5. Assert `getByTestId("result-item")` toHaveCount(1)

### S6 – search-empty: filters matching nothing show empty state with zero result items
1. Navigate to `/#/search`
2. Fill `getByTestId("search-input")` with "xyznotaplan"
3. Click `getByTestId("search-btn")`
4. Assert `getByTestId("no-results")` toHaveText("No plans found")
5. Assert `getByTestId("result-item")` toHaveCount(0)

---

## Route /#/book/1

### B1 – Book form renders when plan has seats > 0
1. Navigate to `/#/book/1`
2. Assert `getByTestId("book-title")` toContainText("Book:")
3. Assert `getByTestId("book-price")` toHaveText("¥3,000")
4. Assert `getByTestId("book-form")` is present
5. Assert `getByTestId("input-name")` toHaveAttribute("required", "")
6. Assert `getByTestId("input-email")` toHaveAttribute("required", "")
7. Assert `getByTestId("submit-btn")` toHaveText("Confirm Booking")

### B2 – error-msg and back-link are absent when plan is available
1. Navigate to `/#/book/1`
2. Assert `getByTestId("error-msg")` toHaveCount(0)
3. Assert `getByTestId("back-link")` toHaveCount(0)

### B3 – Fallback branch renders error-msg and back-link when plan is unavailable (sold out)
1. Navigate to `/#/book/3`
2. Assert `getByTestId("error-msg")` toHaveText("Plan unavailable")
3. Assert `getByTestId("back-link")` toHaveText("Back to plans")

### B4 – book-title, book-price, book-form, input-name, input-email, submit-btn are absent on unavailable plan
1. Navigate to `/#/book/3`
2. Assert `getByTestId("book-title")` toHaveCount(0)
3. Assert `getByTestId("book-price")` toHaveCount(0)
4. Assert `getByTestId("book-form")` toHaveCount(0)
5. Assert `getByTestId("input-name")` toHaveCount(0)
6. Assert `getByTestId("input-email")` toHaveCount(0)
7. Assert `getByTestId("submit-btn")` toHaveCount(0)

### B5 – form-valid-submit: filling valid name and email and clicking Confirm Booking navigates to /#/confirm
1. Navigate to `/#/book/1`
2. Fill `getByTestId("input-name")` with "Alice"
3. Fill `getByTestId("input-email")` with "alice@example.com"
4. Click `getByTestId("submit-btn")`
5. Assert page toHaveURL containing `/#/confirm`

---

## Route /#/confirm

### C1 – Confirm page shows booking details when store.booking is set (via full booking journey)
1. Navigate to `/#/book/1`
2. Fill `getByTestId("input-name")` with "Alice"
3. Fill `getByTestId("input-email")` with "alice@example.com"
4. Click `getByTestId("submit-btn")`
5. Assert page toHaveURL containing `/#/confirm`
6. Assert `getByTestId("confirm-title")` toHaveText("Booking Confirmed")
7. Assert `getByTestId("confirm-name")` toContainText("Name:")
8. Assert `getByTestId("confirm-email")` toContainText("Email:")
9. Assert `getByTestId("confirm-plan")` toContainText("Plan:")
10. Assert `getByTestId("confirm-price")` toContainText("Total:")
11. Assert `getByTestId("back-home")` toHaveText("Back to home")

### C2 – no-booking and back-plans are absent when booking is confirmed
1. Navigate to `/#/book/1`
2. Fill `getByTestId("input-name")` with "Alice"
3. Fill `getByTestId("input-email")` with "alice@example.com"
4. Click `getByTestId("submit-btn")`
5. Assert page toHaveURL containing `/#/confirm`
6. Assert `getByTestId("no-booking")` toHaveCount(0)
7. Assert `getByTestId("back-plans")` toHaveCount(0)

### C3 – Fallback branch renders no-booking and back-plans when navigating to /#/confirm without a booking
1. Navigate directly to `/#/confirm`
2. Assert `getByTestId("no-booking")` toHaveText("No active booking")
3. Assert `getByTestId("back-plans")` toHaveText("Browse plans")

### C4 – confirm-title, confirm-name, confirm-email, confirm-plan, confirm-price, back-home are absent without a booking
1. Navigate directly to `/#/confirm`
2. Assert `getByTestId("confirm-title")` toHaveCount(0)
3. Assert `getByTestId("confirm-name")` toHaveCount(0)
4. Assert `getByTestId("confirm-email")` toHaveCount(0)
5. Assert `getByTestId("confirm-plan")` toHaveCount(0)
6. Assert `getByTestId("confirm-price")` toHaveCount(0)
7. Assert `getByTestId("back-home")` toHaveCount(0)