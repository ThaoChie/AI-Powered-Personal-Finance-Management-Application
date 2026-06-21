# Automation Test - Micro-Phases

**[Claude] STOP after EACH phase. Confirm before proceeding.**

### [ ] PHASE 1: Design Test Cases (Documentation)
**Goal:** Full coverage (Main, Edge, Alt, Exception) for Core & AI.
1. Create `Tests/TestCases.md`.
2. Cover: Auth (Login/OTP), Jars Management, Transaction (CRUD), BankSync Webhook (HMAC verify, duplicate ID), AI Anomaly (large amount), AI Coaching.
*-> STOP and REPORT.*

### [ ] PHASE 2: Setup Sub-project
**Goal:** Init automation project.
1. Run: `dotnet new xunit -n FinanceJarApp.Tests -o Tests/Backend`
2. Run: `dotnet sln add Tests/Backend/FinanceJarApp.Tests.csproj`
3. Add refs to `Server.csproj`.
4. Init Playwright for E2E: `cd Tests && npm init playwright@latest FrontendE2E`
*-> STOP and REPORT.*

### [ ] PHASE 3: Backend API & AI Integration Tests
**Goal:** Test Webhook & AI logic.
1. Write `BankSyncTests.cs`: Test HMAC success (Main), invalid signature (Exception), duplicate transaction (Edge).
2. Write `AIFinanceAnalysisTests.cs`: Mock `GeminiService` (Moq) to test anomaly detection trigger.
*-> STOP and REPORT.*

### [ ] PHASE 4: Frontend E2E Tests
**Goal:** UI coverage with Playwright.
1. Write `dashboard.spec.ts`: Login (Main), view Jars, view AI Alerts (Alt).
2. Write `mockbank.spec.ts`: Simulate webhook UI submit (Main).
*-> STOP and REPORT.*
