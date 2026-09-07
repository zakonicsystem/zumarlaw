import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: {type:String,required:true,unique:true}, channel:{type:String,enum:['email','sms','inapp'],required:true},
  serviceId:String, recipient:String, payload:mongoose.Schema.Types.Mixed,
  status:{type:String,enum:['pending','sending','sent','failed','uncertain'],default:'pending'}, attempts:{type:Number,default:0},
  nextAttemptAt:{type:Date,default:Date.now}, leaseUntil:Date, sentAt:Date, lastError:String, retriedBy:String
},{timestamps:true});
schema.index({status:1,nextAttemptAt:1});
export default mongoose.model('NotificationJob',schema);
