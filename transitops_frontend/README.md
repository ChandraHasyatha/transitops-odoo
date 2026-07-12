# TransitOps — Frontend (Person C)

React + Vite + Tailwind + React Router. Talks to Person A/B's Django REST
backend over JWT.

## Run it

```bash
cd frontend
npm install
cp .env.example .env      # point VITE_API_URL at A's Django server
npm run dev
```

Opens at http://localhost:5173. Django must have CORS open for this origin
(already set in Step 0 of the backend guide — `CORS_ALLOW_ALL_ORIGINS = True`
for the hackathon).

## What's wired up already, matching the backend guide exactly

- `POST /api/token/` → login, JWT decoded client-side for `role` + `username`
  (Step 3 — no `/me` call needed).
- `POST /api/token/refresh/` → silent refresh on 401, via an axios interceptor.
- `GET/POST/PUT/DELETE /api/vehicles/`, `/api/drivers/` → full CRUD screens
  (Step 5), with `filterset_fields` (`vehicle_type`, `status`, `region` /
  `status`) exposed as UI filters.
- `GET/POST /api/maintenance/` + `POST /api/maintenance/<id>/close/` (Step 6,
  Rules 8/9) → open/close workflow, vehicle flips to "In Shop" and back.
- `GET/POST /api/fuel-logs/`, `/api/expenses/` (Step 6).
- `GET /api/dashboard/` (Step 7) → KPI cards + a status-breakdown chart, with
  `vehicle_type`/`region` passed through as query params.

## Assumed, not yet confirmed with B

Trip endpoints in `src/api/client.js` (`tripsApi`) assume the same
ModelViewSet + `@action` pattern A used for Maintenance:

```
POST   /api/trips/                -> create (Draft)
POST   /api/trips/<id>/dispatch/  -> Rule 6: vehicle+driver -> On Trip
POST   /api/trips/<id>/complete/  -> body: { final_odometer, fuel_consumed_l }
                                      Rule 7: vehicle+driver -> Available
POST   /api/trips/<id>/cancel/    -> Rule 7-equivalent: restores Available
GET    /api/trips/                -> list, ideally with vehicle_registration /
                                      driver_name annotated for display
```

If B's actual paths differ, only `src/api/client.js` needs to change — no
page component references a raw URL.

## RBAC model used on this side

The backend enforces permissions server-side (Step 4). The frontend mirrors
that as a UX layer only — everyone can *see* every page (GET is
`IsAuthenticated` broadly, per the guide), but write controls (Add/Edit/
Delete/Dispatch/Close) only render for the role that "owns" that resource:

| Resource                | Owning role         |
|--------------------------|---------------------|
| Vehicles / Maintenance   | `fleet_manager`     |
| Drivers                  | `safety_officer`    |
| Trips                    | `dispatcher`        |
| Fuel / Expenses / Reports| `financial_analyst` (read-heavy, writes open to all for demo speed) |

Adjust `OWNER_ROLE` in `src/context/AuthContext.jsx` if this doesn't match
what A wired into `IsRole`/`IsFleetManager`/etc.

## Reports

`Reports.jsx` computes Fuel Efficiency, Operational Cost, Revenue, and ROI
client-side from the raw vehicle/trip/fuel/maintenance/expense lists, so it
works even before a dedicated `/api/reports/` endpoint exists. CSV export is
a client-side `Blob` download — no backend export endpoint required for the
mandatory deliverable.

## Cut list if you're short on time

Same order as the team plan: dark mode → document upload → email reminders →
PDF export → charts → search/sort polish → non-mandatory filters. The Step
1–9 workflow (register → trip → dispatch → complete → maintenance) must work
end to end — that's what's graded.
