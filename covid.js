/* eslint-disable prefer-template */
/* global moment, sorttable, marked, Popper */

const maxItems = 150;
const regions = ['World', 'Europe', 'North America', 'Asia', 'South America', 'Africa', 'Oceania'];

/** Main shared data structure */
const data = { status: {}, fetch: [], loc: {}, world: {}, countries: [], usa: {}, usaHistory: [], states: [], statesInfo: [], statesHistory: [], florida: [], news: [], jhulatest: [], jhuhistory: [], ihme: {} };

/** Wrapper for HTTP GET */
async function get(item, header = {}) {
  if (!item.startsWith('http')) return null;
  let http = null;
  let res = null;
  const t0 = window.performance.now();
  try {
    res = await fetch(item, header);
  } catch { /**/ }
  http = res && res.ok ? await res.text() : '';
  try {
    http = JSON.parse(http);
  } catch { /**/ }
  const t1 = window.performance.now();
  const obj = { time: new Date(), uri: item, status: res ? res.status : 500, msg: res ? res.statusText : 'exception', ms: Math.round((1000 * t1 - 1000 * t0) / 1000) };
  // eslint-disable-next-line no-console
  console.log('HTTP Fetch', obj);
  data.fetch.push(obj);
  return http;
}

/** Wrapper for HTTP GET with proxy through private server to bypass CORS rules */
async function proxy(item) {
  const http = await get(`https://cors-anywhere.herokuapp.com/${item}`);
  // http = await get(`https://pidash.ddns.net/proxy?url=${encodeURIComponent(item)}`);
  return http;
}

/** Helper to color HTML strings */
const color = {
  white: (str) => `<font color="white">${str}</font>`,
  black: (str) => `<font color="black">${str}</font>`,
  red: (str) => `<font color="lightcoral">${str}</font>`,
  green: (str) => `<font color="lightgreen">${str}</font>`,
  blue: (str) => `<font color="lightblue">${str}</font>`,
  yellow: (str) => `<font color="lightyellow">${str}</font>`,
  grey: (str) => `<font color="lightgray">${str}</font>`,
  greyed: (str) => `<font color="gray">${str}</font>`,
  ok: (str, bool) => (bool ? `<font color="lightgreen">${str}</font>` : `<font color="lightcoral">${str}</font>`),
};

/** Helper to format numeric values */
function num(value) {
  if (value) return value.toLocaleString();
  return color.greyed('N/A');
}

/** Helper that returns hex string from given RBG values */
function rgb(r, g, b) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Helper to parse numeric values */
function int(value) {
  return value ? parseInt(value.replace(/,/g, ''), 10) : 0;
}

/** Creates new browser tab and loads entire data structure in JSON format */
async function getJSON() {
  const tab = window.open('about:blank', '_blank');
  tab.document.write(`<html><body><pre>${JSON.stringify(data, null, 2)}<pre><body><html>`);
  tab.document.close();
}

/** Gets time series data from JHU: Data is in CSV and parsed to JSON */
async function getJHUSeries() {
  const body = await get('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv');
  const lines = body.split('\n');
  data.jhuhistory = [];
  for (const i in lines) {
    const fields = lines[i].split(',');
    const header = fields.splice(0, 4);
    let diff = [];
    for (const f in fields) {
      if (fields[f - 1]) diff.push(fields[f] - fields[f - 1]);
      else diff.push(fields[f]);
    }
    let State = '';
    let Country = '';
    // needed to sanitize data to match wmo data
    // also some countries report only per-region and wihout global value so pick a representative region
    switch (header[1]) {
      case '"Korea':
        State = header[0];
        Country = 'S. Korea';
        diff = diff.slice(2, diff.length);
        break;
      case 'Canada':
        State = header[0] === 'Quebec' ? '' : header[0];
        Country = header[1];
        break;
      case 'China':
        State = header[0] === 'Henan' ? '' : header[0];
        Country = header[1];
        break;
      case 'Australia':
        State = header[0] === 'Victoria' ? '' : header[0];
        Country = header[1];
        break;
      case 'United Kingdom':
        State = header[0];
        Country = 'UK';
        break;
      case 'United Arab Emirates':
        State = header[0];
        Country = 'UAE';
        break;
      default:
        State = header[0];
        Country = header[1];
    }
    data.jhuhistory.push({ State, Country, Lat: header[2], Lon: header[3], Data: diff });
  }
}

