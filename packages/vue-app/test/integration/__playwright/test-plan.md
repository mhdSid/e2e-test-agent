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

### P1 – [state-0] plan with seats === 0 shows "Sold out" status (not seat count)
- Navigate to `/#/plans`
- Locate the plan-item whose `plan-name` contains "Premium" (seats === 0 / sold out)
- Assert that the `plan-status` within that item toContainText("Sold out")
- Assert that `plan-book` is absent from that item (no Book button rendered)

### P2 – [state-1] fallback branch: plan with seats > 0 shows seat count in plan-status
- Navigate to `/#/plans`
- Assert `getByTestId("plan-status")` (first occurrence, "Basic") toContainText("seats")

### P3 – [state-2] featured plan renders plan-badge
- Navigate to `/#/plans`
- Assert `getByTestId("plan-badge")` (first occurrence) toHaveText("Featured")

### P4 – [state-3] plan with seats > 0 renders Book button
- Navigate to `/#/plans`
- Assert `getByTestId("plan-book")` (first occurrence) toHaveText("Book")

### P5 – Plans page renders title
- Navigate to `/#/plans`
- Assert `getByTestId("plans-title")` toHaveText("Available Plans")

---

## Route /#/search

### S1 – Search page renders title
- Navigate to `/#/search`
- Assert `getByTestId("search-title")` toHaveText("Search Plans")

### S2 – Search page renders Search button
- Navigate to `/#/search`
- Assert `getByTestId("search-btn")` toHaveText("Search")

### S3 – [state-0] query with results renders result-count and result-list
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "Basic"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("result-count")` toContainText("result(s)")
- Assert `getByTestId("result-list")` toHaveCount(1)
- Assert `getByTestId("result-item")` toHaveCount(1)
- Assert `getByTestId("result-name")` toContainText("Basic")
- Assert `getByTestId("result-price")` toContainText("¥")

### S4 – [state-1] query with no matching results renders no-results
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "zzznomatch999"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("no-results")` toHaveText("No plans found")

### S5 – [form-valid-submit] valid search submission updates result-count
- Navigate to `/#/search`
- Fill `getByTestId("search-input")` with "Standard"
- Click `getByTestId("search-btn")`
- Assert `getByTestId("result-count")` toContainText("result(s)")

---

## Route /#/book/1

### B1 – [state-0] valid plan renders booking form elements
- Navigate to `/#/book/1`
- Assert `getByTestId("book-title")` toContainText("Book:")
- Assert `getByTestId("book-price")` toHaveText("¥3,000")
- Assert `getByTestId("book-form")` toHaveCount(1)
- Assert `getByTestId("input-name")` toHaveCount(1)
- Assert `getByTestId("input-email")` toHaveCount(1)
- Assert `getByTestId("submit-btn")` toHaveText("Confirm Booking")

### B2 – [state-0] valid plan does not render error-msg or back-link
- Navigate to `/#/book/1`
- Assert `getByTestId("error-msg")` toHaveCount(0)
- Assert `getByTestId("back-link")` toHaveCount(0)

### B3 – [state-0] input-name has required attribute
- Navigate to `/#/book/1`
- Assert `getByTestId("input-name")` toHaveAttribute("required", "")

### B4 – [state-0] input-email has required attribute
- Navigate to `/#/book/1`
- Assert `getByTestId("input-email")` toHaveAttribute("required", "")

### B5 – [state-1] sold-out plan renders error-msg and back-link
- Navigate to `/#/book/3`
- Assert `getByTestId("error-msg")` toHaveText("Plan unavailable")
- Assert `getByTestId("back-link")` toHaveText("Back to plans")

### B6 – [state-1] sold-out plan does not render booking form elements
- Navigate to `/#/book/3`
- Assert `getByTestId("book-title")` toHaveCount(0)
- Assert `getByTestId("book-price")` toHaveCount(0)
- Assert `getByTestId("book-form")` toHaveCount(0)
- Assert `getByTestId("input-name")` toHaveCount(0)
- Assert `getByTestId("input-email")` toHaveCount(0)
- Assert `getByTestId("submit-btn")` toHaveCount(0)

### B7 – [form-valid-submit] valid booking submission navigates to /#/confirm
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Jane Doe"
- Fill `getByTestId("input-email")` with "jane@example.com"
- Click `getByTestId("submit-btn")`
- Assert URL toHaveURL(/#\/confirm/)

---

## Route /#/confirm

### C1 – [state-1] no active booking renders no-booking message
- Navigate to `/#/confirm`
- Assert `getByTestId("no-booking")` toHaveText("No active booking")

### C2 – [state-1] no active booking renders back-plans link
- Navigate to `/#/confirm`
- Assert `getByTestId("back-plans")` toHaveText("Browse plans")

### C3 – [state-1] no active booking does not render confirm-title or booking details
- Navigate to `/#/confirm`
- Assert `getByTestId("confirm-title")` toHaveCount(0)
- Assert `getByTestId("confirm-name")` toHaveCount(0)
- Assert `getByTestId("confirm-email")` toHaveCount(0)
- Assert `getByTestId("confirm-plan")` toHaveCount(0)
- Assert `getByTestId("confirm-price")` toHaveCount(0)
- Assert `getByTestId("back-home")` toHaveCount(0)

### C4 – [state-0] confirmed booking renders confirmation details
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Jane Doe"
- Fill `getByTestId("input-email")` with "jane@example.com"
- Click `getByTestId("submit-btn")`
- Assert URL toHaveURL(/#\/confirm/)
- Assert `getByTestId("confirm-title")` toHaveText("Booking Confirmed")
- Assert `getByTestId("confirm-name")` toContainText("Name:")
- Assert `getByTestId("confirm-email")` toContainText("Email:")
- Assert `getByTestId("confirm-plan")` toContainText("Plan:")
- Assert `getByTestId("confirm-price")` toContainText("Total:")
- Assert `getByTestId("back-home")` toHaveText("Back to home")

### C5 – [state-0] confirmed booking does not render no-booking or back-plans
- Navigate to `/#/book/1`
- Fill `getByTestId("input-name")` with "Jane Doe"
- Fill `getByTestId("input-email")` with "jane@example.com"
- Click `getByTestId("submit-btn")`
- Assert `getByTestId("no-booking")` toHaveCount(0)
- Assert `getByTestId("back-plans")` toHaveCount(0)