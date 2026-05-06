import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaEye, FaUnlink } from 'react-icons/fa';
import { toast } from 'react-hot-toast';


const MergeServices = () => {
  const [allServices, setAllServices] = useState([]);
  const [mergedServices, setMergedServices] = useState([]);
  const [expandedMergeSets, setExpandedMergeSets] = useState(new Set());
  const [allServicesMap, setAllServicesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [selectedServices, setSelectedServices] = useState(new Set());
  const isEmployee = !!localStorage.getItem('employeeToken');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        // Fetch from all three service types
        const [manualRes, processingRes, convertedRes] = await Promise.all([
          axios.get(`${apiUrl}/api/manualService`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/admin/services`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/convertedService`).catch(() => ({ data: [] }))
        ]);

        // Combine and mark service type
        const manualServices = Array.isArray(manualRes.data) ? manualRes.data.map(s => ({ ...s, serviceSourceType: 'manual' })) : [];
        const processingServices = Array.isArray(processingRes.data) ? processingRes.data.map(s => ({ ...s, serviceSourceType: 'processing' })) : [];
        const convertedServices = Array.isArray(convertedRes.data) ? convertedRes.data.map(s => ({ ...s, serviceSourceType: 'converted' })) : [];

        const allServicesData = [...manualServices, ...processingServices, ...convertedServices];

        // Create map of all services by ID
        const servicesMap = {};
        allServicesData.forEach(service => {
          servicesMap[service._id] = service;
        });

        // Separate merged and unmerged services
        // Merged services are those with mergedIds length > 1
        // Unmerged are all services that are NOT secondary merged services
        const merged = allServicesData.filter(item => (item.mergedCount && item.mergedCount > 1) || (Array.isArray(item.mergedIds) && item.mergedIds.length > 1));
        const unmerged = allServicesData.filter(item =>
          !(item.mergedCount && item.mergedCount > 1) &&
          !(Array.isArray(item.mergedIds) && item.mergedIds.length > 1) &&
          !item.isMergedInto // Exclude secondary merged services
        );

        setAllServices(unmerged);
        setMergedServices(merged);
        setAllServicesMap(servicesMap);
      } catch (err) {
        toast.error('Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAll = [...allServices, ...mergedServices].filter(row => {
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (row.name && row.name.toLowerCase().includes(q)) ||
        (row.personalId?.name && row.personalId.name.toLowerCase().includes(q)) ||
        (row.primaryName && row.primaryName.toLowerCase().includes(q)) ||
        (row.cnic && row.cnic.toLowerCase().includes(q)) ||
        (row.personalId?.cnic && row.personalId.cnic.toLowerCase().includes(q)) ||
        (row.serviceType && row.serviceType.toLowerCase().includes(q)) ||
        (row.service && row.service.toLowerCase().includes(q)) ||
        (row.phone && row.phone.toLowerCase().includes(q)) ||
        (row.personalId?.phone && row.personalId.phone.toLowerCase().includes(q)) ||
        (row.email && row.email.toLowerCase().includes(q)) ||
        (row.personalId?.email && row.personalId.email.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    // Apply service type filter
    if (serviceTypeFilter !== 'all' && row.serviceSourceType !== serviceTypeFilter) {
      return false;
    }

    return true;
  });

  const filteredMerged = mergedServices.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (row.name && row.name.toLowerCase().includes(q)) ||
      (row.personalId?.name && row.personalId.name.toLowerCase().includes(q)) ||
      (row.primaryName && row.primaryName.toLowerCase().includes(q)) ||
      (row.cnic && row.cnic.toLowerCase().includes(q)) ||
      (row.personalId?.cnic && row.personalId.cnic.toLowerCase().includes(q)) ||
      (row.serviceType && row.serviceType.toLowerCase().includes(q)) ||
      (row.service && row.service.toLowerCase().includes(q)) ||
      (row.phone && row.phone.toLowerCase().includes(q)) ||
      (row.personalId?.phone && row.personalId.phone.toLowerCase().includes(q)) ||
      (row.email && row.email.toLowerCase().includes(q)) ||
      (row.personalId?.email && row.personalId.email.toLowerCase().includes(q));
  });

  const toggleService = (id) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedServices(newSelected);
  };

  const toggleExpandMergeSet = (mergeSetId) => {
    const newExpanded = new Set(expandedMergeSets);
    if (newExpanded.has(mergeSetId)) {
      newExpanded.delete(mergeSetId);
    } else {
      newExpanded.add(mergeSetId);
    }
    setExpandedMergeSets(newExpanded);
  };

  const getIndividualServicesForMergeSet = (mergedRecord) => {
    const mergedIds = mergedRecord.mergedIds || [];
    if (mergedIds.length === 0) return [];

    return mergedIds
      .map(id => allServicesMap[id])
      .filter(service => service !== undefined);
  };

  const toggleAllServices = () => {
    if (selectedServices.size === filteredAll.length && filteredAll.length > 0) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(filteredAll.map(s => s._id)));
    }
  };

  const handleMerge = async () => {
    if (selectedServices.size < 2) {
      toast.error('Please select at least 2 services to merge');
      return;
    }

    if (!window.confirm(`Merge ${selectedServices.size} services? This action cannot be undone.`)) {
      return;
    }

    setMerging(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const serviceIds = Array.from(selectedServices);

      // Get service types of all selected services
      const selectedServiceDetails = serviceIds.map(id =>
        allServices.find(s => s._id === id)
      );

      // Check if we have mixed service types
      const serviceTypes = new Set(selectedServiceDetails.map(s => s?.serviceSourceType));
      const isMixed = serviceTypes.size > 1;

      let endpoint = `${apiUrl}/api/manualService/merge`;

      if (isMixed) {
        // For mixed types, we need backend support - use a generic merge endpoint
        // For now, use manual service endpoint as it supports mixed types handling
        endpoint = `${apiUrl}/api/manualService/merge`;
      } else if (selectedServiceDetails[0]?.serviceSourceType === 'converted') {
        endpoint = `${apiUrl}/api/mergeConvertedLeads/merge`;
      } else if (selectedServiceDetails[0]?.serviceSourceType === 'processing') {
        endpoint = `${apiUrl}/api/mergeService/merge`;
      }

      console.log('Merging services via endpoint:', endpoint);
      console.log('Service IDs:', serviceIds);
      console.log('Service types:', Array.from(serviceTypes));
      console.log('Mixed types:', isMixed);

      const res = await axios.post(endpoint, {
        serviceIds: serviceIds,
        serviceTypes: Array.from(serviceTypes),
        isMixed: isMixed,
        allServices: allServices.map(s => ({ _id: s._id, serviceSourceType: s.serviceSourceType }))
      });

      if (res.data && res.data.success) {
        toast.success(`Successfully merged ${selectedServices.size} services`);

        // Remove merged services from allServices
        setAllServices(prev => prev.filter(s => !selectedServices.has(s._id)));

        // Add to merged services
        if (res.data.mergedService) {
          setMergedServices(prev => [...prev, res.data.mergedService]);
        }

        // Clear selection
        setSelectedServices(new Set());
      } else {
        toast.error(res.data?.message || 'Merge failed');
      }
    } catch (err) {
      console.error('Merge error:', err);
      toast.error(err.response?.data?.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const openInvoice = (row) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    if (!row.certificate) {
      toast.error('No certificate uploaded for this service');
      return;
    }

    // Open the certificate file in a new tab
    const certificateUrl = `${apiUrl}/uploads/${row.certificate}`;
    window.open(certificateUrl, '_blank');
    toast.success('Certificate opened in new tab');
  };

  const handleUnmerge = async (row) => {
    if (!window.confirm('Unmerge this record? This will attempt to restore original records on the server.')) return;
    try {
      toast('Unmerging...');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      // Determine the endpoint based on service type
      let endpoint = `${apiUrl}/api/manualService/${row._id}/unmerge`;

      if (row.serviceSourceType === 'converted') {
        endpoint = `${apiUrl}/api/mergeConvertedLeads/${row._id}/unmerge`;
      } else if (row.serviceSourceType === 'processing') {
        endpoint = `${apiUrl}/api/mergeService/${row._id}/unmerge`;
      }

      await axios.post(endpoint);
      setMergedServices(prev => prev.filter(p => p._id !== row._id));

      // Fetch all services again to update allServices
      const [manualRes, processingRes, convertedRes] = await Promise.all([
        axios.get(`${apiUrl}/api/manualService`).catch(() => ({ data: [] })),
        axios.get(`${apiUrl}/api/admin/services`).catch(() => ({ data: [] })),
        axios.get(`${apiUrl}/api/convertedService`).catch(() => ({ data: [] }))
      ]);

      const manualServices = Array.isArray(manualRes.data) ? manualRes.data.map(s => ({ ...s, serviceSourceType: 'manual' })) : [];
      const processingServices = Array.isArray(processingRes.data) ? processingRes.data.map(s => ({ ...s, serviceSourceType: 'processing' })) : [];
      const convertedServices = Array.isArray(convertedRes.data) ? convertedRes.data.map(s => ({ ...s, serviceSourceType: 'converted' })) : [];

      const allServicesData = [...manualServices, ...processingServices, ...convertedServices];
      const unmerged = allServicesData.filter(item => !(item.mergedCount && item.mergedCount > 1) && !(Array.isArray(item.mergedIds) && item.mergedIds.length > 1));

      setAllServices(unmerged);
      toast.success('Unmerged successfully');
    } catch (err) {
      toast.error('Unmerge failed');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-[#57123f] mb-6">Merge Services</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-4 font-semibold transition-colors ${activeTab === 'all'
              ? 'text-[#57123f] border-b-2 border-[#57123f]'
              : 'text-gray-500 hover:text-[#57123f]'
              }`}
          >
            All Services ({allServices.length})
          </button>
          <button
            onClick={() => setActiveTab('merged')}
            className={`pb-2 px-4 font-semibold transition-colors ${activeTab === 'merged'
              ? 'text-[#57123f] border-b-2 border-[#57123f]'
              : 'text-gray-500 hover:text-[#57123f]'
              }`}
          >
            Merged Services ({mergedServices.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              type="text"
              placeholder="Search by Name, CNIC, Email or Service"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'all' && (
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 focus:outline-none border border-gray-200"
            >
              <option value="all">All Types</option>
              <option value="manual">Manual</option>
              <option value="processing">Processing</option>
              <option value="converted">Converted</option>
            </select>
          )}
          {activeTab === 'all' && selectedServices.size > 0 && (
            <button
              onClick={handleMerge}
              disabled={merging || isEmployee}
              title={isEmployee ? "Employees cannot merge services" : ""}
              className="bg-[#57123f] text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 font-semibold whitespace-nowrap"
            >
              {merging ? 'Merging...' : `Merge Selected (${selectedServices.size})`}
            </button>
          )}
        </div>

        {/* All Services Tab */}
        {activeTab === 'all' && (
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="w-full text-xs text-left text-gray-800">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-600 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedServices.size === filteredAll.length && filteredAll.length > 0}
                      onChange={toggleAllServices}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Name & CNIC</th>
                  <th className="px-4 py-3">Phone & Email</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-400">Loading...</td></tr>
                ) : filteredAll.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-400">No services found</td></tr>
                ) : filteredAll.map(row => (
                  <tr key={row._id} className={`hover:bg-gray-50 ${selectedServices.has(row._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedServices.has(row._id)}
                        onChange={() => toggleService(row._id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.name || row.personalId?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{row.cnic || row.personalId?.cnic || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{isEmployee ? '••••••••••' : (row.phone || row.personalId?.phone || '-')}</div>
                      <div className="text-xs text-gray-500">{row.email || row.personalId?.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3">{row.serviceType || row.service || row.serviceTitle || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${row.serviceSourceType === 'manual' ? 'bg-orange-100 text-orange-700' :
                        row.serviceSourceType === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {row.serviceSourceType === 'manual' ? 'Manual' :
                          row.serviceSourceType === 'processing' ? 'Processing' : 'Converted'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        // For merged services, show the main/primary service status
                        let actualStatus = row.status;

                        // If this is a merged service (has mergedIds), just use the primary service's status
                        // The row object IS the main/primary service
                        if (row.mergedIds && row.mergedIds.length > 0) {
                          actualStatus = row.status || 'pending';
                        }

                        return (
                          <span className={`text-xs px-2 py-1 rounded ${actualStatus === 'completed' ? 'bg-green-100 text-green-700' :
                            actualStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              actualStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {actualStatus ? actualStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Pending'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <button disabled={isEmployee} title={isEmployee ? "Employees cannot view certificates" : "View"} className={`${isEmployee ? 'text-gray-400 cursor-not-allowed' : 'text-[#57123f] hover:text-[#a8326e]'}`} onClick={() => openInvoice(row)}><FaEye /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Merged Services Tab */}
        {activeTab === 'merged' && (
          <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-6 text-gray-400">Loading...</div>
            ) : filteredMerged.length === 0 ? (
              <div className="text-center py-6 text-gray-400">No merged services found</div>
            ) : (
              <div>
                {filteredMerged.map((mergeSet) => {
                  const isExpanded = expandedMergeSets.has(mergeSet._id);
                  const individualServices = getIndividualServicesForMergeSet(mergeSet);

                  return (
                    <div key={mergeSet._id} className="border-b border-gray-200">
                      {/* Merge Set Header */}
                      <div
                        className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                        onClick={() => toggleExpandMergeSet(mergeSet._id)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <button className="text-[#57123f] font-bold">{isExpanded ? '▼' : '▶'}</button>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">
                              {mergeSet.name || mergeSet.personalId?.name || mergeSet.primaryName || 'Merged Services'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {mergeSet.cnic || mergeSet.personalId?.cnic || '-'} • {mergeSet.email || mergeSet.personalId?.email || '-'} • {individualServices.length} service{individualServices.length !== 1 ? 's' : ''} merged
                            </div>
                          </div>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Merged
                          </span>
                        </div>
                        <div className="text-right ml-4">
                          <button
                            title={isEmployee ? "Employees cannot unmerge services" : "Unmerge"}
                            disabled={isEmployee}
                            className={`text-red-600 hover:text-red-800 ${isEmployee ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => { e.stopPropagation(); !isEmployee && handleUnmerge(mergeSet); }}
                          ><FaUnlink /></button>
                        </div>
                      </div>

                      {/* Expanded Content - Individual Services */}
                      {isExpanded && (
                        <div className="bg-white">
                          <table className="w-full text-xs text-left text-gray-800">
                            <thead className="bg-gray-100 border-b border-gray-200">
                              <tr className="text-gray-600 uppercase tracking-wide text-xs">
                                <th className="px-4 py-2">Name & CNIC</th>
                                <th className="px-4 py-2">Phone & Email</th>
                                <th className="px-4 py-2">Service</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {individualServices.map((service, idx) => (
                                <tr
                                  key={service._id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3">
                                    <div className="font-semibold">{service.name || service.personalId?.name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{service.cnic || service.personalId?.cnic || '-'}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div>{isEmployee ? '••••••••••' : (service.phone || service.personalId?.phone || '-')}</div>
                                    <div className="text-xs text-gray-500">{service.email || service.personalId?.email || '-'}</div>
                                  </td>
                                  <td className="px-4 py-3">{service.serviceType || service.service || service.serviceTitle || 'N/A'}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-1 rounded ${service.serviceSourceType === 'manual' ? 'bg-orange-100 text-orange-700' :
                                      service.serviceSourceType === 'processing' ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'
                                      }`}>
                                      {service.serviceSourceType === 'manual' ? 'Manual' :
                                        service.serviceSourceType === 'processing' ? 'Processing' : 'Converted'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {(() => {
                                      // Get original status from backup if available
                                      const backup = mergeSet.secondaryBackup?.find(b => b._id === service._id.toString());
                                      const originalStatus = backup?.data?.status || service.status;
                                      return (
                                        <span className={`text-xs px-2 py-1 rounded ${originalStatus === 'completed' ? 'bg-green-100 text-green-700' :
                                          originalStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                            originalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                              'bg-gray-100 text-gray-700'
                                          }`}>
                                          {originalStatus ? originalStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Pending'}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button disabled={isEmployee} title={isEmployee ? "Employees cannot view certificates" : "View"} className={`${isEmployee ? 'text-gray-400 cursor-not-allowed' : 'text-[#57123f] hover:text-[#a8326e]'}`} onClick={() => openInvoice(service)}><FaEye /></button>
                                  </td>
                                </tr>
                              ))}
                              {individualServices.length === 0 && (
                                <tr>
                                  <td colSpan="5" className="text-center py-4 text-gray-400">
                                    No services found
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MergeServices;