/** Get latest data from JHU: Data is in CSV and parsed to JSON */
async function getJHULatest() {
  const base = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports';
  const date = new Date();
  let file;
  let body = null;
  // guest file name based on today, yesterday and day before yesterday
  if (!body) {
    date.setDate(date.getDate() - 0);
    file = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear().toString().padStart(2, '0')}`;
    body = await get(`${base}/${file}.csv`);
  }
  if (!body) {
    date.setDate(date.getDate() - 1);
    file = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear().toString().padStart(2, '0')}`;
    body = await get(`${base}/${file}.csv`);
  }
  if (!body) {
    date.setDate(date.getDate() - 2);
    file = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear().toString().padStart(2, '0')}`;
    body = await get(`${base}/${file}.csv`);
  }
  if (!body) return;
  const lines = body.split('\n');
  const header = lines[0].split(',');
  let temp = [];
  for (const i in lines) {
    const fields = lines[i].split(',');
    const obj = {};
    for (const j in fields) {
      obj[header[j]] = fields[j];
    }
    temp.push(obj);
  }
  temp = temp.filter((val) => (val.Confirmed && parseInt(val.Confirmed, 10) > 0));
  temp = temp.filter((val) => (val.Lat && parseFloat(val.Lat) !== 0.0));
  data.jhulatest = temp;
}

/** Get USA data: Data is in JSON */
async function getUSAData() {
  const temp = await get('https://covidtracking.com/api/v1/us/current.json');
  data.usa = temp[0];
  data.usaHistory = await get('https://covidtracking.com/api/v1/us/daily.json');
  data.states = await get('https://covidtracking.com/api/v1/states/current.json');
  data.statesInfo = await get('https://covidtracking.com/api/v1/states/info.json');
  data.statesHistory = await get('https://covidtracking.com/api/v1/states/daily.json');
  data.news = await get('https://covidtracking.com/api/v1/press.json');
}

/** Get Florida data: Data is in JSON */
async function getFLData() {
  // use query builder at https://services1.arcgis.com/CY1LXxl9zlJeBuRZ/arcgis/rest/services/Florida_COVID19_Cases/FeatureServer/0
  // eslint-disable-next-line max-len
  const temp = await get('https://services1.arcgis.com/CY1LXxl9zlJeBuRZ/arcgis/rest/services/Florida_COVID19_Cases/FeatureServer/0//query?where=1%3D1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=standard&distance=0.0&units=esriSRUnit_Meter&returnGeodetic=false&outFields=*&returnGeometry=false&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=true&returnM=true&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=standard&f=pjson&token=');
  data.florida = [];
  if (!temp || !temp.features) return;
  for (const county of temp.features) {
    data.florida.push(county.attributes);
  }
}

/** Get WMO data: Data is in HTML and parsed to JSON */
async function getWMOData() {
  let html = await proxy('https://www.worldometers.info/coronavirus/');
  if (!html) return;
  html = html.replace(/<img\/?[^>]+(>|$)/g, '');
  let table;
  table = $(html).find('#main_table_countries_today > tbody:nth-child(2) > tr');
  data.countries = [];
  for (const item of table) {
    const fields = $(item).find('td');
    const country = {
      name: fields[1].innerText,
      link: $(fields[1].innerHTML).attr('href') || '',
      totalCases: int(fields[2].innerText),
      liveCases: int(fields[3].innerText),
      totalDeaths: int(fields[4].innerText),
      liveDeaths: int(fields[5].innerText),
      totalRecovered: int(fields[6].innerText),
      activeCases: int(fields[7].innerText),
      criticalCases: int(fields[8].innerText),
      densityCases: int(fields[9].innerText),
      densityDeaths: parseFloat(fields[10].innerText),
      totalTested: int(fields[11].innerText),
      densityTested: int(fields[12].innerText),
    };
    data.countries.push(country);
  }
  data.countries.sort((a, b) => (a.totalCases < b.totalCases ? 1 : -1));
  table = $(html).find('#main_table_countries_yesterday > tbody:nth-child(2) > tr');
  const yesterday = [];
  for (const item of table) {
    const fields = $(item).find('td');
    const country = {
      name: fields[0].innerText,
      newCases: int(fields[2].innerText),
      newDeaths: int(fields[4].innerText),
    };
    yesterday.push(country);
  }
  let tested = 0;
  let testedAvg = 0;
  for (const country of data.countries) {
    tested += country.totalTested;
    testedAvg += country.densityTested;
    const old = yesterday.find((a) => a.name === country.name);
    if (old) {
      country.newCases = old.newCases;
      country.newDeaths = old.newDeaths;
    }
  }
  testedAvg /= data.countries.length;
  const world = data.countries.find((a) => a.name === 'World');
  world.totalTested = tested;
  world.densityTested = Math.round(testedAvg);
  data.world = {
    totalCases: world.totalCases,
    newCases: world.newCases,
    densityCases: world.densityCases,
    densityDeaths: world.densityDeaths,
    densityTested: Math.round(testedAvg),
    activeCases: world.activeCases,
    totalTested: tested,
    totalDeaths: world.totalDeaths,
    newDeaths: world.newDeaths,
    totalRecovered: world.totalRecovered,
    criticalCases: world.criticalCases,
  };
  html = '';
}

/** Print HTML title section */
async function printTitle() {
  if (!data.status.world || !data.status.usa || !data.status.statesInfo || !data.statesHistory || !data.status.countries || !data.status.loc) {
    setTimeout(printTitle, 100);
    return;
  }
  // print world info
  document.getElementById('div-title').innerHTML = `
    <h1>${color.blue('Covid-19 World Data')} &nbsp &nbsp | 
    Tested: ${num(data.world.totalTested)} | 
    Positive: ${num(data.world.totalCases)} +${num(data.world.newCases)} | 
    Active: ${num(data.world.activeCases)} | 
    Critical: ${num(data.world.criticalCases)} | 
    Recovered: ${num(data.world.totalRecovered)} | 
    Deaths: ${num(data.world.totalDeaths)} +${num(data.world.newDeaths)} | 
    </h1>`;
  // get geoip
  let text = `<h1>
    Location data for ${color.yellow(data.loc.isp || 'unknown')} user from ${color.yellow(data.loc.city || '')} 
    ${color.yellow(data.loc.region || '')} ${color.yellow(data.loc.country || '')} ${color.yellow(data.loc.continent || '')}
    <br>`;
  if (data.loc.country === 'United States') {
    // print geoip usa info
    text += `${color.blue('United States')} &nbsp &nbsp | 
      Tested: ${num(data.usa.totalTestResults)} +${num(data.usaHistory[0].totalTestResultsIncrease)} | 
      Positive: ${num(data.usa.positive)} +${num(data.usaHistory[0].positiveIncrease)} | 
      Hospitalized: ${num(data.usa.hospitalized)} +${num(data.usaHistory[0].hospitalizedIncrease)} | 
      Critical: ${num(data.usaHistory[0].inIcuCurrently)} +${data.usaHistory[0].inIcuCurrently - data.usaHistory[1].inIcuCurrently} | 
      Deaths: ${num(data.usa.death)} +${num(data.usaHistory[0].deathIncrease)} | 
      Updated: ${moment(data.usa.lastModified).format('ddd HH:mm')}
      <br>`;
    // print geoip state
    const info = data.statesInfo.find((a) => data.loc.region === a.name);
    let state;
    if (info) state = data.states.find((a) => info.state === a.state);
    if (state && state.positive) {
      const history = data.statesHistory.filter((a) => state.state === a.state);
      if (!history || !history[0] || !history[0].positive) {
        setTimeout(printTitle, 100);
        return;
      }
      const yesterday = history[0].positive === state.positive ? history[1] : history[0];
      text += `
        <a href="${info.covid19Site}">${color.blue(info.name)}</a> &nbsp &nbsp | 
        Tested: ${num(state.totalTestResults)} +${num(state.totalTestResults - yesterday.totalTestResults)} | 
        Positive: ${num(state.positive)} +${num(state.positive - yesterday.positive)} | 
        Hospitalized: ${num(state.hospitalized)} +${num(Math.abs(state.hospitalized ? state.hospitalized - yesterday.hospitalized : 0))} | 
        Deaths: ${num(state.death)} +${num(Math.abs(state.death - yesterday.death))} | 
        Updated: ${moment(new Date(state.lastUpdateEt)).add(19, 'years').format('ddd HH:mm')}
        <br>`;
    }
  } else {
    // print geoip country info
    if (data.loc.country === 'United Kingdom') data.loc.country = 'UK';
    const country = data.countries.find((a) => a.name === data.loc.country);
    if (country) {
      text += `
        <a href="https://www.worldometers.info/coronavirus/${country.link}">${color.blue(country.name)}</a> &nbsp &nbsp | 
        Tested: ${num(country.totalTested)} | 
        Positive: ${num(country.totalCases)} +${num(country.newCases)} yesterday +${num(country.liveCases)} today | 
        Active: ${num(country.activeCases)} | 
        Critical: ${country.criticalCases} | 
        Deaths: ${num(country.totalDeaths)} +${num(country.newDeaths)} yesterday +${num(country.liveDeaths)} today
        <br>`;
    }
  }
  text += '</h1';
  document.getElementById('div-location').innerHTML = text;
}

/** Create popup element with future projections */
async function popupProjection(where) {
  const div = document.getElementById(`projections-${where.replace(/ /g, '').replace(/\./g, '')}`);
  const tip = document.createElement('div');
  tip.id = 'tooltip';
  tip.role = 'tooltip';
  tip.className = 'popper';
  tip.innerHTML = `<div style="text-align: left"><b>Loading data for: ${where}</b></div>`;
  div.appendChild(tip);
  let popper = Popper.createPopper(div, tip, { placement: 'left', strategy: 'absolute', modifiers: [{ name: 'offset', options: { offset: [0, 20] } }] });
  if (!data.ihme.loc) data.ihme.loc = await proxy('https://covid19.healthdata.org/api/metadata/location');
  if (!data.ihme.ver) data.ihme.ver = await proxy('https://covid19.healthdata.org/api/metadata/version');
  let loc;
  // sanitize country lookups
  switch (where) {
    case 'USA': loc = data.ihme.loc.find((a) => a.local_id === 'USA'); break;
    case 'UK': loc = data.ihme.loc.find((a) => a.local_id === 'GBR'); break;
    default: loc = data.ihme.loc.find((a) => a.location_name === where);
  }
  // if no country found lookup states
  if (!loc) {
    const usa = data.ihme.loc.find((a) => a.local_id === 'USA');
    loc = usa.children.find((a) => a.local_id === `US-${where}`);
  }
  if (!loc) loc = {};
  let peak = await proxy(`https://covid19.healthdata.org/api/data/peak_death?location=${loc.location_id}`);
  peak = peak[0] && peak[0].deaths_date ? peak[0].deaths_date : '';
  const all = await proxy(`https://covid19.healthdata.org/api/data/hospitalization?location=${loc.location_id}`);
  const deaths = all
    .filter((a) => a.covid_measure_name === 'deaths')
    .filter((a) => (moment(a.date_reported) > moment().subtract(15, 'days') && (moment(a.date_reported) < moment().add(45, 'days'))))
    .map((b) => b.mean);
  const totalDeaths = all
    .filter((a) => a.covid_measure_name === 'total_death')
    .map((b) => b.mean);
  const hospitalized = all
    .filter((a) => a.covid_measure_name === 'covid_all_bed')
    .filter((a) => (moment(a.date_reported) > moment().subtract(15, 'days') && (moment(a.date_reported) < moment().add(45, 'days'))))
    .map((b) => b.mean);
  tip.innerHTML = `
    <div style="text-align: left">
      <b>${loc.location_name || where}</b><br>
      <b>Peak: ${moment(peak).format('MMMM DD')}</b><br>
      &nbsp Peak hospitalized: <b>${Math.max(...hospitalized).toLocaleString()}</b><br>
      <span class="spark-hospitalized-${where.replace(/ /g, '').replace(/\./g, '')}"></span><br>
      &nbsp Peak deaths: <b>${Math.max(...deaths).toLocaleString()}/day</b><br>
      <span class="spark-deaths-${where.replace(/ /g, '').replace(/\./g, '')}"></span><br>
      Projected total deaths: <b>${Math.max(...totalDeaths).toLocaleString()}</b><br>
      Updated: <b>${moment(data.ihme.ver[0].input_data_final_date).format('MMMM DD, YYYY')}</b><br>
      Chart data: from ${moment().subtract(15, 'days').format('MMM DD')} to ${moment().add(45, 'days').format('MMM DD')}
    </div>`;
  $(`.spark-hospitalized-${where.replace(/ /g, '').replace(/\./g, '')}`).sparkline(hospitalized, { type: 'bar', barColor: 'grey' });
  $(`.spark-deaths-${where.replace(/ /g, '').replace(/\./g, '')}`).sparkline(deaths, { type: 'bar', barColor: 'darkred' });
  setTimeout(() => {
    popper.destroy();
    popper = null;
    div.removeChild(tip);
  }, 10000);
}

