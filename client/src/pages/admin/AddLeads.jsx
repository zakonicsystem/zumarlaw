import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { FiUser, FiCreditCard, FiPhone, FiCalendar, FiCheckCircle, FiChevronDown } from 'react-icons/fi';

const AddLeads = () => {
    const { register, handleSubmit, formState: { errors }, reset, control, watch } = useForm();
    // Watch leadSource for conditional fields
    const leadSourceValue = watch('leadSource');
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        // Fetch employees from backend Roles model
       const fetchEmployees = async () => {
      try {
        const res = await axios.get('http://localhost:5000/admin/roles');
        const employeesArr = Array.isArray(res.data)
          ? res.data.filter(emp => typeof emp.name === 'string' && emp.name.trim() !== '')
          : [];
        setEmployees(employeesArr);
      } catch (err) {
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

    const onSubmit = async (data) => {
        const lead = {
            name: data.name,
            email: data.email,
            phone: `${data.countryCode}${data.phoneNumber}`,
            status: data.leadStatus || 'New Lead',
            date: new Date().toISOString().slice(0, 10),
            assigned: data.assignedTo,
            service: data.service,
            leadSource: data.leadSource,
            remarks: data.remarks,
        };
        // Add referral fields if present
        if (data.leadSource === 'Referral') {
            lead.referralName = data.referralName || '';
            lead.referralPhone = data.referralPhone || '';
        }
        try {
            await axios.post('http://localhost:5000/leads', lead);
            toast.success('Lead added successfully!');
            reset();
        } catch (err) {
            toast.error('Failed to add lead');
        }
    };

    const services = [
        'NTN Registration - Business',
        'NTN Registration - Salaried',
        'NTN Registration - Partnership',
        'NTN Registration - Company',
        'NTN Registration - NGO/NPO',
        'Private Limited Company Registration',
        'Single Member Company Registration',
        'Limited Liability Partnership (LLP)',
        'Partnership/AOP Registration',
        'Annual Tax Return - Salaried',
        'Annual Tax Return - Sole Proprietor',
        'Annual Tax Return - Company',
        'Annual Tax Return - NPO/NGO',
        'GST Registration - Trader',
        'GST Registration - Manufacturer',
        'Monthly Federal / Provincial Sales Tax Return Filing',
        'PST Registration - Individual',
        'PST Registration - Partnership',
        'PST Registration - Company',
        'Trademark Registration',
        'Copyright Registration',
        'Patent Registration',
        'NPO Registration with SECP',
        'NGO Registration with Registrar',
        'NGO/NPO Registration',
        'Registration of NGOs/ Charities/ Trusts with Sindh Charity Commission',
        'Arms License - Punjab (Non-Prohibited Bore)',
        'Arms License - All Pakistan (Non-Prohibited Bore)',
        'ICT Arms License (Punjab/Islamabad)',
        'Company Renewal Registration',
        'Company Registration PSEB',
        'Call Center Renewal Registration',
        'New Call Center Registration',
        'Freelancer Registration',
        'Freelancer Renewal',
        'Sole Proprietor',
        'Partnership firm',
        'Private Limited Company (PVT)',
        'Newspaper Registration',
  'RTO Password Recovery',
  'Company Transfer',
  'SECP Company Filing',
  'PSDA License',
  'Food Authority License',
  'Company Close',
  'ZGO License',
  'DTS License',
  'Medical Store License',
  'Import Export License'
];

    const leadSources = [
        'Website',
        'Referral',
        'Social Media',
        'Advertisement',
        'Walk-in',
        'Other'
    ];

    const branches = [
        'Main Branch - Islamabad',
        'Lahore Office',
        'Karachi Office',
        'Peshawar Office'
    ];



    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Page Heading and Breadcrumbs */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add New Lead</h1>
                <div className="flex items-center text-sm text-gray-600 mt-2">
                    <span className="hover:text-[#57123f] cursor-pointer">Dashboard</span>
                    <span className="mx-2">/</span>
                    <span className="hover:text-[#57123f] cursor-pointer">Lead Management</span>
                    <span className="mx-2">/</span>
                    <span className="text-[#57123f] font-medium">Add New Lead</span>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6">
                {/* Personal Details Section */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                        <FiUser className="mr-2" /> Add Personal Details
                    </h2>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                {...register("name")}
                                type="text"
                                className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter name"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                {...register("email", { pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: "Invalid email address" } })}
                                type="email"
                                className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter email"
                            />
                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                        </div>
                    </div>

                    {/* CNIC field removed as requested */}

                    <div className="mt-4">
                        <label className="block">
                            <span className='text-sm font-medium text-gray-700 mb-1 flex items-center'>

                                <FiPhone className="mr-2" /> Mobile Phone
                            </span>
                        </label>
                        <div className="flex">
                            <select
                                {...register("countryCode")}
                                className="w-20 px-2 py-2 border rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="+92">+92</option>
                            </select>
                            <input
                                {...register("phoneNumber", {
                                    pattern: {
                                        value: /^\d{10}$/,
                                        message: "Must be 10 digits"
                                    }
                                })}
                                type="text"
                                className="flex-1 px-4 py-2 border-t border-b border-r rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="XXXXXXXXXX"
                            />
                        </div>
                        {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>}
                    </div>
                </section>

                <div className="border-t border-gray-200 my-6"></div>

                {/* Remarks Input */}
                <section className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea
                        {...register("remarks")}
                        className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add any remarks or notes about the lead"
                        rows={3}
                    />
                </section>

                {/* Lead Information Section */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Lead Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Service Interested in</label>
                            <div className="relative">
                                <select
                                    {...register("service")}
                                    className="w-full px-4 py-2 border rounded-md appearance-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select the service</option>
                                    {services.map((service, index) => (
                                        <option key={index} value={service}>{service}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-3 text-gray-400" />
                            </div>
                            {errors.service && <p className="mt-1 text-sm text-red-600">{errors.service.message}</p>}
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Source</label>
                            <div className="relative">
                                <select
                                    {...register("leadSource")}
                                    className="w-full px-4 py-2 border rounded-md appearance-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select the lead source</option>
                                    {leadSources.map((source, index) => (
                                        <option key={index} value={source}>{source}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-3 text-gray-400" />
                            </div>
                            {errors.leadSource && <p className="mt-1 text-sm text-red-600">{errors.leadSource.message}</p>}
                        </div>

                        {/* Show referral fields if leadSource is Referral */}
                        {leadSourceValue === 'Referral' && (
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Person Name</label>
                                    <input
                                        type="text"
                                        {...register("referralName")}
                                        className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter referral person's name"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Person Phone</label>
                                    <input
                                        type="text"
                                        {...register("referralPhone")}
                                        className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter referral person's phone"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Branch removed */}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                            <div className="relative">
                                <select
                                    {...register("assignedTo")}
                                    className="w-full px-4 py-2 border rounded-md appearance-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                <option value="">Choose the employee</option>
                                {employees.length === 0 ? (
                                    <option disabled>Loading...</option>
                                ) : (
                                    employees.map(emp => (
                                        <option key={emp._id || emp.id || emp.name} value={emp.name}>
                                            {emp.name || emp.employeeName || emp.username || emp.fullName}
                                        </option>
                                    ))
                                )}
                                </select>
                                <FiChevronDown className="absolute right-3 top-3 text-gray-400" />
                            </div>
                            {errors.assignedTo && <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>}
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lead Status</label>
                        <div className="flex flex-wrap gap-3">
                            {['New', 'Contacted', 'Follow-up', 'Mature'].map((status) => (
                                <div key={status} className="flex items-center">
                                    <input
                                        {...register("leadStatus")}
                                        type="radio"
                                        id={status.toLowerCase()}
                                        value={status}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                        defaultChecked={status === 'New'}
                                    />
                                    <label htmlFor={status.toLowerCase()} className="ml-2 text-sm text-gray-700">
                                        {status}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        className="inline-flex items-center px-6 py-2 rounded-md text-white bg-[#57123f] hover:bg-opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#57123f]"
                    >
                        <FiCheckCircle className="mr-2" /> Move to Processing
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddLeads;