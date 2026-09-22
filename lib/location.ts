export function mapLinks(latitude:number,longitude:number){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Invalid location');
 const lat=Math.max(-85,Math.min(85,latitude));
 const west=Math.max(-180,longitude-.012),east=Math.min(180,longitude+.012);
 const south=Math.max(-85,lat-.008),north=Math.min(85,lat+.008);
 const query=new URLSearchParams({bbox:[west,south,east,north].join(','),layer:'mapnik',marker:[latitude,longitude].join(',')});
 return {embed:'https://www.openstreetmap.org/export/embed.html?'+query,full:`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${lat}/${longitude}`};
}
