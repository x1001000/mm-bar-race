# MacroMicro Bar Race Extension

A Chrome extension that adds animated bar race visualization to Highcharts on MacroMicro.me

## Features

- Converts MacroMicro line charts into animated bar race charts
- Horizontal bars with automatic sorting/racing effect
- Preserves original data and colors from the chart
- Large animated date display
- Easy toggle between original view and bar race view
- Smooth 200ms frame animations showing data changes over time

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this project folder (`/Users/PHIL/Downloads/mm-bar-race/`)
5. The extension is now installed!

## Usage

1. Go to any MacroMicro chart page, for example:  
   https://www.macromicro.me/collections/4093/us-big-tech/109709/big-techs-m7-capex  
   https://www.macromicro.me/charts/109709/big-techs-m7-capex

2. You'll see a floating "📊 Bar Race" button in the top right

3. Click the button to transform the chart into an animated bar race

4. Click "📈 Original View" to switch back to the original chart

## How It Works

The extension uses a two-script architecture:

1. **content.js** - Runs in the extension context:
   - Injects the page script into the page context
   - Creates the toggle button UI
   - Handles messaging between contexts

2. **page-script.js** - Runs in the page context:
   - Has access to the page's Highcharts global object
   - Fetches chart data from MacroMicro API
   - Transforms time series data into bar race format
   - Destroys and recreates the chart as a bar race
   - Animates through the time series showing value changes
   - Restores the original chart when toggled off

## Data Flow

1. User clicks the bar race button
2. Content script sends message to page script
3. Page script extracts chart ID from URL
4. Fetches data from: `https://www.macromicro.me/charts/data/{chart_id}`
5. Transforms data and recreates chart as bar race
6. Animates through dates with 200ms intervals

## Based On

- Highcharts Bar Race: https://www.highcharts.com/demo/highcharts/bar-race
- MacroMicro Charts: https://www.macromicro.me/

## Files

- `manifest.json` - Extension configuration and permissions
- `content.js` - Content script (extension context)
- `page-script.js` - Page script (page context, has Highcharts access)
- `README.md` - This file
- `CLAUDE.md` - Project instructions
