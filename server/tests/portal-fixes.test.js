import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import express from 'express';
import {readFileSync} from 'node:fs';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Roles from '../models/Roles.js';
import Payroll from '../models/Payroll.js';
import Attendance from '../models/Attendance.js';
import {authenticateAdmin,verifyJWT,resolveIdentity} from '../middleware/authMiddleware.js';
import {apiAccess} from '../middleware/apiAccess.js';
import {canReadServiceFile,referencesFile} from '../middleware/privateFiles.js';
import {validFileHeader,uploadOptions} from '../utils/uploadOptions.js';
import {reportingPeriod,feesInPeriod} from '../utils/reportingPeriod.js';
import {employeeCountsForSalaryMonth,payrollPeriod} from '../utils/payrollRules.js';
import {calculateSalary} from '../utils/calculateSalary.js';
import {failureState,notificationKey,processNotificationQueue} from '../utils/notificationQueue.js';
import payrollRouter,{validatePayrollAmount} from '../routes/payrolls.js';
import salaryRouter from '../routes/autoSalary.js';
process.env.JWT_SECRET='isolated-test-secret-not-production';
const userId='000000000000000000000001';
const adminId='000000000000000000000002';
const empId='000000000000000000000003';
const makeToken=(id,role='user')=>jwt.sign({id,role},process.env.JWT_SECRET,{expiresIn:'1h'});
const mockIdentities=t=>{
 t.mock.method(Admin,'findById',async id=>id===adminId?{_id:adminId,email:'admin@test.invalid'}:null);
 t.mock.method(User,'findById',async id=>id===userId?{_id:userId,email:'user@test.invalid',isActive:true}:null);
 t.mock.method(Roles,'findById',async id=>id===empId?{_id:empId,role:'admin',name:'Employee',login:{email:'employee@test.invalid'},employmentStatus:'active',assignedPages:['/admin/attendance']}:null);
};
const response=()=>({code:200,data:null,status(code){this.code=code;return this;},json(data){this.data=data;return this;},sendStatus(code){this.code=code;return this;},cookie(){}});
const invoke=async(router,path,method,req)=>{const res=response();await router.stack.find(l=>l.route?.path===path&&l.route.methods[method]).route.stack[0].handle(req,res);return res;};

