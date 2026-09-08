# Data Sources

Primary live data is retrieved from the Hong Kong Monetary Authority Open API.

## Exchange rates — daily
Endpoint:
`https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/er-eeri-daily`

Used fields:
- `usd`: HKD per U.S. dollar
- `cny`: HKD per Chinese renminbi
- `end_of_day`

## Interbank liquidity — daily
Endpoint:
`https://api.hkma.gov.hk/public/market-data-and-statistics/daily-monetary-statistics/daily-figures-interbank-liquidity`

Used fields:
- `closing_balance`
- `hibor_fixing_1m`
- `disc_win_base_rate`
- `end_of_date`

## Renminbi Liquidity Facility
Endpoint:
`https://api.hkma.gov.hk/public/market-data-and-statistics/daily-monetary-statistics/usage-rmb-liquidity-fac`

Used fields:
- intraday repo usage
- overnight repo usage
- PLP facility usage
- 09:00 / 11:00 / 14:00 / 16:00 snapshots

## Institutional references
- Hong Kong Monetary Authority
- HKEX Bond Connect
- HKEX Swap Connect

Source footnotes and third-party rights disclosed by the original publishers remain applicable.
