import fs from 'node:fs';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../node_modules/country-state-city/lib/assets/${name}.json`,import.meta.url),'utf8'));
const countries=read('country').map(({name,isoCode,flag})=>({name,isoCode,flag}));
const regions={};for(const {name,isoCode,countryCode} of read('state'))(regions[countryCode]??=[]).push({name,isoCode});
const cities={};for(const [name,country,state] of read('city'))(cities[`${country}/${state}`]??=[]).push(name);
fs.writeFileSync(new URL('../lib/geography.json',import.meta.url),JSON.stringify({countries,regions,cities}));