/** Print HTML line for Miami-Dade county */
async function printMiami() {
  if (!data.status.florida) {
    setTimeout(printMiami, 100);
    return;
  }
  const miami = data.florida.find((a) => a.COUNTYNAME === 'MIAMI-DADE');
  if (!miami) return;
  document.getElementById('div-miami').innerHTML = `
    <b>${color.blue('Miami-Dade Data')}</b> | 
    Tested: ${num(miami.T_total)} | 
    Positive: ${num(miami.TPositive)} | 
    Pending: ${num(miami.TPending)} | 
    Hospitalized: ${num(miami.C_HospYes_Res + miami.C_HospYes_NonRes)} | 
    Deaths: ${num(miami.Deaths)}
    `;
}

/** Print HTML table for the United States */
async function printStatesTable() {
  if (!data.status.states || !data.status.statesHistory || !data.status.statesInfo) {
    setTimeout(printStatesTable, 100);
    return;
  }
  const table = document.getElementById('table-states');
  if (!table) return;
  let text = `
      <tr><th>State</th><th>Tested</th><th>(new)</th><th>Positive</th><th>(new)</th><th class="sorttable_nosort">History: new cases over 3 Months</th>
      <th>Pending</th><th>Hospitalized</th><th>(new)</th><th>Deaths</th><th>(new)</th><th>Mortality%</th><th>Updated</th><th class="sorttable_nosort"></th></tr>
    `;
  for (const state of data.states) {
    const info = data.statesInfo.find((a) => state.state === a.state);
    const history = data.statesHistory.filter((a) => state.state === a.state);
    const yesterday = history[0].positive === state.positive ? history[1] : history[0];
    text += `<tr>
      <td style="text-align: left"><b>${state.state}</b>: <a href="${info.covid19Site}">${info.name}</a></td>
      <td>${num(state.totalTestResults)}</td>
      <td>${num(state.totalTestResults - yesterday.totalTestResults)}</td>
      <td>${num(state.positive)}</td>
      <td>${color.ok(num(state.positive - yesterday.positive), 100 * (state.positive - yesterday.positive) / state.positive < 10)}</td>
      <td><span class="chart-state-new-${state.state}"></span></td>
      <td>${color.ok(num(state.pending || yesterday.pending), 100 * (state.pending || yesterday.pending) / state.totalTestResults < 10)}</td>
      <td>${num(state.hospitalized)}</td>
      <td>${num(Math.abs(state.hospitalized ? state.hospitalized - yesterday.hospitalized : 0))}</td>
      <td>${num(state.death)}</td>
      <td>${num(Math.abs(state.death - yesterday.death))}</td>
      <td>${state.death ? (100 * state.death / state.positive).toFixed(2) + '%' : 'N/A'}</td>

      <td>${moment(new Date(state.lastUpdateEt)).add(19, 'years') > moment(new Date()).subtract(2, 'days') ? color.greyed(state.lastUpdateEt) : color.red(state.lastUpdateEt)}</td>
      <td><span id="projections-${state.state}" class="projection">&nbspPROJECTIONS&nbsp</span></td>
      </tr>`;
  }
  table.innerHTML = text;
  for (const state of data.states) {
    $(`#projections-${state.state}`).click(() => popupProjection(state.state));
  }
  sorttable.makeSortable(table);
}

