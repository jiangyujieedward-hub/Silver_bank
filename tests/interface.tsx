import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RegistrationDetails,AgreementFields} from '../components/registration-details';
import {setLanguage,tr,translateNotification,localizedTime} from '../lib/i18n';
import {normalizePhone,splitPhone,callingCodes,countryCallingOptions,countryFlag} from '../lib/phone';
import {validateSignature} from '../lib/signature';
import {validatePhoto} from '../lib/photo';
import {RequestComposer,CommunityInsights} from '../components/community-support';
import {NotificationBadge} from '../components/notification-bell';
import {mapLinks} from '../lib/location';
import catalogue from '../lib/translations.json';
let checks=0;
for(const lang of ['en','zh-Hant','de','fr','ja']){
 setLanguage(lang);const markup=renderToStaticMarkup(<><RegistrationDetails user={{phone:'+85212345678',location:'Test district',language:lang}}/><AgreementFields name="Must not prefill"/></>);
 assert.ok(markup.includes(tr('Country / territory')));assert.ok(!markup.includes('<iframe'));checks+=2;assert.ok(markup.includes(tr('Country calling code')));assert.ok(markup.includes(tr('Clear signature')));assert.ok(markup.includes('name="communityVersion"'));assert.ok(markup.includes('name="privateVersion"'));assert.ok(markup.includes('name="signatureDrawing"'));assert.ok(!markup.includes('Must not prefill'));assert.ok(markup.includes('value="12345678"'));assert.ok(markup.includes('value="+852"'));assert.ok(markup.includes('lang="en"'));checks+=9;
 if(lang!=='en'){assert.notEqual(tr('Home'),'Home');assert.notEqual(tr('Save profile'),'Save profile');checks+=2;}
 assert.ok(localizedTime(-3600).startsWith('−'));assert.ok(translateNotification('Test task: New message from Test member').includes('Test member'));checks+=2;
}
for(const [key,value]of Object.entries(catalogue)){assert.equal(value.length,4,key);assert.ok(value.every(x=>x.trim()),key)}checks++;
for(const [code,number,expected]of [['+852','12345678','+85212345678'],['+1','2025550123','+12025550123'],['+81','9012345678','+819012345678'],['+33','612345678','+33612345678'],['+49','3012345678','+493012345678']]){assert.ok(callingCodes.includes(code));assert.equal(normalizePhone({countryCode:code,phoneNumber:number}),expected);assert.equal(splitPhone(expected).code,code);checks+=3;}
assert.ok(countryCallingOptions.some(x=>x.country==='HK'&&x.code==='+852'));assert.equal(countryFlag('HK'),'🇭🇰');checks+=2;
assert.throws(()=>normalizePhone({countryCode:'+000',phoneNumber:'12345678'}));assert.throws(()=>normalizePhone({countryCode:'+852',phoneNumber:'abc'}));checks+=2;
const strokes='[[[100,100],[200,50],[350,170]]]';assert.equal(validateSignature(strokes),strokes);checks++;
for(const value of ['', '[]','[[[1,1]]]','<svg onload=alert(1)>','[[[1001,1],[1,2],[3,4]]]']){assert.throws(()=>validateSignature(value));checks++;}
assert.equal(validatePhoto(''),null);assert.throws(()=>validatePhoto('data:image/svg+xml;base64,PHN2Zy8+'));assert.throws(()=>validatePhoto('data:image/png;base64,YWJj'));checks+=3;
console.log(`PASS: ${checks} rendering, language, phone-number and handwritten-signature assertions.`);

assert.equal(renderToStaticMarkup(<NotificationBadge count={0}/>),'');assert.ok(renderToStaticMarkup(<NotificationBadge count={5}/>).includes('>5<'));assert.ok(renderToStaticMarkup(<NotificationBadge count={120}/>).includes('99+'));checks+=3;
const link=mapLinks(0,0);assert.equal(new URL(link.embed).searchParams.get('marker'),'0,0');assert.equal(new URL(link.embed).origin,'https://www.openstreetmap.org');assert.throws(()=>mapLinks(NaN,0));assert.throws(()=>mapLinks(1,181));checks+=4;
console.log(`PASS: ${checks} total interface assertions including map privacy and unread badges.`);

// Optional drafting is consent-gated and cannot submit itself.
for(const lang of ['en','zh-Hant','de','fr','ja']){setLanguage(lang);const html=renderToStaticMarkup(<RequestComposer api={async()=>{throw new Error('render must not call backend')}} me={{user:{location:''},balance:{available:0},categories:[]}} onPost={async()=>{}}/>);assert.ok(html.includes(tr('Post request')));assert.ok(html.includes(tr('Prepare my request')));assert.ok(html.includes('type="checkbox"'));assert.ok(html.includes('disabled'));assert.ok(!html.includes('value="30"'));checks+=5;}
console.log(`PASS: ${checks} total interface assertions including optional drafting in all five languages.`);

// Saved community, scheduling and calendar regressions use test fixtures only.
import {parseCommunity,communityLabel} from '../lib/communities';
import {TaskSchedule,calendarFile} from '../components/task-schedule';
setLanguage('en');
const community=parseCommunity('Sha tin');assert.equal(communityLabel(community.country,community.state,community.city),'Hong Kong S.A.R. / Sha Tin');
const fixture={id:'test-task',requester_id:'a',helper_id:'b',requester_name:'Requester',helper_name:'Helper',requester_agreed:1,helper_agreed:1,requested_at:2000000000,estimated_seconds:1800,title:'Test, title',location:'Test community'};
const scheduled=renderToStaticMarkup(<TaskSchedule task={fixture} userId="a" now={1999999999} busy={false} action={async()=>{}}/>);assert.ok(scheduled.includes('Add to calendar'));assert.ok(!scheduled.includes('>Start now<'));
const due=renderToStaticMarkup(<TaskSchedule task={fixture} userId="b" now={2000000000} busy={false} action={async()=>{}}/>);assert.ok(due.includes('Start now'));
const calendar=calendarFile(fixture);assert.equal((calendar.match(/BEGIN:VALARM/g)||[]).length,2);assert.ok(calendar.includes('TRIGGER:-PT15M'));assert.ok(calendar.includes('TRIGGER:PT0M'));
console.log('PASS: saved community prefills; start hidden before schedule; calendar contains both reminders.');

import {RegistrationChoice,IndividualRegistrationFields,OrganizationFields,VerificationCenter} from '../components/verification';
const choice=renderToStaticMarkup(<RegistrationChoice choose={()=>{}}/>);
assert.ok(choice.includes('Create Individual Account')&&choice.includes('Register a Community Partner')&&choice.includes('Sign In'));
const individual=renderToStaticMarkup(<IndividualRegistrationFields api={async()=>({minimumAge:14})}/>);
assert.ok(individual.includes('birthDate')&&!individual.includes('registrationId'));
const organization=renderToStaticMarkup(<OrganizationFields/>);
assert.ok(organization.includes('registrationId')&&organization.includes('representativeEmail')&&!organization.includes('birthDate'));
const center=renderToStaticMarkup(<VerificationCenter embedded api={async()=>({})} me={{user:{id:'pending',account_type:'individual'},verification:{canParticipate:false}}} refresh={async()=>{}} signOut={()=>{}} onClose={()=>{}}/>);
assert.ok(center.includes('Back to Silver Bank'));
console.log('PASS: distinct individual/NGO forms and pending-user navigation back to Silver Bank.');
