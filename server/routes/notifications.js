import express from 'express';
import Job from '../models/NotificationJob.js';
import { requirePages } from '../middleware/authMiddleware.js';
const router=express.Router();
router.use(requirePages('/admin/account'));
router.get('/',async(req,res)=>{try{res.json(await Job.find().select('-payload -key').sort({createdAt:-1}).limit(100));}catch{res.sendStatus(500);}});
router.post('/:id/retry',async(req,res)=>{
  try {
    const statuses=req.body.confirmUncertain === true ? ['failed','uncertain'] : ['failed'];
    const job=await Job.findOneAndUpdate({_id:req.params.id,status:{$in:statuses}},{$set:{status:'pending',attempts:0,nextAttemptAt:new Date(),retriedBy:String(req.user.id)}},{new:true});
    if(!job)return res.status(409).json({message:'Delivery is not eligible for retry'});
    res.json({message:'Delivery queued'});
  }catch{res.sendStatus(500);}
});
export default router;
