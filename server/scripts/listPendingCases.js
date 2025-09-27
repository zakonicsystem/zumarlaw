// scripts/listPendingCases.js
import mongoose from 'mongoose';
import Service from '../models/Service.js';
import ManualService from '../models/ManualServiceSubmission.js';
import ConvertedLead from '../models/ConvertedLead.js';

const MONGO_URI = 'mongodb://localhost:27017/zumarlaw'; // <-- update with your DB name

async function listPendingCases() {
  await mongoose.connect(MONGO_URI);

  const pendingServices = await Service.find({ status: 'pending' });
  const pendingManual = await ManualService.find({ status: 'pending' });
  const pendingConverted = await ConvertedLead.find({ status: 'pending' });

  console.log('Pending Service.js:', pendingServices.length);
  pendingServices.forEach(s => console.log(s._id, s.serviceTitle));

  console.log('Pending ManualServiceSubmission.js:', pendingManual.length);
  pendingManual.forEach(s => console.log(s._id, s.serviceType));

  console.log('Pending ConvertedLead.js:', pendingConverted.length);
  pendingConverted.forEach(s => console.log(s._id, s.service));

  const total = pendingServices.length + pendingManual.length + pendingConverted.length;
  console.log('Total Pending Cases:', total);

  await mongoose.disconnect();
}

listPendingCases();
