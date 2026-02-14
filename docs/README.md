# WeatherArchive - Documentation Index

This documentation describes the architecture, API design and backend implementation of the WeatherArchive project.

---

## For Project Submission

### Arc42 Architecture Documentation
**[ARC42.md](./ARC42.md)** - **MAIN DOCUMENT FOR SUBMISSION**

Contains:
- 1. Introduction and Goals
- 3. Context and Scope
- 4. Solution Strategy
- 5. Building Block View
- 9. Architecture Decisions

### Project Specification
- **[semester_project_serverless_computing_and_FAQs_2024.pdf](./semester_project_serverless_computing_and_FAQs_2024.pdf)** - Official requirements
- **[Evaluation_matrix_for_the_semester_project.md](./Evaluation_matrix_for_the_semester_project.md)** - Evaluation criteria

---

## Backend Documentation

**See [ARC42.md](./ARC42.md)** for complete backend architecture:
- **Section 5.1:** Building Block View - Lambda Functions, Services, Data Flow
- **Section 5.2:** StoreImage Lambda Details
- **Section 5.3:** Database Schema (PostgreSQL) - Cities and Images Tables
- **Section 6:** Runtime View - Scenarios and Flow Diagrams
- **Section 7:** Deployment View - AWS Infrastructure
- **Section 8:** Cross-cutting Concepts - Security, Caching Strategy, Error Handling

---

## Project Status

**Implemented (30/50 Story Points):**
- Frontend (Stories 1-10): Homepage, Search, City Detail Page with Datepicker/Slider
- API Gateway + Lambda (Stories 11-15): Webcam Upload, Metadata Storage, Query API
- Redis Cache (Stories 16-22): Cache Hit/Miss Logic, 1h TTL, 100x Performance Gain
- Picture Service (Stories 23-25): Image Resize, S3 Storage, DB Update

**Open (20/50 Story Points):**
- Video Service (Stories 26-30): Scheduled Video Generation, FFmpeg Lambda
- Documentation Final (Stories 31-33): Arc42 Finalization, Video Presentation, Code Quality Review

**Deployment:**
- Frontend: http://weatherarchivebucket.s3-website-us-east-1.amazonaws.com
- API Gateway: https://iuuqxsiemk.execute-api.us-east-1.amazonaws.com/dev
- Database: PostgreSQL RDS (8 Cities, Images Table)
- Cache: Redis Cloud (redis-11215.c240.us-east-1-3.ec2.cloud.redislabs.com)

---

## Additional Documentation

### Infrastructure:
- **[../infra/postgres-schema.sql](../infra/postgres-schema.sql)** - PostgreSQL Schema (with current column names: s3_unedited_key, s3_edited_key, s3_video_key)
- **[../infra/s3-cors.json](../infra/s3-cors.json)** - S3 CORS Configuration

---

## Documentation Structure

```
docs/
├─ README.md                      You are here
├─ ARC42.md                       Main document for submission
└─ *.pdf                          Specifications
```

---

## Notes

### For Developers:
- **Quick Start:** See main README in project root
- **API Testing:** See ARC42.md Section 5

### For Reviewers:
- **Start:** Read `ARC42.md`
- **Details:** Review Backend Documentation sections
- **Code:** Check `../src/` directory

### For Deployment:
- **Infrastructure:** `../infra/postgres-schema.sql`
- **Frontend Build:** `npm run build` then sync to S3

---

**START HERE: [ARC42.md](./ARC42.md) - Architecture Documentation**

