# Pi Covid-19 Tracker

Because I couldn't find one that shows me at a glance what's the current trend in the World and in the United States.
Why Pi*anything? Because I use my Raspberry Pi 4 as a development server.

Deployment: Just download covid.html to any local folder and open html file. There is no deployment.
Or run directly from Git pages.

## Credit for data goes to:
- The COVID Tracking Project: https://covidtracking.com/
- Worldometer: https://www.worldometers.info/coronavirus/
- Johns Hopkins CSSE: https://www.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6
- Florida Department of Health: https://floridahealthcovid19.gov/

## Notes on data:
- Tables are sortable, just click on a header
- Countries daily new cases and deaths is reported for last full 24h period and for current day so far
- Counties red/green markers per 1M indicate country compared to world average
- Counties red/green markers for new data indicate growth rate below threshold or recovery higher than growth
- Countries trend charts show last two months of new cases
- Countries link to Worldometers.info per-country web page
- States hospitalized cases is not reported regularly by all states
- States pending cases is reported by only few states
- States trend charts show last one months of new cases
- States link to official state web page        
- Map infection scale is a square root function
