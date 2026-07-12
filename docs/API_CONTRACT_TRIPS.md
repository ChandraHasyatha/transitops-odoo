# Trip API Contract (draft — for C to mock against)

Backend not live yet; these shapes are stable enough to build the Trip UI
against right now. Field names will be confirmed once A's models land — if
anything shifts, only the serializer changes, not this contract's shape.

## `POST /api/trips/` — create (Draft)

Request:
```json
{
  "source": "Chennai",
  "destination": "Madurai",
  "vehicle": 5,
  "driver": 3,
  "cargo_weight": 450,
  "planned_distance": 460
}
```

Response `201`:
```json
{
  "id": 42,
  "status": "draft",
  "source": "Chennai",
  "destination": "Madurai",
  "vehicle": 5,
  "driver": 3,
  "cargo_weight": 450,
  "planned_distance": 460,
  "created_at": "2026-07-12T09:54:00Z"
}
```

## `POST /api/trips/{id}/dispatch/`

No body needed — vehicle/driver already set at creation.

Response `200` (success):
```json
{
  "id": 42,
  "status": "dispatched",
  "vehicle_status": "on_trip",
  "driver_status": "on_trip"
}
```

Response `400` (any of the 6 dispatch rules fail):
```json
{
  "detail": "Cargo weight 520kg exceeds vehicle's max load capacity of 500kg.",
  "errors": [
    { "code": "CARGO_OVER_CAPACITY", "message": "Cargo weight 520kg exceeds vehicle's max load capacity of 500kg." }
  ]
}
```
Possible `code` values: `VEHICLE_NOT_OPERABLE`, `VEHICLE_ALREADY_ON_TRIP`,
`DRIVER_SUSPENDED`, `DRIVER_LICENSE_EXPIRED`, `DRIVER_ALREADY_ON_TRIP`,
`CARGO_OVER_CAPACITY`. Show these as inline field/toast errors — don't need
a lookup table, `message` is already display-ready.

## `POST /api/trips/{id}/complete/`

Request:
```json
{ "final_odometer": 15420, "fuel_consumed_liters": 32 }
```

Response `200`:
```json
{
  "id": 42,
  "status": "completed",
  "vehicle_status": "available",
  "driver_status": "available"
}
```

## `POST /api/trips/{id}/cancel/`

No body.

Response `200`:
```json
{
  "id": 42,
  "status": "cancelled",
  "vehicle_status": "available",
  "driver_status": "available"
}
```

Response `400` if the trip is already `completed`/`cancelled`:
```json
{ "detail": "Trip cannot move from 'completed' to 'cancelled'." }
```

## `GET /api/trips/?status=dispatched`

Standard list, filterable by `status`, `vehicle`, `driver`. Paginated
(DRF default `PageNumberPagination` — `results`, `count`, `next`, `previous`).

## `GET /api/vehicles/?dispatchable=true`

For the trip-creation form's vehicle dropdown — only returns vehicles with
`status="available"` (Retired/In Shop/On Trip excluded, per rule 2 & 4).
Same pattern for `GET /api/drivers/?dispatchable=true` (excludes Suspended,
On Trip, and expired-license drivers).

## `GET /api/reports/vehicles/{id}/`

```json
{
  "vehicle_id": 5,
  "total_distance_km": 3200,
  "total_fuel_liters": 210,
  "fuel_efficiency_km_per_l": 15.24,
  "total_fuel_cost": 16800,
  "total_maintenance_cost": 4200,
  "operational_cost_total": 21000,
  "revenue": 45000,
  "roi": 0.9975
}
```

## `GET /api/reports/export/?type=trips&format=csv`

Streams a CSV attachment (`Content-Disposition: attachment`). `type` can be
`trips`, `fuel_logs`, `expenses`, `vehicles`.

## `GET /api/dashboard/kpis/`

```json
{
  "active_vehicles": 6,
  "available_vehicles": 12,
  "vehicles_in_maintenance": 2,
  "active_trips": 6,
  "pending_trips": 3,
  "drivers_on_duty": 6,
  "fleet_utilization_pct": 30.0
}
```