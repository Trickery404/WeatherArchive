# WeatherArchive
Web application which displayes historical weather 
data through API endpoints using **SvelteKit** and **Tailwind CSS**.

# Requirements
- Node.js (20+)
- npm

# Development
- npm install
- npm run dev (http://localhost:5173)

# Building
- npm run build
- npm run preview (http://localhost:4173/) <!--shows prod build-->

# IDE Recommendation (IntelliJ Ultimate)
Plugins:
- Svelte
- Tailwind CSS
- Prettier

Node & Package Manager:
- Settings → Languages & Frameworks → Node.js
  - Node interpreter: local node installation (e.g. C:\Program Files\nodejs\node.exe)
  - Package manager: npm 

ESLint:
- Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
  - Automatic ESLint configuration

Activate On Save:
- Settings → Tools → Actions on Save
  - ESLint: Run eslint --fix
  - Prettier 

# Linting & Formatting
Run before pull requests

- npm run lint
- npm run format
