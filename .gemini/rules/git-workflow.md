# Git Commit & Push Workflow Rules

Always follow these rules whenever you create, modify, or fix code in this repository:

1. **Never leave changes uncommitted**:
   - Whenever any task or file edit is completed and verified, stage and commit the changes immediately.
   - Run: `git add .`
   - Run: `git commit -m "<Clear, descriptive commit message detailing exactly what was changed>"`

2. **Format of Commit Messages**:
   - Use clear conventional commit format:
     - `feat: <description>` for new features
     - `fix: <description>` for bug fixes
     - `refactor: <description>` for code restructuring or cleanup
     - `style: <description>` for UI/styling changes
   - In the commit body, list the specific files and key improvements made.

3. **Provide Push Instructions to the User**:
   - At the end of every response where code was changed, always display the exact terminal command for the user to push to GitHub:
     ```bash
     cd /Users/shunyavkashminim2/Downloads/moneyFlow && git push origin main
     ```
