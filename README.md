# WeatherArchive

Web application that displays historical weather data through API endpoints using **SvelteKit** and **Tailwind CSS**.

## Features

- **City Search** - Search through European capital cities
- **Weather Visualization** - Interactive charts showing temperature, humidity, and air pressure
- **Image Display** - View weather images for specific dates and times
- **Custom Date Picker** - Select from available dates with visual calendar
- **Hourly Data** - Browse weather data by hour with slider control
- **Modern UI** - Clean, responsive design with Tailwind CSS

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

## Docker

Build and run with Docker:
```bash
docker build -t weatherarchive .
docker run -p 8080:80 weatherarchive
```

Or use the build script:
```bash
build-docker-tar.cmd
```

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

## TODO

- [ ] Connect to real backend API
- [ ] Implement authentication
- [ ] Add video playback support
- [ ] Add image slideshow functionality
- [ ] Implement data caching
- [ ] Add more cities beyond European capitals
