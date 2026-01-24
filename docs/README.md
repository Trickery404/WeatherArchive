#  WeatherArchive - Dokumentations-Index

Diese Dokumentation beschreibt die Architektur, API-Design und Backend-Implementierung des WeatherArchive-Projekts.

---

##  Fr Projekt-Abgabe

###  Arc42 Architektur-Dokumentation
**[ARC42.md](./ARC42.md)** - **HAUPTDOKUMENT FR ABGABE**

Enthlt:
- 1. Introduction and Goals
- 3. Context and Scope  
- 4. Solution Strategy
- 5. Building Block View
- 9. Architecture Decisions

###  Projekt-Spezifikation
- **[semester_project_serverless_computing_and_FAQs_2024.pdf](./semester_project_serverless_computing_and_FAQs_2024.pdf)** - Offizielle Aufgabenstellung
- **[Evaluation_matrix_for_the_semester_project.md](./Evaluation_matrix_for_the_semester_project.md)** - Bewertungskriterien

---

##  Backend-Dokumentation

### Overview
**[backend/00_overview.md](./backend/00_overview.md)** - Backend-bersicht
- Architektur
- Lambda Functions
- Services

### API Design
**[backend/api-design.md](./backend/api-design.md)** - REST API Spezifikation
- Endpoints (GET/POST)
- Request/Response Payloads
- HTTP Status Codes
- API Key Authentication

### Lambda Functions
**[backend/lambda-spec.md](./backend/lambda-spec.md)** - Lambda Function Details
- Presign Lambda
- Ingest Lambda
- GetCityImages Lambda
- ResizeWorker Lambda
- RenderVideoWorker Lambda
- CacheInvalidator Lambda

### Event-Driven Architecture
**[backend/event-flows.md](./backend/event-flows.md)** - Event Flows
- S3 Events  Lambda Triggers
- EventBridge Schedules
- SQS Message Flows

### Database
**[backend/storage-db.md](./backend/storage-db.md)** - Database Schema
- PostgreSQL Tables (cities, images)
- Indexes
- Relationships

---

##  Weitere Dokumentation

### Im Projekt-Root:
- **[../README.md](../README.md)** - Haupt-README mit Quick Start
- **[../AWS_ACADEMY_DEPLOYMENT.md](../AWS_ACADEMY_DEPLOYMENT.md)** - AWS Deployment Guide
- **[../DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)** - Deployment Checkliste

### Infrastructure:
- **[../infra/README.md](../infra/README.md)** - CloudFormation Template Erklrung
- **[../infra/postgres-schema.sql](../infra/postgres-schema.sql)** - PostgreSQL Schema
- **[../infra/cloudformation.yml](../infra/cloudformation.yml)** - AWS Infrastructure as Code

### Backend Code:
- **[../src/backend/README.md](../src/backend/README.md)** - Code-Struktur
- **[../src/backend/lambdas/](../src/backend/lambdas/)** - Lambda Source Code
- **[../src/backend/adapters/](../src/backend/adapters/)** - Database/AWS Adapters

---

##  Dokumentations-Struktur

```
docs/
 README.md                      Du bist hier
 ARC42.md                       Hauptdokument fr Abgabe
 *.pdf                          Spezifikationen
 backend/
     00_overview.md             Backend bersicht
     api-design.md              API Endpoints
     lambda-spec.md             Lambda Functions
     event-flows.md             Events & Triggers
     storage-db.md              Database Schema
     schemas/                   JSON Schemas
         ingest-notification.schema.json
         metadata.schema.json
         render-job.schema.json
         resize-job.schema.json
```

---

##  Hinweise

### Fr Entwickler:
- **Quick Start:** Siehe Haupt-README
- **API testen:** Siehe `backend/api-design.md`
- **Lambda entwickeln:** Siehe `backend/lambda-spec.md`

### Fr Reviewer:
- **Start:** `ARC42.md` lesen
- **Details:** Backend-Dokumentation durchgehen
- **Code:** `../src/backend/` anschauen

### Fr Deployment:
- **Guide:** `../AWS_ACADEMY_DEPLOYMENT.md`
- **Checkliste:** `../DEPLOYMENT_CHECKLIST.md`
- **Infrastructure:** `../infra/cloudformation.yml`

---

** START: [ARC42.md](./ARC42.md) - Architektur-Dokumentation**


The City Detail page attempts to load `/images/{cityslug}_{date}_{hour}.jpg`. When a file is missing you will see a placeholder describing the expected filename.

## Requirements

- Node.js (20+)
- npm

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Building

```bash
npm run build
npm run preview
```

Preview production build at [http://localhost:4173](http://localhost:4173)

## Deployment (S3 + optional CloudFront)

1. Build the static site:
   ```bash
   npm run build
   ```
2. Upload to the target bucket (example command):
   ```bash
   aws s3 sync build/ s3://weatherarchive-prod/ --delete
   ```
3. (Optional) Invalidate CloudFront to propagate changes:
   ```bash
   aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
   ```

You no longer need the previous NGINX container workflow; the output under `build/` is served directly from S3.

## Documentation

- `docs/ARC42.md`  architecture description aligned with the evaluation matrix
- `docs/Evaluation_matrix_for_the_semester_project.md`  user stories and status
- `docs/semester_project_serverless_computing_and_FAQs_2024.pdf`  course requirements

## IDE Recommendation (IntelliJ Ultimate)

### Plugins
- Svelte
- Tailwind CSS
- Prettier

### Node & Package Manager
Settings  Languages & Frameworks  Node.js
- Node interpreter: local node installation (e.g. `C:\Program Files\nodejs\node.exe`)
- Package manager: npm

### ESLint
Settings  Languages & Frameworks  JavaScript  Code Quality Tools  ESLint
- Automatic ESLint configuration

### Actions on Save
Settings  Tools  Actions on Save
- Run eslint --fix
- Run Prettier

## Linting & Formatting

Run before commits/pull requests:

```bash
npm run lint
npm run format
```

## Tech Stack

- **Framework:** SvelteKit
- **Styling:** Tailwind CSS
- **Charts:** Chart.js
- **Build Tool:** Vite
- **Linting:** ESLint
- **Formatting:** Prettier
- **Hosting:** AWS S3 (+ CloudFront for CDN)

## TODO

- [ ] Connect to real backend API
- [ ] Implement authentication
- [ ] Add video playback support
- [ ] Add image slideshow functionality
- [ ] Implement data caching
- [ ] Add more cities beyond European capitals

