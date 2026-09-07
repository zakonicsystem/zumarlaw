import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Job from '../models/NotificationJob.js';
import ServiceMessage from '../models/Servicemessage.js';
import cpaas from '../services/cpaasService.js';
import { createEmailTransporter,getEmailFrom } from './emailTransporter.js';
import { getBrandedEmailLogoAttachment } from './brandedEmail.js';
export const notificationKey = (serviceId, previousPaid, amount, channel) => crypto.createHash('sha256').update(JSON.stringify([String(serviceId),Number(previousPaid),Number(amount),channel])).digest('hex');
const spool = fileURLToPath(new URL('../notification-outbox/', import.meta.url));
export async function enqueueNotification(job) {
  try { return await Job.findOneAndUpdate({key:job.key},{$setOnInsert:job},{upsert:true,new:true,runValidators:true}); }
  catch(error) {
    if(error.code === 11000) return;
    // Preserve the delivery request if MongoDB becomes unavailable after payment was saved.
    await fs.mkdir(spool,{recursive:true,mode:0o700});
    const target=path.join(spool,job.key+'.json');
    await fs.writeFile(target,JSON.stringify(job),{flag:'wx',mode:0o600}).catch(error=>{if(error.code!=='EEXIST')throw error;});
  }
}
async function restoreOutbox() {
  const files=await fs.readdir(spool).catch(()=>[]);
  for(const name of files.filter(name=>/^[a-f0-9]{64}\.json$/.test(name))) {
    const target=path.join(spool,name); const job=JSON.parse(await fs.readFile(target,'utf8'));
    try{await Job.updateOne({key:job.key},{$setOnInsert:job},{upsert:true});}catch(error){if(error.code!==11000)throw error;}
    await fs.unlink(target);
  }
}
export function failureState(error,attempts) {
  // A lost response may mean delivery succeeded. Never automatically resend that case.
  const uncertain = error.uncertain || /timeout|timed out|ECONNRESET|ETIMEDOUT|socket hang up/i.test(error.message || '');
  return {status:uncertain ? 'uncertain' : attempts >= 5 ? 'failed' : 'pending',lastError:String(error.message || 'Delivery failed').slice(0,300),nextAttemptAt:new Date(Date.now()+Math.min(3600000,30000 * 2 ** attempts))};
}
export async function deliverNotification(job) {
  if(job.channel === 'inapp') { await ServiceMessage.updateOne({notificationKey:job.key},{$setOnInsert:{...job.payload,notificationKey:job.key}},{upsert:true}); return; }
  if(job.channel === 'sms') {
    const result = await cpaas.sendCustomSMS(job.recipient,job.payload.message);
    if(!result.success) throw new Error(result.error || 'SMS provider rejected delivery');
    return;
  }
  const transporter = createEmailTransporter();
  try {
    const result = await transporter.sendMail({from:getEmailFrom(),to:job.recipient,...job.payload,messageId:'<'+job.key+'@zumarlawfirm.com>',attachments:[getBrandedEmailLogoAttachment()]});
    if(!result.accepted?.length) throw new Error('Email provider rejected recipient');
  } finally { transporter.close(); }
}
export async function processNotificationQueue({ model=Job, deliver=deliverNotification } = {}) {
  await model.updateMany({status:'sending',leaseUntil:{$lt:new Date()}},{$set:{status:'uncertain',lastError:'Worker stopped during delivery. Verify delivery before retrying.'}});
  for(let i=0;i<10;i++) {
    const job = await model.findOneAndUpdate({status:'pending',nextAttemptAt:{$lte:new Date()}},{$set:{status:'sending',leaseUntil:new Date(Date.now()+120000)},$inc:{attempts:1}},{new:true,sort:{nextAttemptAt:1}});
    if(!job) break;
    try { await deliver(job); await model.updateOne({_id:job._id,status:'sending'},{$set:{status:'sent',sentAt:new Date(),lastError:''},$unset:{leaseUntil:1}}); }
    catch(error) { await model.updateOne({_id:job._id,status:'sending'},{$set:failureState(error,job.attempts),$unset:{leaseUntil:1}}); }
  }
}
export function startNotificationWorker() {
  let busy=false;
  const tick=async()=>{ if(busy)return; busy=true; try{await restoreOutbox();await processNotificationQueue();}catch{console.error('Notification worker unavailable; pending deliveries retained');}finally{busy=false;} };
  const timer=setInterval(tick,30000); timer.unref(); void tick(); return timer;
}
