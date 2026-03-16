# Meeting Tiles Layout - Visual Guide

## Current Layout (Before)
```
┌─────────────────────────────────────────────────────────┐
│                    Calendar View                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Upcoming Meetings                       │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │ Meeting 1 - Full Width Card                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Meeting 2 - Full Width Card                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Meeting 3 - Full Width Card                       │  │
│  └───────────────────────────────────────────────────┘  │
│  ... (all meetings shown)                               │
└─────────────────────────────────────────────────────────┘
```

## New Layout (After)
```
┌─────────────────────────────────────────────────────────┐
│                    Calendar View                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Upcoming Meetings                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Meeting 1  │  │  Meeting 2  │  │  Meeting 3  │     │
│  │   Tile      │  │   Tile      │  │   Tile      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Meeting 4  │  │  Meeting 5  │  │  Meeting 6  │     │
│  │   Tile      │  │   Tile      │  │   Tile      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Meeting 7  │  │  Meeting 8  │  │  Meeting 9  │     │
│  │   Tile      │  │   Tile      │  │   Tile      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ← Previous  |  Showing 1-9 of 27  |  Next →    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Responsive Layouts

### Tablet (768px - 1024px)
```
┌───────────────────────────────────────┐
│        Upcoming Meetings              │
├───────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐        │
│  │Meeting 1 │    │Meeting 2 │        │
│  └──────────┘    └──────────┘        │
│                                       │
│  ┌──────────┐    ┌──────────┐        │
│  │Meeting 3 │    │Meeting 4 │        │
│  └──────────┘    └──────────┘        │
│                                       │
│  ... (up to 9 meetings in 2 cols)    │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │    Pagination Controls          │ │
│  └─────────────────────────────────┘ │
└───────────────────────────────────────┘
```

### Mobile (<768px)
```
┌─────────────────────┐
│  Upcoming Meetings  │
├─────────────────────┤
│  ┌───────────────┐  │
│  │   Meeting 1   │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │   Meeting 2   │  │
│  └───────────────┘  │
│                     │
│  ... (up to 9)      │
│                     │
│  ┌───────────────┐  │
│  │  ← Previous   │  │
│  ├───────────────┤  │
│  │ Showing 1-9   │  │
│  ├───────────────┤  │
│  │    Next →     │  │
│  └───────────────┘  │
└─────────────────────┘
```

## Tile Content Structure

Each tile maintains all current information:

```
┌─────────────────────────────────┐
│ 📅 Customer Meeting             │ ← Title
│ 👤 Acme Corp                    │ ← Customer
│ 📅 Mar 20, 2026 - Mar 22, 2026  │ ← Date Range
│ 👥 Ricardo, Jukka, Máté         │ ← Participants
│ 📍 Helsinki Office              │ ← Location
│ ┌─────────────────────────────┐ │
│ │ 🏢 On-site - Finland        │ │ ← Badge
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## Key Features

### Grid Layout
- **Desktop**: 3 columns (repeat(3, 1fr))
- **Tablet**: 2 columns (repeat(2, 1fr))
- **Mobile**: 1 column (1fr)
- **Gap**: 20px between tiles

### Pagination
- **Items per page**: 9 meetings
- **Controls**: Previous/Next buttons + info text
- **Info format**: "Showing X-Y of Z meetings (Page N of M)"
- **Behavior**: 
  - Previous disabled on page 1
  - Next disabled on last page
  - Smooth scroll to top on page change
  - Reset to page 1 on filter change

### Hover Effects
- **Before**: translateX(5px) - slides right
- **After**: translateY(-5px) - lifts up
- **Shadow**: Enhanced on hover (0 8px 16px)

### Flexible Height
- Tiles adjust to content
- No fixed height constraint
- Maintains consistent spacing

## CSS Grid Implementation

```css
#meetingsList {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 20px;
}

/* Pagination spans all columns */
.pagination-controls {
    grid-column: 1 / -1;
}

/* Empty state spans all columns */
.empty-state {
    grid-column: 1 / -1;
}
```

## State Management

```javascript
// Global pagination state
const MEETINGS_PER_PAGE = 9;
let currentPage = 1;
let totalPages = 1;

// Calculate pagination
totalPages = Math.ceil(upcomingMeetings.length / MEETINGS_PER_PAGE);

// Get current page slice
const startIndex = (currentPage - 1) * MEETINGS_PER_PAGE;
const endIndex = startIndex + MEETINGS_PER_PAGE;
const paginatedMeetings = upcomingMeetings.slice(startIndex, endIndex);
```

## User Interactions

1. **View Meetings**: See 9 meetings in 3x3 grid
2. **Navigate Pages**: Click Previous/Next buttons
3. **Click Tile**: Opens edit modal (existing behavior)
4. **Filter Participants**: Resets to page 1, shows filtered results
5. **Refresh**: Resets to page 1, reloads all meetings
6. **Responsive**: Layout adapts to screen size automatically