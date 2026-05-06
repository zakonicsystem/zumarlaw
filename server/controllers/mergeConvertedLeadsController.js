import ConvertedLead from '../models/ConvertedLead.js';

// Merge multiple converted leads into one
export const mergeConvertedLeads = async (req, res) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 service IDs required to merge' });
    }

    // Fetch all services to merge
    const services = await ConvertedLead.find({ _id: { $in: serviceIds } });

    if (services.length !== serviceIds.length) {
      return res.status(404).json({ success: false, message: 'One or more services not found' });
    }

    // Use first service as primary/template
    const primary = services[0];
    const secondaryIds = serviceIds.slice(1);

    // Backup secondary services data before deleting
    const secondaryBackup = services.slice(1).map((service) => ({
      _id: service._id.toString(),
      data: service.toObject()
    }));

    // Combine data from all services
    const mergedData = {
      name: primary.name,
      email: primary.email,
      phone: primary.phone,
      service: primary.service,
      primaryName: primary.name,
      mergedIds: serviceIds, // Store all merged service IDs
      mergedCount: serviceIds.length,
      mergedAt: new Date(),
      secondaryBackup: secondaryBackup, // Store backup to restore on unmerge

      // Combine pricing - sum totals and received amounts
      pricing: {
        totalPayment: services.reduce((sum, s) => sum + (Number(s.pricing?.totalPayment) || 0), 0),
        currentReceivingPayment: services.reduce((sum, s) => sum + (Number(s.pricing?.currentReceivingPayment) || 0), 0),
        remainingAmount: services.reduce((sum, s) => sum + (Number(s.pricing?.remainingAmount) || 0), 0),
        paymentMethod: primary.pricing?.paymentMethod || '',
        accountNumber: primary.pricing?.accountNumber || '',
        personName: primary.pricing?.personName || '',
        paymentReceivedDate: primary.pricing?.paymentReceivedDate || undefined,
      },

      // Combine all payments
      payments: services.flatMap(s => s.payments || []),

      // Merge fields (combine from all services, with secondary data marked)
      fields: {
        ...primary.fields,
        ...services.slice(1).reduce((acc, service, idx) => {
          Object.keys(service.fields || {}).forEach(key => {
            if (!acc[`secondary_service_${idx + 1}_${key}`]) {
              acc[`secondary_service_${idx + 1}_${key}`] = service.fields[key];
            }
          });
          return acc;
        }, {})
      },

      // Combine files from all services
      files: {
        ...primary.files,
        ...services.slice(1).reduce((acc, service, idx) => {
          Object.keys(service.files || {}).forEach(key => {
            if (!acc[`secondary_service_${idx + 1}_${key}`]) {
              acc[`secondary_service_${idx + 1}_${key}`] = service.files[key];
            }
          });
          return acc;
        }, {})
      },

      // Combine docs from all services
      docs: services.flatMap(s => s.docs || []),

      // Keep primary certificate
      certificate: primary.certificate || '',

      assigned: primary.assigned || '',
      status: primary.status || 'converted',
      progressStatus: primary.progressStatus || '',
    };

    // Update primary service with merged data
    const updatedMerged = await ConvertedLead.findByIdAndUpdate(
      primary._id,
      mergedData,
      { new: true }
    );

    // Mark secondary services as merged (instead of deleting)
    if (secondaryIds.length > 0) {
      await ConvertedLead.updateMany(
        { _id: { $in: secondaryIds } },
        {
          $set: {
            isMergedInto: primary._id,
            mergedIntoSet: serviceIds
          }
        }
      );
    }

    res.json({
      success: true,
      message: `Successfully merged ${serviceIds.length} services`,
      mergedService: updatedMerged
    });

  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to merge services' });
  }
};

// Unmerge a merged converted lead - restore original services
export const unmergeConvertedLead = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the merged service
    const mergedService = await ConvertedLead.findById(id);

    if (!mergedService) {
      return res.status(404).json({ success: false, message: 'Merged service not found' });
    }

    if (!Array.isArray(mergedService.mergedIds) || mergedService.mergedIds.length < 2) {
      return res.status(400).json({ success: false, message: 'This is not a merged service or cannot be unmerged' });
    }

    const mergedIds = mergedService.mergedIds;
    const primaryId = mergedIds[0];

    // Restore secondary services from backup
    if (Array.isArray(mergedService.secondaryBackup) && mergedService.secondaryBackup.length > 0) {
      for (const backup of mergedService.secondaryBackup) {
        await ConvertedLead.findByIdAndUpdate(
          backup._id,
          {
            $unset: {
              isMergedInto: 1,
              mergedIntoSet: 1
            },
            $set: {
              status: backup.data.status || 'converted'
            }
          }
        );
      }
    }

    // Remove merge markers from primary service
    await ConvertedLead.findByIdAndUpdate(
      primaryId,
      {
        $unset: {
          mergedIds: 1,
          mergedCount: 1,
          mergedAt: 1,
          primaryName: 1,
          secondaryBackup: 1,
        }
      }
    );

    res.json({
      success: true,
      message: 'Service unmerged successfully. Merged record deleted and primary service restored.',
    });

  } catch (err) {
    console.error('Unmerge error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to unmerge service' });
  }
};
