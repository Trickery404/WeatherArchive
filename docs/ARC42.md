﻿# 1. Introduction and Goals

## 1.1 Requirements Overview

The WeatherArchive frontend fulfills the user facing backlog from the Semester Project Specification and the evaluation matrix:

- **Search & Navigation (Stories 15)**: landing page with logo, guided search bar, autocomplete restricted to curated cities, and routing to the city detail page.
- **Observation Experience (Stories 610)**: detail page combines hero media slot for images, interactive chart, date picker, hour slider, and contextual error handling.
- **Data Ingestion & API (Stories 1130)**: currently scoped as future backend services (webcam ingestion, API security, storage, video creation). They are documented as planned interfaces and constraints.
- **Non-functional Deliverables (Stories 3135)**: arc42 documentation, presentation, frontend draft, and code quality practices captured in this document and the repository tooling.

## 1.2 Quality Goals

| Priority | Goal | Description |
| --- | --- | --- |
| Q1 | Fast perception | Search and navigation respond in <300 ms locally; image loads provide feedback so users perceive responsiveness even when assets are missing. |
| Q2 | Reliable data access | Date/hour controls never allow unavailable combinations; optimistic UI always communicates when data or media cannot be displayed. |
| Q3 | Deployable artifact | `npm run build` must produce a deterministic static bundle that can be synced to S3 without manual tweaks. |
| Q4 | Evolvable backend | Frontend isolates backend calls behind fetch utilities so upcoming API increments (stories 1130) can be integrated without refactors. |

## 1.3 Stakeholders

| Role/Name | Contact | Expectations |
| --- | --- | --- |
| Product Owner / Lecturer | Semester project supervisor | Traceability to specification, measurable quality goals, presentable demo. |
| End Users (Students, Public) | Via web UI | Straightforward search, meaningful media + metrics per city/time. |
| Webcam Providers | API client backlog | Secure upload endpoints, API keys, predictable error codes. |
| DevOps / Cloud Team | AWS contact | Clear S3 deployment runbook, secrets separation, minimal manual steps. |

# 2. Architecture Constraints

- **Technology**: SvelteKit + Vite, Tailwind CSS, Chart.js, TypeScript, AWS (Lambda, API Gateway, S3, RDS, Redis).
- **Tooling**: Node.js 20+, npm, ESLint/Prettier enforced by CI instructions.
- **Deployment**: Static assets uploaded to an AWS S3 bucket with Static Website Hosting enabled. No CloudFront distribution is used.
- **Assets**: Weather images and videos are stored in their respective S3 buckets with naming convention `{cityslug}_{YYYY-MM-DD}_{HH-MM}.jpg`.
- **Security**: Backend Service is secured through API keys.

# 3. Context and Scope

## 3.1 Business Context

| Actor  | Interaction |
|--------| --- |
| User   | Uses browser UI to search cities and inspect historical weather slices.|
| Webcam | Planned to POST images + metadata to backend.|
| Lambda | Serve curated weather data, metadata, and media references.|

## 3.2 Technical Context

| External System | Technology                                  | Interface                                                           |
|-----------------|---------------------------------------------|---------------------------------------------------------------------|
| Browser         | HTML5, JS, CSS                              | SvelteKit routes, static assets, fetch calls.                       |
| API Gateway     | REST/JSON over HTTPS, calls Lambda Functions | `/api/events`, `/api/weather` (per spec).                           |
| Object Storage  | Three AWS S3 buckets                        | Stores images, resized images and videos. |
| Redis Cache     | AWS ElastiCache (Redis Cloud)       | Caches query results with 1-hour TTL. Reduces database hits for repeated queries. |
| Database        | RDS Postgres                                | Stores metadata (cities, images, capture times, weather data)       |


# 4. Solution Strategy

**1. Serverless backend on AWS**\
Core backend functionality (ingestion, querying, image processing, video generation) is implemented using AWS Lambda, API Gateway, S3, RDS (PostgreSQL) and Redis.
(Details: Sections 5, 7, 8)

**2. API Gateway as single entry point**\
All external webcams go through a API Gateway, which performs routing and API-key validations.
(Details: Sections 5, 8)

**3. Event-driven media processing**\
Image resizing and video generation are triggered asynchronously using event triggers after data ingestion.(Details: Sections 5, 6)

**Separation of metadata and binary data**\
Weather metadata is stored in PostgreSQL, while images and videos are stored in multiple S3 Buckets.
(Details: Sections 5, 8)
**Cache-first data access**\
Frequently requested weather data (topic + time range) is cached in Redis before accessing the database.
(Details: Sections 5, 8)

