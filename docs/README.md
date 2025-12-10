# WeatherArchive

Web application that displays historical weather data through API endpoints using **SvelteKit** and **Tailwind CSS**.

## Features

- **City Search** - Search through European capital cities
- **Weather Visualization** - Interactive charts showing temperature, humidity, and air pressure
- **Image Display** - View weather images for specific dates and times
- **Custom Date Picker** - Select from available dates with visual calendar
- **Hourly Data** - Browse weather data by hour with slider control
- **Modern UI** - Clean, responsive design with Tailwind CSS
- **Static Hosting** - Optimized for S3 + optional CloudFront deployment

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── DatePicker.svelte      # Custom calendar component
│   │   ├── ErrorMessage.svelte    # Error display component
│   │   ├── Header.svelte          # Application header
│   │   ├── SearchBox.svelte       # City search input
│   │   └── WeatherPlot.svelte     # Chart.js weather visualization
│   ├── pages/
│   │   ├── CityDetailPage.svelte  # City weather detail page
│   │   └── HomePage.svelte        # Main search page
│   └── styles/
│       └── app.css                # Global styles with Tailwind
├── routes/
│   ├── +layout.svelte             # Layout wrapper
│   ├── +page.svelte               # Home route
│   └── (app)/cities/[city]/
│       └── +page.svelte           # Dynamic city route
└── static/
    ├── images/                    # Weather images (cityslug_YYYY-MM-DD_HH.jpg)
    └── logo.png                   # Application logo
```

## Image Naming Convention

Place weather images in `static/images/` with the following format:
```
{cityslug}_{YYYY-MM-DD}_{HH}.jpg
```

Examples:
- `vienna_2025-01-01_08.jpg`
- `berlin_2025-01-02_14.jpg`
- `paris_2025-01-15_12.jpg`

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

- `docs/ARC42.md` – architecture description aligned with the evaluation matrix
- `docs/Evaluation_matrix_for_the_semester_project.md` – user stories and status
- `docs/semester_project_serverless_computing_and_FAQs_2024.pdf` – course requirements

## IDE Recommendation (IntelliJ Ultimate)

### Plugins
- Svelte
- Tailwind CSS
- Prettier

### Node & Package Manager
Settings → Languages & Frameworks → Node.js
- Node interpreter: local node installation (e.g. `C:\Program Files\nodejs\node.exe`)
- Package manager: npm

### ESLint
Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
- Automatic ESLint configuration

### Actions on Save
Settings → Tools → Actions on Save
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