/** Print HTML table for world regions */
async function printRegionsTable() {
  if (!data.status.countries) {
    setTimeout(printRegionsTable, 100);
    return;
  }
  const table = document.getElementById('table-regions');
  if (!table) return;
  let text = `<tr>
    <th>Region</th><th>Active</th><th>Recovered</th><th>Critical</th><th>Deaths</th>
    </tr>`;
  const countries = data.countries.length ? data.countries : [];
  if (countries.length > maxItems) countries.length = maxItems;
  for (const country of countries) {
    if (regions.includes(country.name.trim())) {
      text += `<tr>
        <td style="text-align: left"><b><a href="https://www.worldometers.info/coronavirus/${country.link}">${country.name}</a></b></td>
        <td>${num(country.activeCases)}</td>
        <td>${num(country.totalRecovered)}</td>
        <td>${num(country.criticalCases)}</td>
        <td>${num(country.totalDeaths)}</td>
        </tr>`;
    }
  }
  table.innerHTML = text;
  if (data.countries.length) sorttable.makeSortable(table);
}

/** Print HTML table for world countries */
async function printCountriesTable() {
  if (!data.status.countries) {
    setTimeout(printCountriesTable, 100);
    return;
  }
  const table = document.getElementById('table-countries');
  if (!table) return;
  let text = `<tr>
    <th>Country</th><th>Cases</th><th>(new/day)</th><th>(new/current)</th><th class="sorttable_nosort">History: new cases over 3 months</th><th>Tested</th>
    <th>Deaths</th><th>(new/24h)</th><th>(new/current)</th><th>Recovered</th><th>Active</th><th>Critical</th><th>Tested/1M</th>
    <th>Cases/1M</th><th>Deaths/1M</th><th>Mortality%</th><th class="sorttable_nosort"></th>
    </tr>`;
  const countries = data.countries.length ? data.countries : [];
  if (countries.length > maxItems) countries.length = maxItems;
  for (const country of countries) {
    if (!regions.includes(country.name.trim())) {
      text += `<tr>
      <td style="text-align: left"><b><a href="https://www.worldometers.info/coronavirus/${country.link}">${country.name}</a></b></td>
      <td>${num(country.totalCases)}</td>
      <td>${color.ok(num(country.newCases), 100 * country.newCases / country.totalCases < 8)}</td>
      <td>${color.ok(num(country.liveCases), country.liveCases < country.newCases)}</td>
      <td><span class="chart-country-total-${country.name.replace(/ /g, '').replace(/\./g, '')}"></span></td>
      <td>${num(country.totalTested)}</td>
      <td>${num(country.totalDeaths)}</td>
      <td>${color.ok(num(country.newDeaths), 100 * country.newDeaths / country.totalDeaths < 8)}</td>
      <td>${color.ok(num(country.liveDeaths), country.liveDeaths < country.newDeaths)}</td>
      <td>${color.ok(num(country.totalRecovered), 100 * country.totalRecovered / country.totalCases > 35)}</td>
      <td>${color.ok(num(country.activeCases), 100 * country.activeCases / country.totalCases < 50)}</td>
      <td>${color.ok(num(country.criticalCases), country.criticalCases < country.totalRecovered)}</td>
      <td>${color.ok(num(country.densityTested), country.densityTested > data.world.densityTested)}</td>
      <td>${color.ok(num(country.densityCases), country.densityCases < data.world.densityCases)}</td>
      <td>${color.ok(num(country.densityDeaths), country.densityDeaths < data.world.densityDeaths)}</td>
      <td>${color.ok((country.totalDeaths ? (100 * country.totalDeaths / country.totalCases).toFixed(2) + '%' : 'N/A'), country.densityDeaths < data.world.densityDeaths)}</td>
      <td><span id="projections-${country.name.replace(/ /g, '').replace(/\./g, '')}" class="projection">&nbspPROJECTIONS&nbsp</span></td>
      </tr>`;
    }
  }
  table.innerHTML = text;
  for (const country of countries) {
    $(`#projections-${country.name.replace(/ /g, '').replace(/\./g, '')}`).click(() => popupProjection(country.name));
  }
  if (data.countries.length) sorttable.makeSortable(table);
}

