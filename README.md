# BondStats China–Hong Kong Monetary Bridge

A standalone BondStats market-infrastructure terminal focused on the monetary bridge between the renminbi, Hong Kong dollar and USD-linked Hong Kong monetary system.

## Why this is not a generic FX dashboard

The tool combines:
- the official HKMA RMB/HKD daily reference;
- USD/HKD position inside the 7.75–7.85 convertibility zone;
- Aggregate Balance;
- 1-month HIBOR;
- HKMA Base Rate;
- usage of the HKMA Renminbi Liquidity Facility;
- a proprietary BondStats Bridge Pressure Index;
- an institutional map of Bond Connect, Swap Connect, RMB liquidity and the HKD Linked Exchange Rate System.

The UI is deliberately built as a monetary-infrastructure map rather than a card dashboard.

## Deployment

1. Create repository `bondstats-china-hong-kong-monetary-bridge`.
2. Upload the contents of this ZIP to the repository root.
3. In GitHub → Settings → Pages, set Source to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Run Actions → **Update China–Hong Kong Monetary Bridge** → **Run workflow** once.
5. GitHub Pages URL:
   `https://botapi33.github.io/bondstats-china-hong-kong-monetary-bridge/`

No API key is required.

## Data design

All live numerical inputs in v1 come from the Hong Kong Monetary Authority Open API. This deliberately avoids using a generic retail FX feed or inventing a CNH quote that the official HKMA dataset does not explicitly label as such.

The tool labels the live exchange-rate series as **RMB/HKD**, not CNH/HKD. The institutional copy explains Hong Kong's offshore-RMB role separately.

## Index

The BondStats Monetary Bridge Pressure Index (BS-MBPI) is a monitoring composite, not a forecast and not an official HKMA/PBOC/HKEX indicator.
