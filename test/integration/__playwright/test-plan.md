# E2E Test Plan

## Route /#/

### H1 – Home page renders static title
- Navigate to `/#/`
- Assert `getByTestId("home-title")` toHaveText("Hotel Booking")

### H2 – Home page renders static subtitle
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

### P1 – [state-0] plan with seats === 0 shows "Sold out" status (no Book button)
- Navigate to `/#/plans`
- Locate the plan item whose `plan-name` contains "Premium" (seats === 0 / sold out)
- Assert that the `plan-status` within that item toContainText("Sold out")
- Assert that no `plan-book` element is present within that item (count of `plan-book` elements scoped to the sold-out item is 0)

### P2 – [state-1] fallback branch: sold-out plan does not render a Book button
- Navigate to `/#/plans`
- Assert that the third `plan-item` (Premium, sold out) does not contain a `plan-book` element
- Assert `getByTestId("plan-status")` instances: verify the one with text "Sold out" toHaveText("Sold out")

### P3 – [state-2] featured plan renders the Featured badge
- Navigate to `/#/plans`
- Assert at least one `getByTestId("plan-badge")` toHaveText("Featured")

### P4 – [state-3] plan with seats > 0 renders the Book button
- Navigate to `/#/plans`
- Assert the first `getByTestId("plan-book")` toHaveText("Book")
- Assert `getByTestId("plan-status")` first instance toContainText("seats")

---

## Route /#/search

### S1 – [state-0] entering a query renders result elements
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "Basic"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("result-count")` toContainText("result(s)")
- Assert `getByTestId("result-list")` is present (toHaveCount >= 1)
- Assert `getByTestId("result-item")` toHaveCount at least 1
- Assert `getByTestId("result-name")` toContainText("Basic")
- Assert `getByTestId("result-price")` toContainText("¥")

### S2 – [state-1] query with no matches renders no-results message
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "zzznomatch"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("no-results")` toHaveText("No plans found")

### S3 – [form-valid-submit] valid search submission proceeds (URL reflects search state)
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "Standard"
- Click `getByTestId("search-btn")`
- Assert page URL toHaveURL containing `/#/search`)
- Assert `getByTestId("result-count")` toContainText("result(s)")

---

## Route /#/book/1

### B1 – [state-0] valid plan renders booking form elements
- Navigate to `/#/book/1`
- Assert `getByTestId("book-title")` toContainText("Book:")
- Assert `getByTestId("book-price")` toHaveText("¥3,000")
- Assert `getByTestId("book-form")` is present (toHaveCount 1)
- Assert `getByTestId("input-name")` toHaveAttribute("required", "")
- Assert `getByTestId("input-email")` toHaveAttribute("required", "")
- Assert `getByTestId("submit-btn")` toHaveText("Confirm Booking")

### B2 – [state-0] valid plan does not render error-msg or back-link
- Navigate to `/#/book/1`
- Assert `getByTestId("error-msg")` toHaveCount(0)
- Assert `getByTestId("back-link")` toHaveCount(0)

### B3 – [state-1] sold-out plan renders error-msg and back-link
- Navigate to `/#/book/3`
- Assert `getByTestId("error-msg")` toHaveText("Plan unavailable")
- Assert `getByTestId("back-link")` toHaveText("Back to plans")

### B4 – [state-1] sold-out plan does not render booking form elements
- Navigate to `/#/book/3`
- Assert `getByTestId("book-title")` toHaveCount(0)
- Assert `getByTestId("book-price")` toHaveCount(0)
- Assert `getByTestId("book-form")` toHaveCount(0)
- Assert `getByTestId("input-name")` toHaveCount(0)
- Assert `getByTestId("input-email")` toHaveCount(0)
- Assert `getByTestId("submit-btn")` toHaveCount(0)

### B5 – [form-valid-submit] valid booking form submission navigates to confirm
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Alice"
- Fill `getByTestId("input-email")` with "alice@example.com"
- Click `getByTestId("submit-btn")`
- Assert page URL toHaveURL containing `/#/confirm`

---

## Route /#/confirm

### C1 – [state-0] confirm page with active booking renders confirmation details
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Alice"
- Fill `getByTestId("input-email")` with "alice@example.com"
- Click `getByTestId("submit-btn")`
- Assert `getByTestId("confirm-title")` toHaveText("Booking Confirmed")
- Assert `getByTestId("confirm-name")` toContainText("Name:")
- Assert `getByTestId("confirm-email")` toContainText("Email:")
- Assert `getByTestId("confirm-plan")` toContainText("Plan:")
- Assert `getByTestId("confirm-price")` toContainText("Total:")
- Assert `getByTestId("back-home")` toHaveText("Back to home")

### C2 – [state-0] confirm page with active booking does not render no-booking or back-plans
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Alice"
- Fill `getByTestId("input-email")` with "alice@example.com"
- Click `getByTestId("submit-btn")`
- Assert `getByTestId("no-booking")` toHaveCount(0)
- Assert `getByTestId("back-plans")` toHaveCount(0)

### C3 – [state-1] confirm page without booking renders fallback no-booking message
- Navigate directly to `/#/confirm`
- Assert `getByTestId("no-booking")` toHaveText("No active booking")
- Assert `getByTestId("back-plans")` toHaveText("Browse plans")

### C4 – [state-1] confirm page without booking does not render confirmation elements
- Navigate directly to `/#/confirm`
- Assert `getByTestId("confirm-title")` toHaveCount(0)
- Assert `getByTestId("confirm-name")` toHaveCount(0)
- Assert `getByTestId("confirm-email")` toHaveCount(0)
- Assert `getByTestId("confirm-plan")` toHaveCount(0)
- Assert `getByTestId("confirm-price")` toHaveCount(0)
- Assert `getByTestId("back-home")` toHaveCount(0)