/** Render trendline for USA within countries table */
async function renderUSATrend() {
  if (!data.status.countries || !data.status.usaHistory) {
    setTimeout(renderUSATrend, 100);
    return;
  }
  const country = data.countries.find((a) => a.name === 'USA');
  data.usaHistory.reverse();
  const trend = [];
  for (const day in data.usaHistory) {
    const val = data.usaHistory[day - 1] ? data.usaHistory[day].positive - data.usaHistory[day - 1].positive : data.usaHistory[day].positive;
    trend.push(val);
  }
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const low = `:${Math.trunc(0.33 * (max - min) + min)}`;
  const med = `${Math.trunc(0.33 * (max - min) + min)}:${Math.trunc(0.67 * (max - min) + min)}`;
  const high = `${Math.trunc(0.67 * (max - min) + min)}:`;
  const ranges = $.range_map({ [low]: '#e0ffe0', [med]: '#ffffe0', [high]: '#ffe0e0' });
  if (trend.length > 90) trend.splice(0, trend.length - 90);
  $(`.chart-country-total-${country.name}`)
    .sparkline(trend, { type: 'bar', barColor: 'lightyellow', zeroColor: '', colorMap: ranges, tooltipFormat: `<span>${country.name}: {{value}}</span>` });
  data.usaHistory.reverse();
}

