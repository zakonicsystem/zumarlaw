import ServiceDetail from '../models/Service.js';

// Merge multiple services into one
export const mergeServices = async (req, res) => {
  try {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 service IDs required to merge' });
    }

    // Fetch all services to merge
    const services = await ServiceDetail.find({ _id: { $in: serviceIds } });

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
      serviceTitle: primary.serviceTitle,
      primaryName: primary.serviceTitle,
      personalId: primary.personalId,
      userId: primary.userId,
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

      // Merge form fields (combine from all services, with secondary data marked)
      formFields: {
        ...primary.formFields,
        ...services.slice(1).reduce((acc, service, idx) => {
          Object.keys(service.formFields || {}).forEach(key => {
            if (!acc[`secondary_service_${idx + 1}_${key}`]) {
              acc[`secondary_service_${idx + 1}_${key}`] = service.formFields[key];
            }
          });
          return acc;
        }, {})
      },

      // Keep primary certificate
      certificate: primary.certificate || null,

      assignedTo: primary.assignedTo || '',
      status: primary.status || 'pending',
      paymentStatus: primary.paymentStatus || 'pending',
      progressStatus: primary.progressStatus || '',
      invoiceSent: primary.invoiceSent || false,
    };

    // Update primary service with merged data
    const updatedMerged = await ServiceDetail.findByIdAndUpdate(
      primary._id,
      mergedData,
      { new: true }
    );

    // Mark secondary services as merged (instead of deleting)
    if (secondaryIds.length > 0) {
      await ServiceDetail.updateMany(
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

// Unmerge a merged service - restore original services
export const unmergeService = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the merged service
    const mergedService = await ServiceDetail.findById(id);

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
        await ServiceDetail.findByIdAndUpdate(
          backup._id,
          {
            $unset: {
              isMergedInto: 1,
              mergedIntoSet: 1
            },
            $set: {
              status: backup.data.status || 'pending'
            }
          }
        );
      }
    }

    // Remove merge markers from primary service
    await ServiceDetail.findByIdAndUpdate(
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
      message: 'Service unmerged successfully. Merged services restored to individual status.',
    });

  } catch (err) {
    console.error('Unmerge error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to unmerge service' });
  }
};
