# Test Skill & Context
- **Stack**: Backend: xUnit, Moq, FluentAssertions. Frontend: Playwright (TypeScript).
- **Structure**: `Tests/Backend/` (C#), `Tests/FrontendE2E/` (Node.js).
- **Testing Rules**:
  1. **Coverage**: Every feature must have Main, Edge, Alt, Exception cases.
  2. **Mocks**: ALWAYS mock `GeminiService` and DB Context using InMemoryDatabase or SQLite in-memory to optimize speed.
  3. **Security Tests**: Webhook tests must validate HMAC-SHA256 rejection.
- **Claude Execution**: Read `task_test.md`. Execute ONLY ONE phase at a time. Do not explain code excessively, output raw code/commands to save tokens.