/** Render trendlines for individual countries */
async function renderCountriesTrend() {
  if (!data.status.countries || !data.status.jhuHistory) {
    setTimeout(renderCountriesTrend, 100);
    return;
  }
  for (const country of data.countries) {
    if (country.name !== 'USA') {
      const history = data.jhuhistory.find((a) => country.name === a.Country && a.State === '');
      let trend = history && history.Data ? history.Data : [];
      trend = trend.map((item) => (item > 1 ? item : null));
      if (trend.length > 90) trend.splice(0, trend.length - 90);
      const max = Math.max(...trend);
      const min = Math.min(...trend);
      const low = `:${Math.trunc(0.33 * (max - min) + min)}`;
      const med = `${Math.trunc(0.33 * (max - min) + min)}:${Math.trunc(0.67 * (max - min) + min)}`;
      const high = `${Math.trunc(0.67 * (max - min) + min)}:`;
      const ranges = $.range_map({ [low]: '#e0ffe0', [med]: '#ffffe0', [high]: '#ffe0e0' });
      $(`.chart-country-total-${country.name.replace(/ /g, '').replace(/\./g, '')}`)
        .sparkline(trend, { type: 'bar', barColor: 'lightyellow', zeroColor: '', colorMap: ranges, tooltipFormat: `<span>${country.name}: {{value}}</span>` });
    }
  }
}