**Frontend, backend-driven logic**\
The web application focuses on search, selection, and visualization, while all business logic resides in backend services.
(Details: Sections 5, 6)

# 5. Building Block View

## 5.1 System Overview

![Whitebox Diagram](https://www.plantuml.com/plantuml/dpng/VPD1Rzf048Nl-oj6EIMgeggGKmzL81Y4H1M2ALoGgi4xDQlQwtHt3Kgh_lUEFTXWIdl3Ez--zvYPVVG1NIZpJ6NqBK0em9bq5q0RHqamXLKAar0uMDCsmVpuySMJKweYqAOPmGrNOUYA0vzlxEtO5JQGrH3F1tStW1x6KGSVh6DuoefIty0lfG3EI_CfJ33G0T_gc_mzMLymCyot6ZSsvYmqpJ6b6frzk8wzbEJUreHXHsw40GNkNOVd9WcbevZStYG4jmlovYT1xN8dD_lNRwwCfc92bXnoBa4V5BEQFRVe6LsCOdOeV4ZPuMMsiPyfe6uYSRMhl21jF3nXiYC1ej6qGZphOyf0t8TXcNodiB4BF4X8NwDn_-jYiFu76saJI5_WhBsypii_Qy7LT1GzTuD6Ux9Xw8nEYQV2SNMPaRGWMYtLRwLaVU3-_fDC53x2_3bUWgaom3l8ZurGuwW3JQ8Zuz_lwnJdh1AAUPuzmrLs0eU7lsJFoHwJFwgLKDKQLsVrUh92zLCQnqWhqrHuF7pSA8AnILPgOzCpmrVUCRYD-z9Qo8e4gpTqfqHL_Fki4fn9KpPtzNOfFkDICmMkoxaMsQOi0SfNjgTJZeDXJvA9db8enOqNluUgCp8JHkekGYfhojaKro-zKNS4_OcHuJUj5Z6f_ZUUc4ekxdzBonnQM6hTBDmfsbCRf7SHf2N4eo7agN0vuSV3CrAFP7MPPty0)


| Building Block                   | Purpose / Responsibility                                                                              | Interfaces                           | Notes / Dependencies                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| **API Gateway**                  | Entry point for all incoming requests. Receives image uploads from webcams and queries from frontend. | HTTP REST API                        | Routes requests to Lambda functions.                                   |
| **StoreImage Lambda (L1)**       | Handles storage of raw images in S3 and metadata in RDS.                                              | Invoked by API Gateway               | Triggers PictureService Lambda on new S3 uploads.                      |
| **PictureService Lambda (L3)**   | Resizes images and stores edited images in S3. Updates metadata in RDS.                               | Triggered by S3 events               | Can scale independently per image.                                     |
| **VideoGenerator Lambda (L4)**   | Generates videos from edited images and stores them in S3. Updates metadata.                          | Triggered by EventBridge (scheduled) | Optional metadata update ensures traceability.                         |
| **QueryWeatherData Lambda (L2)** | Handles frontend requests for images, videos, and metadata.                                           | Invoked by API Gateway               | Uses Redis cache for performance (optional).                           |
| **RDS PostgreSQL**               | Stores metadata about images, edited images, and videos.                                              | SQL interface                        | Maintains relationships between raw images, resized images, and videos. |
| **S3 Buckets**                   | Store raw images, edited images, and videos.                                                          | S3 API                               | Separate buckets for organization and lifecycle management.            |
| **EventBridge Scheduler**        | Triggers periodic Lambda functions (e.g., VideoGenerator).                                            | EventBridge schedule                 | Optional cron-based scheduling.                                        |
| **Redis Cache**                  | Caches query results for performance with 1-hour TTL.                                                 | Redis interface (ioredis)            | Reduces repeated S3/RDS queries. Cache keys: city:slug:images |
| **Web Browser (Frontend SPA)**   | Displays images, videos, and metadata to users.                                                       | REST API to QueryWeatherData         | Single-page application using modern JS framework.                     |

## 5.2 Level 2
![Whitebox Diagram](https://www.plantuml.com/plantuml/dpng/XPJFRjim3CRlVWgYbwOOYg59JpqC_HCt292XQPmrbm23Qh6EC5lk93b1D-pTHzE2QciDvfl07_bzb4XVMoUCQweoAV75WQl1g6BdG2g3kLErJXAHkzh01fzpKVd3DuicILf2wA94EA4et9hwOD5izUZUrDgXbf0jRyvEG5YuJmVupIQ3kx9kv0dyJXA0VcWvXvbmU11ld4ddsIPY5g9wbcAhC_A2yqeK2AF5HQUqkA2IG9-k7NRDy17W75QOezgZ1SKvBwQkeASNEAvhmOY39vM6R08hEhEQZSaAdP32YHPSJJCOAPsNZLIwQFDUXTkTXPGrUIhGM5Ygt3K6CpHxbIDqJJ66Mh9zElmvqlfZW-PjWrGPpRHL7Yt6_WB67sT4SgCLMlKBkuREA7tYqoSVfpyfYVKCDHf1FHD_wVdBrc7R_BEmn5Fxf5LRLv3MusAhl_gxOPgYm_8hbCh2dSXts07fTDuYbaH4GG3TtssJ_q2trU_tpsWs-RwwsHnXKwaSoWYdskiZFBSNmAVvD7qO6attgDsjKR906ZooAviI3IUaJ-k4tkcKrmAKTcW4xuvDkgs1y_CltI335ImVihKVgqzXS9BxT03DKi_OptjsrcTPXcZUgjF-18FpmvLm8OPe8QwuPUI1ZfNxv9Z8d-rWjMLxozND0BoKjE09rIFOt_w_fNsSry07WnQC3ihjtbU2QtZj2T7UFHWUJJ8HxKXaPCAP_bs3M9SiEpSC1JVDAxdesM4to9FIuUohrOscVQ1BpzrPlcmr_IH8u7U2WdFunqdneJ-3GWxah6V2o8Kck1X5_sUUkU0w_Yb4zpKErVmpXs8SYxmwet2FmUWuDXe8zX08Nc0AvxJIIXV0vQzHowOg_m80)

**Purpose / Responsibility:**
* Receives image uploads from API Gateway.
* Stores raw image in S3 (Raw Images bucket).
* Stores metadata in RDS, including reference to the raw image in S3.
* Triggers PictureService Lambda via S3 event.

**Interface(s):**
* Input: JSON payload from API Gateway containing:
* Image file (binary or base64)
* Webcam ID
* Timestamp
* Optional tags/metadata
* Output: HTTP response (status code, image ID).

**Quality / Performance Characteristics:**
* High availability, stateless.
* Scales automatically with AWS Lambda concurrency.
* Ensures metadata consistency with raw S3 image.

**Directory/File Location (optional):**
```
lambda/store_image/
```
**Fulfilled Requirements:**
* Raw image persistence
* Metadata storage
* Integration with resize workflow

**Open Issues / Risks:**
* Handling large image uploads may require multipart upload to S3.
* Ensuring atomicity: metadata must not exist without a corresponding raw image.

# 6. Runtime View

- TODO -  Question: Do we need more scenarios? (eg. lambda calls, webcam api interactions...)

## 6.1 Scenario 1  City Search and Navigation
1. User enters a string on `/`.
2. `HomePage` filters capitals and renders the suggestion list.
3. On selection or enter, SvelteKit `goto` pushes `/cities/<slug>`.
4. Layout component keeps header/logo visible for navigation (story 9).

![Whitebox Diagram](https://www.plantuml.com/plantuml/png/NP912jim44NtEiNWbRC8fbjJGY2q119AYUckcwazLGOKoPN60UzwXzwm9wcKQKoSbMtzDrz_FjudmIZJpHbXSGHTJnuZ1_W0Vt__WGFB31rXxA-0Ve0lU6UBmi4RWxs42DyIHJDc3-vvH2zG7SEDlg8bg9jD1PYW7AoH0uuiw3wp4uhVVSq-yK3mdDGnLTU3tPtouOa5Bc7AwWFKrpLOWXUhRDxqB4of-PZSP7Vg_PJNGsUSirKUEH8E59jpi45vLOmfsy9szqZQmYSl525fFKaYUskAKWXDtyBFn_F_mgd-DL6SDqPLs2vMYj40ZfCi9kMw5YxaXtBFP2sbqhr2Rs4wSjJBAnKYZ95IqfoBgTRLWWqIwchTJhKnHlLCBYsrS0uuG2Pd6FFt2wB5j70Y6k6gjRbS6zmvyGz7nZnDOFksaFeDA6Zs-I3_W_y0)

## 6.2 Scenario 2  Date & Hour Selection with Media Feedback
1. User selects a date via `DatePicker`; component dispatches `change` event.
2. City page validates date against `availableDates` and updates the bound slider range.
3. When hour changes, the computed `imagePath` updates; `<img>` begins loading.
4. `on:load` toggles `imageExists`; metrics and chart remain visible.
5. `on:error` surfaces descriptive placeholder plus expected filename, fulfilling story 10.

![Whitebox Diagram](https://www.plantuml.com/plantuml/png/TP51RXGn44NtFiLN5cH6m8PbYumY3I2oY3JIY1sRYhleBetRRjdkIH12oXsu0mVBIR2TRXfBOLcbLz__Vr-7I3vEWr5Hec4SDLloul0EJu-_y84YunK-kydZo8Pr56TnBx77BRT2-CJStf4-AKKwEeylWRqQawHe6Sb6N6I9W-WJ-mjGm3hMs5xYzmDrNA1bg97iucYadPNMiSPkXdI9lHj6Pzd6htRpNePkjor7DqDNqxSSlUYGGkxxj2_Gl5Cgfy7RtJ-ccxa6j6cbrdsc5jSDMWaZHTrlBdLFjkFBDuNVAhKmDNyc8nae5AWZiI62pYI6xWpdPq9rkcPlC8tbAfGHFh-tEA_1VV62FgtKkg-TB68b9BSP-uzddGgU4YgvxWF5lWwNYcwGYqVm-kh7N-edZADMRFVq-7kdLC9gMMUR35HQytyqE36FE4kGL0esrk6vtcr5v-ZDiwsF3n9Ym1MYd_ZbnzXxvr-uF_Rk7gCXpRqpkQRNu8Unb89lOjZImEgQRJiDvWy0)


# 7. Deployment View

## 7.1 Infrastructure Level 1
- **Motivation**: Provide reproducible deployments for grading and AWS hosting.
- **Quality Attributes**: Immutable artifacts, quick propagation through AWS edge caches, minimal ops steps.
- **Mapping**: `npm run build` creates the static `build/` folder; the output is uploaded to an AWS S3 bucket (`weatherarchivebucket`) via `aws s3 sync build/ s3://weatherarchivebucket/ --delete`. The frontend is served via S3 Static Website Hosting. No CloudFront, no container runtime is required.

## 7.2 Infrastructure Level 2
- **Local Dev**: `npm run dev` with Vites Hot Module Reload.
- **Artifact Publishing**: 
```
npm run build
aws s3 sync build/ s3://weatherarchivebucket/ --delete
```

- **AWS Hosting**: 
Frontend: S3 Static Website Hosting (http://weatherarchivebucket.s3-website-us-east-1.amazonaws.com)
Bucket: weatherarchivebucket (Region us-east-1)
Block Public Access: deaktiviert
Bucket Policy: Öffentlicher Lesezugriff (s3:GetObject für Principal: "*")
Index/Error Document: index.html
Backend APIs: API Gateway + Lambda + RDS/Redis
Backend S3 Buckets:
- weatherarchive-raw (raw uploaded images)
- weatherarchive-edited (resized images from PictureService)
- weatherarchive-videos (generated time-lapse videos from VideoGenerator)

# 8. Cross-cutting Concepts

![Whitebox Diagram](https://www.plantuml.com/plantuml/png/VL9DRvj04BtpAqPS8ZMrbQWtr5Pn_Q5QRI_1JgJUnZ25LVQ3xivQigl-zowi2BX6uSBExEEznynxS8oMlP892vO4AwDGQ5ZhK9xWXob9mWnsDS4p8TTaOM6BMXmfIToBq0rQL518T6x1RCN1CsqBetDn9hXBaXlu59v89yXrLP9qUDYPHXJm9m6u5MK6-_rsrPurAieW3sIwWlZ03PpdN-QGFWdI6jCMvgIlhc7fSK2mK7Gs-fKi-TihFzEXGFMsT5jZ8xxHQToHfa0MHazmnl7aKXHqpTnwSOogoM25JBjGTcrI3LbaRuFkHXhajbjx9Sem_b6hiUJSW1fajmgh2JttuJ_Z1JQjIhdWImU1rqW__KjFeYHppHqS2rFcZ7R4DLoiTJcq9xquHlQkxrniE5z-NQ_stzUhzx1yN2zsxM6ps8R6O6k9HKqXKVOKlRqCx30a8QRh5dwIO8jUTKEmX7mz0sQPKmXj6JnjDLD5DgZrsNqasQtSrQBf0np9q_iKFivcaDxDv-_IFbKPT26X4f0dWPTHoS0S7DbZr81VnYRZ--xRsUnpzuxBpk1rcMvQ82uk0-ULGdkAPSiSJptbj9s35v8trgZftnoFltKI2WU_FLb1qVrmttqnqheVd2ayBOrc5FeA_vOth2fBLJlSi3zC7aYNNib_)
- **Styling & Branding**: Tailwind design tokens (`app.css`) maintain consistent typography and colors for both pages.
- **Error Handling**: `ErrorMessage.svelte` centralizes readable messages per story 10.
- **Configuration**: Available dates/hours currently hardcoded but isolated so they can be fetched; image naming enforced globally.
- **Observability**: Runtime feedback (loading spinners, placeholders) proxies for traditional logging in the static frontend; future API integration should forward correlation IDs.
- **Security**: API Gateway enforces API key authentication via x-api-key header (Stories 12-13). Lambda functions validate city_slug against cities table to prevent uploads to invalid cities. HTTPS endpoints ensure encrypted data transmission. AWS IAM roles restrict Lambda execution permissions.
- **Caching Strategy**: Redis cache implemented with ioredis client in queryWeatherData Lambda. Cache keys follow pattern: city:{slug}:images[:{date}][:{hour}]. TTL set to 3600 seconds (1 hour). Cache hit reduces response time. Automatic expiry handles cache invalidation.

# 9. Architecture Decisions

| ID     | Decision                                       | Status | Rationale                                                                                                                                                                                                               |
|--------|------------------------------------------------| --- |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ADR-01 | Use SvelteKit + Tailwind for UI                | Accepted | Matches course tech stack, supports fast prototyping.                                                                                                                                                                   |
| ADR-02 | Host static build on AWS S3 Static Website Hosting | Accepted | S3 Bucket with active Static Website Hosting and public access; website accessible via S3 endpoint URL (`http://weatherarchivebucket.s3-website-us-east-1.amazonaws.com`). |
| ADR-03 | Mock data until backend ready                  | Accepted w/ debt | Keeps focus on UX backlog while API stories are pending.                                                                                                                                                                |
| ADR-04 | Image naming convention `{city}_{date}_{hour}` | Accepted | Enables deterministic lookup without metadata service.                                                                                                                                                                  |
| ADR-05 | Create API Gateway with authentication         |        |                                                                                                                                                                                                                         |

# 10. Quality Requirements

## 10.1 Quality Requirements Overview

| Attribute | Description |
| --- | --- |
| Usability | Users immediately recognize logo/search entry points; controls show availability hints. |
| Performance | Initial page load budget < 1.5 MB (current static bundle fits); interaction latency dominated by local filtering. |
| Reliability | Deterministic filenames prevent 404 ambiguity; app surfaces guidance when images are missing. |
| Maintainability | Components stay isolated so new sensors or metrics can be added without touching the routing shell. |

## 10.2 Quality Scenarios

| Scenario | Trigger | System Reaction |
| --- | --- | --- |
| Image Missing | Expected media file not present in `static/images` or S3 | Placeholder panel displays filename + guidance so the user understands the gap. |
| Invalid Date Selection | User selects date/hour without data | DatePicker + slider restrict values; `ErrorMessage` tells the user to choose an available slot. |
| Deployment Regression | `npm run build` fails or emits warnings | CI/deployer halts; no files uploaded to S3 until build succeeds, preventing half-baked releases. |

# 11. Risks and Technical Debts

- **Backend Implementation Status**: Stories 11-25 completed (API Gateway, Lambda functions for upload/query, Redis cache, PictureService for image resizing). Frontend no longer uses mock data, full API integration active. Stories 26-30 (VideoService with scheduled generation) remain open.
- **Asset Scale**: Up to 14 images per city/day currently planned; growth requires CDN/S3 integration to avoid bloated repository.
- **Caching Strategy**: Redis cache implemented (Stories 18-22 completed). Cache Hit/Miss logic active with 1-hour TTL. Automatic expiry handles invalidation, no manual cache clearing implemented.
- **Video Service**: Future addition of scheduled video rendering (stories 2630) may impact UI (player component) and storage cost.

# 12. Glossary

| Term | Definition |
| --- | --- |
| Weather Slice | Combination of city, date, and hour representing one observation. |
| Capital Catalog | Curated list of European capitals offered in autocomplete. |
| Media Slot | UI area currently showing an image but designed to host video playback later. |
| Evaluation Matrix | Spreadsheet in `docs/Evaluation_matrix_for_the_semester_project.md` enumerating backlog items and status. |
| Semester Project Specification | Official PDF outlining functional and non-functional requirements for the course project. |

