# Contributing to QuickPrint

Thank you for your interest in contributing to QuickPrint! We welcome community contributions, bug reports, feature requests, and code enhancements.

## How to Contribute

1. **Fork the Repository**: Click the "Fork" button at the top right of the repository.
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/your-username/QuickPrint.git
   cd QuickPrint
   ```
3. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-new-feature
   ```
4. **Make Your Changes**: Follow existing code conventions, keep controllers thin, and put business logic in services.
5. **Run Verification**: Ensure backend and frontend build and run cleanly without errors.
6. **Commit Your Changes**:
   ```bash
   git commit -m "feat: add amazing new feature"
   ```
7. **Push to Your Branch**:
   ```bash
   git push origin feature/amazing-new-feature
   ```
8. **Open a Pull Request**: Submit a Pull Request describing your changes and testing performed.

## Coding Guidelines

- Maintain backward compatibility for existing endpoints and components.
- Do not commit secrets, API keys, or `.env` files.
- Ensure all inputs are validated on the backend.