/** Render trendlines for individual states in USA */
async function renderStatesTrend() {
  if (!data.status.states || !data.status.statesHistory) {
    setTimeout(renderStatesTrend, 100);
    return;
  }
  for (const state of data.states) {
    const trend = [];
    const history = data.statesHistory.filter((a) => state.state === a.state);
    for (const day of history.reverse()) {
      trend.push(day.positiveIncrease);
    }
    if (trend.length > 90) trend.splice(0, trend.length - 90);
    const max = Math.max(...trend);
    const min = Math.min(...trend);
    const low = `:${Math.trunc(0.33 * (max - min) + min)}`;
    const med = `${Math.trunc(0.33 * (max - min) + min)}:${Math.trunc(0.67 * (max - min) + min)}`;
    const high = `${Math.trunc(0.67 * (max - min) + min)}:`;
    const ranges = $.range_map({ [low]: '#e0ffe0', [med]: '#ffffe0', [high]: '#ffe0e0' });
    $(`.chart-state-new-${state.state}`)
      .sparkline(trend, { type: 'bar', barColor: 'lightyellow', zeroColor: '', colorMap: ranges, tooltipFormat: `<span>${state.state}: {{value}}</span>` });
  }
}

/** Initialize map canvas */
async function initMap() {
  const div = document.getElementById('div-map');
  const canvas = document.getElementById('canvas-map');
  canvas.width = div.clientWidth - 16;
  canvas.height = Math.round(div.clientWidth / 4 * 3);
  canvas.style.opacity = 0.75;
  div.style.backgroundImage = 'url("https://vladmandic.github.io/picovid/assets/world.webp")';
}

