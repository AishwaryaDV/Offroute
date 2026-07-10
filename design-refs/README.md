# Design references

Screenshots from Google Maps and Polarsteps used as direct design targets for Offroute's UI.

## Google Maps references (`offroutedesignreference/`)

| File | What it shows | Offroute reference for |
|---|---|---|
| `gmaps-saved-list-places-with-photos.png` | Saved list with place cards, photos, ratings | Dashboard circuit list / point list with thumbnails |
| `gmaps-saved-list-coordinates-suggestions.png` | List scrolled — coordinates, suggested places | Point metadata display, coordinates |
| `gmaps-map-pins-peek-sheet.png` | Map with scattered pins, title peek at bottom | Circuit map view — pin layout + peekable bottom sheet |
| `gmaps-pin-selected-detail-sheet.png` | Selected pin, detail + action buttons in sheet | Point selected state — tap pin → bottom sheet detail |
| `gmaps-place-detail-photo-carousel-tabs.png` | Full detail — photo carousel, tabbed content | Point detail expanded — carousel + tabs |

## Polarsteps references

### Onboarding & permissions (`offroutedesignreference/`)

| File | What it shows | Offroute reference for |
|---|---|---|
| `polarsteps-notification-opt-in-prompt.png` | "Want to stay in touch?" prompt | PWA notification opt-in modal (future) |
| `polarsteps-location-permission-guidance.png` | Location permission guidance screen | Location permission UX — guidance before browser prompt |
| `ios-location-permission-always-precise.png` | iOS Settings location config | Reference for what permission level looks like |

### Home, profile & settings (`offroutedesignreference/` + loose)

| File | What it shows | Offroute reference for |
|---|---|---|
| `polarsteps-home-profile-globe-cta.png` | Home — globe, avatar, stats, "Add a trip" | Dashboard/home — hero + user info + create CTA |
| `polarsteps-settings-menu.png` | Settings menu list | Settings page menu structure |
| `polarsteps-profile-edit-form.png` | Profile edit — avatar, name, city, bio | Profile edit form layout |
| `polarsteps-account-settings.png` | Account — email, password, privacy, delete | Account settings section |
| `polarsteps-notifications-empty-state.png` | Notifications empty + enable prompt | Empty state pattern + notification prompt |

### Circuit creation & detail

| File | What it shows | Offroute reference for |
|---|---|---|
| `polarsteps-trip-type-picker-bottom-sheet.png` | "What kind of trip?" bottom sheet | Circuit type picker modal |
| `polarsteps-new-trip-form-cover-dates-visibility.png` | New trip form — cover, dates, name, visibility | Create circuit form layout |
| `polarsteps-trip-detail-empty-with-sync-banner.png` | Trip empty state + notification banner | Circuit detail empty state (with banner) |
| `polarsteps-trip-detail-empty-clean.png` | Trip empty state (clean, no banner) | Circuit detail empty state (target look) |

### Sharing & stats

| File | What it shows | Offroute reference for |
|---|---|---|
| `ios-share-sheet-circuit-sharing.png` | iOS native share sheet | Share circuit — Web Share API integration |
| `polarsteps-share-trip-preview-card.png` | Share screen — preview card + targets | Share circuit screen layout |
| `polarsteps-trip-stats-menu-panel.png` | Trip stats + menu (km/days/views/likes) | Circuit stats/menu panel |

### Map & points

| File | What it shows | Offroute reference for |
|---|---|---|
| `polarsteps-map-settings-style-switcher.png` | Map settings — 2D/3D, style options | Map style switcher UI |
| `polarsteps-add-step-form-map-date-photos.png` | Add step — map, name, date, photos, notes | Add/edit point form layout |
| `polarsteps-trip-map-carousel-zoomed-out.png` | Trip map (zoomed out) + step card carousel | Circuit map — full-screen map + bottom card carousel |
| `polarsteps-trip-map-carousel-zoomed-in.png` | Trip map (zoomed in) + step card carousel | Circuit map — zoomed to location |
| `polarsteps-trip-map-timeline-day-carousel.png` | Trip map + "Day 1" timeline + step cards + insert buttons | Circuit map — timeline bar + horizontal step carousel |