test('ordinary users cannot become administrators; missing records are rejected',async t=>{
 mockIdentities(t);let passed=false;const res=response();
 await authenticateAdmin({headers:{authorization:'Bearer '+makeToken(userId)}},res,()=>{passed=true;});
 assert.equal(passed,false);assert.equal(res.code,403);
 await assert.rejects(resolveIdentity(makeToken('000000000000000000000099')));
 const employee=await resolveIdentity(makeToken(empId,'admin'));assert.equal(employee.role,'employee');
});
test('inactive and terminated accounts are rejected',async t=>{
 mockIdentities(t);t.mock.method(User,'findById',async()=>({_id:userId,isActive:false}));t.mock.method(Roles,'findById',async()=>null);
 await assert.rejects(resolveIdentity(makeToken(userId)));
 t.mock.method(User,'findById',async()=>null);t.mock.method(Roles,'findById',async()=>({_id:empId,employmentStatus:'terminated'}));
 await assert.rejects(resolveIdentity(makeToken(empId)));
});
test('real HTTP gate rejects anonymous and unauthorized requests, including mixed-case paths',async t=>{
 mockIdentities(t);const app=express();app.use('/api',apiAccess);app.use((req,res)=>res.json({ok:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>server.close());
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/api/admin/roles','/api/payrolls','/api/accounts/summary','/api/expense','/api/attendance/history','/api/forms/user']) assert.equal((await fetch(base+path)).status,401);
 assert.equal((await fetch(base+'/api/PAYROLLS',{headers:{Authorization:'Bearer '+makeToken(empId)}})).status,403);
 assert.equal((await fetch(base+'/api/payrolls',{headers:{Authorization:'Bearer '+makeToken(userId)}})).status,403);
 assert.equal((await fetch(base+'/api/attendance/history',{headers:{Authorization:'Bearer '+makeToken(empId)}})).status,200);
 assert.equal((await fetch(base+'/api/payrolls',{headers:{Authorization:'Bearer '+makeToken(adminId,'admin')}})).status,200);
 assert.equal((await fetch(base+'/api/auth/login',{method:'POST'})).status,200);
});
test('JSON serialization removes password hashes and setup secrets',()=>{
 const user=new User({email:'user@test.invalid',password:'hash',resetPasswordToken:'secret'}).toJSON();assert.equal(user.password,undefined);assert.equal(user.resetPasswordToken,undefined);
 const emp=new Roles({login:{email:'e@test.invalid',password:'hash'},setupTokenHash:'secret'}).toJSON();assert.equal(emp.login.password,undefined);assert.equal(emp.setupTokenHash,undefined);
 assert.equal(new Admin({password:'hash'}).toJSON().password,undefined);
});
test('conversation reads use verified email rather than supplied query email',async t=>{
 const {getUserConversations}=await import('../controllers/contactController.js');const {default:Contact}=await import('../models/ContactSubmission.js');let query;
 t.mock.method(Contact,'findOne',value=>{query=value;return {populate:async()=>null};});
 await getUserConversations({user:{email:'owner@test.com'},query:{email:'victim@test.com'}},response());assert.equal(query.userEmail,'owner@test.com');
});
test('document ownership and file-type checks reject unrelated clients and active content',()=>{
 const owner={role:'user',id:userId,email:'owner@test.invalid'};
 assert.equal(canReadServiceFile(owner,{userId},'proof.pdf'),true);
 assert.equal(canReadServiceFile(owner,{userId:empId},'proof.pdf'),false);
 assert.equal(canReadServiceFile({role:'employee',name:'Alice'},{assignedTo:'Bob'},'proof.pdf'),false);
 assert.equal(referencesFile({files:['uploads/proof.pdf']},'proof.pdf'),true);
 assert.equal(validFileHeader('.pdf',Buffer.from('<html>bad')),false);
 assert.equal(validFileHeader('.pdf',Buffer.from('%PDF-1.7')),true);
 assert.equal(validFileHeader('.txt',Buffer.from('<script>alert(1)</script>')),false);
 assert.equal(uploadOptions.limits.fileSize,10485760);
});
test('termination month includes days worked and excludes days after termination',()=>{
 const employee={employmentStatus:'terminated',terminatedAt:'2026-09-15T00:00:00+05:00'};
 assert.equal(employeeCountsForSalaryMonth(employee,2026,9),true);assert.equal(employeeCountsForSalaryMonth(employee,2026,10),false);
 const records=Array.from({length:15},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),present:true}));
 const salary=calculateSalary(30000,records,2026,9,employee);assert.equal(salary.finalSalary,15000);assert.equal(salary.nonEmploymentDays,15);
 records[0]={date:'2026-09-01',halfDay:true};assert.equal(calculateSalary(30000,records,2026,9,employee).finalSalary,14500);
});
test('payroll inputs reject invalid periods, negative salaries and infinity',()=>{
 for(const month of [0,13,'abc',1.5])assert.throws(()=>payrollPeriod(2026,month));
 for(const salary of [-1,Infinity,NaN,'',null])assert.throws(()=>validatePayrollAmount(salary));
 assert.equal(validatePayrollAmount(0),0);
 assert.ok(Payroll.schema.indexes().some(([fields,options])=>fields.payrollKey&&options.unique));
});
test('repeat automatic creation skips an existing employee/month',async t=>{
 t.mock.method(Roles,'find',async()=>[{_id:empId,name:'Employee',branch:'Main',salary:30000}]);
 t.mock.method(Payroll,'findOne',async()=>({_id:'existing'}));
 t.mock.method(Payroll.prototype,'save',async()=>assert.fail('must not insert duplicate'));
 const res=await invoke(salaryRouter,'/','post',{body:{year:2026,month:9},user:{id:adminId}});
 assert.equal(res.code,200);assert.equal(res.data.payrolls.length,0);assert.deepEqual(res.data.skipped,['Employee']);
});
test('paid payroll cannot be edited, deleted or recalculated',async t=>{
 t.mock.method(Payroll,'findById',async()=>({_id:empId,status:'Paid',salary:29500}));
 for(const [path,method] of [['/:id','put'],['/:id','delete'],['/:id/recalculate','post']]){
  const res=await invoke(payrollRouter,path,method,{params:{id:empId},body:{salary:1},user:{id:adminId}});assert.equal(res.code,409);
 }
});
test('manual payroll edits require a reason and whitelist fields',async t=>{
 t.mock.method(Payroll,'findById',async()=>({_id:empId,status:'Unpaid',salary:30000,employee:'Employee',branch:'Main',payrollMonth:'2026-09'}));
 const req={params:{id:empId},user:{id:adminId},body:{salary:29000}};
 assert.equal((await invoke(payrollRouter,'/:id','put',req)).code,400);
 req.body={salary:30000,'$set':{status:'Paid'}};assert.equal((await invoke(payrollRouter,'/:id','put',req)).code,400);
});
test('payslip loads the saved amount rather than recalculating attendance',async()=>{
 const source=readFileSync(new URL('../../client/src/pages/admin/Payroll.jsx',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('    // A payslip is a receipt'),source.indexOf('    const img = new Image();')).replace("import.meta.env.VITE_API_URL", "'http://local'");
 const run=new Function('axios','toast','rec','return (async()=>{'+body+';return enhancedRec;})();');
 const saved={_id:empId,salary:30000,status:'Paid'};let requested;
 const result=await run({get:async url=>{requested=url;return {data:saved};}},{error:assert.fail},saved);
 assert.ok(requested.endsWith('/api/payrolls/'+empId));assert.equal(result.baseSalary,30000);assert.equal(result.cutDays,0);
});
test('Pakistan report boundaries and separate fee dates are respected',()=>{
 const period=reportingPeriod({year:2026,month:9});assert.equal(period.start.toISOString(),'2026-08-31T19:00:00.000Z');
 assert.equal(feesInPeriod([{createdAt:'2026-08-01',challanFee:{amount:100,addedAt:'2026-08-31T18:59:59Z'},consultancyFee:{amount:200,addedAt:'2026-09-05'}}],period),200);
 assert.throws(()=>reportingPeriod({date:'2026-02-30'}));
});
test('notification deduplication and uncertain delivery rules',()=>{
 assert.equal(notificationKey('s',0,500,'sms'),notificationKey('s',0,500,'sms'));
 assert.notEqual(notificationKey('s',0,500,'sms'),notificationKey('s',500,500,'sms'));
 assert.equal(failureState(new Error('connection timeout'),1).status,'uncertain');
 assert.equal(failureState(new Error('recipient rejected'),1).status,'pending');
 assert.equal(failureState(new Error('recipient rejected'),5).status,'failed');
});
test('notification worker persists successful delivery and does not resend it',async()=>{
 const job={_id:'j',status:'pending',attempts:0};let sent=0;
 const model={updateMany:async()=>{},findOneAndUpdate:async()=>{if(job.status!=='pending')return null;job.status='sending';job.attempts++;return job;},updateOne:async(filter,update)=>Object.assign(job,update.$set)};
 await processNotificationQueue({model,deliver:async()=>{sent++;}});await processNotificationQueue({model,deliver:async()=>{sent++;}});
 assert.equal(sent,1);assert.equal(job.status,'sent');
});
