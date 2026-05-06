import Challan from '../models/Challan.js';
import ServiceDetail from '../models/Service.js';
import ManualServiceSubmission from '../models/ManualServiceSubmission.js';
import ConvertedLead from '../models/ConvertedLead.js';

// Helper to get service details by source
const getServiceDetails = async (serviceId, serviceSource) => {
  try {
    if (serviceSource === 'ServiceDetail') {
      return await ServiceDetail.findById(serviceId);
    } else if (serviceSource === 'ManualServiceSubmission') {
      return await ManualServiceSubmission.findById(serviceId);
    } else if (serviceSource === 'ConvertedLead') {
      return await ConvertedLead.findById(serviceId);
    }
  } catch (err) {
    return null;
  }
};

// Create a new challan
export const createChallan = async (req, res) => {
  try {
    const { serviceId, serviceSource, challanFee, consultancyFee, remarks } = req.body;

    if (!serviceId || !serviceSource) {
      return res.status(400).json({ success: false, message: 'serviceId and serviceSource required' });
    }

    // Verify service exists
    const service = await getServiceDetails(serviceId, serviceSource);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const challan = new Challan({
      serviceId,
      serviceSource,
      serviceName: service.serviceType || service.type || 'N/A',
      serviceType: service.serviceType || service.type || 'N/A',
      clientName: service.name || service.clientName || 'N/A',
      clientPhone: service.phone || service.clientPhone || 'N/A',
      challanFee: challanFee ? { amount: challanFee, addedAt: new Date() } : undefined,
      consultancyFee: consultancyFee ? { amount: consultancyFee, addedAt: new Date() } : undefined,
      remarks,
      addedBy: req.user?._id || req.adminId,
    });

    await challan.save();
    res.status(201).json({ success: true, challan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get challan by service
export const getChallanByService = async (req, res) => {
  try {
    const { serviceId, serviceSource } = req.params;

    const challan = await Challan.findOne({ serviceId, serviceSource });
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    res.json({ success: true, challan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all challans with optional filtering
export const getAllChallans = async (req, res) => {
  try {
    const { serviceSource, status } = req.query;
    const filter = {};

    if (serviceSource) filter.serviceSource = serviceSource;
    if (status) filter.status = status;

    const challans = await Challan.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, challans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update challan (add/edit fees)
export const updateChallan = async (req, res) => {
  try {
    const { id } = req.params;
    const { challanFee, consultancyFee, remarks, status } = req.body;

    const challan = await Challan.findById(id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    // Update fields
    if (typeof challanFee !== 'undefined') {
      challan.challanFee = { amount: challanFee, addedAt: new Date() };
    }
    if (typeof consultancyFee !== 'undefined') {
      challan.consultancyFee = { amount: consultancyFee, addedAt: new Date() };
    }
    if (remarks) challan.remarks = remarks;
    if (status) challan.status = status;

    await challan.save();
    res.json({ success: true, challan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete challan
export const deleteChallan = async (req, res) => {
  try {
    const { id } = req.params;

    const challan = await Challan.findByIdAndDelete(id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    res.json({ success: true, message: 'Challan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add fee to existing challan (Challan Fee or Consultancy Fee)
export const addFee = async (req, res) => {
  try {
    const { serviceId, serviceSource, feeType, amount, description } = req.body;

    if (!serviceId || !serviceSource || !feeType || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Find or create challan
    let challan = await Challan.findOne({ serviceId, serviceSource });

    if (!challan) {
      const service = await getServiceDetails(serviceId, serviceSource);
      if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }

      challan = new Challan({
        serviceId,
        serviceSource,
        serviceName: service.serviceType || service.type || 'N/A',
        serviceType: service.serviceType || service.type || 'N/A',
        clientName: service.name || service.clientName || 'N/A',
        clientPhone: service.phone || service.clientPhone || 'N/A',
        addedBy: req.user?._id || req.adminId,
      });
    }

    // Add the fee
    if (feeType === 'challan') {
      challan.challanFee = { amount: Number(amount), addedAt: new Date(), description };
    } else if (feeType === 'consultancy') {
      challan.consultancyFee = { amount: Number(amount), addedAt: new Date(), description };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid feeType' });
    }

    await challan.save();
    res.json({ success: true, challan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get fees summary for account statements
export const getFeesSummary = async (req, res) => {
  try {
    const { serviceSource } = req.query;
    const filter = { status: 'active' };
    if (serviceSource) filter.serviceSource = serviceSource;

    const challans = await Challan.find(filter);

    const summary = {
      totalChallanFees: 0,
      totalConsultancyFees: 0,
      totalFees: 0,
      count: challans.length,
    };

    challans.forEach((c) => {
      summary.totalChallanFees += c.challanFee?.amount || 0;
      summary.totalConsultancyFees += c.consultancyFee?.amount || 0;
      summary.totalFees += c.totalFees || 0;
    });

    res.json({ success: true, summary, challans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