/** Render infection rates on map canvas */
async function renderMap() {
  if (!data.status.jhuLatest) {
    setTimeout(renderMap, 100);
    return;
  }
  const canvas = document.getElementById('canvas-map');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'lightcoral';
  for (const item of data.jhulatest) {
    const size = Math.round(Math.sqrt(Math.sqrt(3 * item.Confirmed)));
    // conversion of geo coordinates to screen coordinates
    const posy = (90 - parseFloat(item.Lat)) * canvas.height / 270 - 130;
    const posx = (parseFloat(item.Long_) + 180) * canvas.width / 360;
    ctx.fillStyle = rgb(250, 128 - 2 * size, 128 - size);
    ctx.beginPath();
    ctx.arc(posx, posy, size, 0, 2 * Math.PI, false);
    ctx.fill();
  }
  // find closest reporting county based on geo coordinates
  // const near = data.jhulatest.filter((a) => (Math.round(a.Lat) === Math.round(data.loc.lat) && Math.round(a.Long_) === Math.round(data.loc.lon)));
  // console.log('Location', data.loc);
  // console.log('Nearest match', near);
}

/** Print HTML news list */
async function printNews() {
  if (!data.status.news) {
    setTimeout(printNews, 100);
    return;
  }
  const div = document.getElementById('div-news');
  let text = '<h1>In The News</h1>';
  if (data.news.length > 30) data.news.length = 30;
  for (const item of data.news) {
    text += `${item.publishDate} &nbsp <b>${color.blue(item.publication)}</b>: &nbsp <a href="${item.url}">${item.title}</a><br>`;
  }
  div.innerHTML = text;
}

/** Check if data is loaded for each datasource every 100ms */
async function status() {
  data.status = {
    loc: data.loc && data.loc.country !== null,
    world: data.world && data.world.totalCases > 0,
    countries: data.countries && data.countries.length > 0,
    usa: data.usa && data.usa.totalTestResults > 0,
    usaHistory: data.usaHistory && data.usaHistory.length > 0,
    states: data.states && data.states.length > 0,
    statesHistory: data.statesHistory && data.statesHistory.length > 0,
    statesInfo: data.statesInfo && data.statesInfo.length > 0,
    jhuLatest: data.jhulatest && data.jhulatest.length > 0,
    jhuHistory: data.jhuhistory && data.jhuhistory.length > 0,
    florida: data.florida && data.florida.length > 0,
    news: data.news && data.news.length > 0,
  };
  // console.log(data.status);
  document.getElementById('div-status').innerHTML = `<b>Data Sources Status:</b> 
    ${color.ok('World Latest', data.status.world)} | 
    ${color.ok('Countries', data.status.countries)} | 
    ${color.ok('USA Current', data.status.usa)} | 
    ${color.ok('USA History', data.status.usaHistory)} | 
    ${color.ok('USA States', data.status.statesHistory)} | 
    ${color.ok('JHU Latest', data.status.jhuLatest)} | 
    ${color.ok('JHU Series', data.status.jhuHistory)} | 
    ${color.ok('Florida', data.status.florida)} | 
    ${color.ok('News', data.status.news)}
    `;
  setTimeout(status, 100);
}

/** Filter method invoked by input field keypress that shows/hides matching table records */
async function filter() {
  const q = new RegExp(this.value, 'i');
  $('#table-countries > tbody').find('tr').each(function match() {
    if ($(this).children('td:first').text().match(q)) $(this).show();
    else $(this).hide();
  });
  $('#table-states > tbody').find('tr').each(function match() {
    if ($(this).children('td:first').text().match(q)) $(this).show();
    else $(this).hide();
  });
}

/** Print HTML notes fetched from GitHub in markdown format */
async function printNotes() {
  const md = await get('https://vladmandic.github.io/picovid/README.md');
  if (md) document.getElementById('div-notes').innerHTML = marked(md);
}

async function getGeoIP() {
  data.loc = await get('https://extreme-ip-lookup.com/json/');
  if (!data.loc || !data.loc.country) data.loc = { county: 'unknown', region: 'unknown' };
}

/** Application entry point */
async function main() {
  // get all datasets
  getGeoIP();
  getUSAData();
  getWMOData();
  getFLData();
  getJHUSeries();
  getJHULatest();
  // init status loop
  await status();
  // render all data
  printTitle();
  printMiami();
  printNotes();
  printRegionsTable();
  printCountriesTable();
  printStatesTable();
  renderUSATrend();
  renderStatesTrend();
  renderCountriesTrend();
  initMap();
  renderMap();
  printNews();
  // register mouse and keyboard handlers
  $('#filter').on('keyup', filter);
  $('#raw-json').click(getJSON);
  // reload every 30min
  setTimeout(main, 30 * 60 * 1000);
}

window.onload = main();
