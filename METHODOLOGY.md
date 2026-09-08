# Methodology — BS-MBPI v1

The BondStats Monetary Bridge Pressure Index is designed to compress several observable pressure channels into a 0–100 monitoring scale.

## Components
- 30% HKD peg pressure: absolute distance of USD/HKD from 7.80 relative to the 7.75–7.85 convertibility zone.
- 25% HKD funding pressure: percentile rank of 1-month HIBOR over the retrieved history.
- 20% interbank-liquidity pressure: inverse percentile rank of the Aggregate Balance.
- 15% RMB facility pressure: percentile rank of 16:00 RMB Liquidity Facility usage.
- 10% RMB/HKD momentum pressure: percentile rank of the absolute 20-session move.

## Regimes
- 0–19 Open
- 20–39 Normal
- 40–59 Friction
- 60–79 Pressure
- 80–100 Dislocation

The index is a BondStats analytical construction. It is not a trading signal, an exchange-rate forecast, or an official HKMA, PBOC or HKEX measure.
