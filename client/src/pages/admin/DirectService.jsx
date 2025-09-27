import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const serviceFields = {
  'NTN Registration - Business': [
    { name: 'gmail_id', label: 'Gmail ID', type: 'email' },
    { name: 'phone_no', label: 'Phone Number', type: 'tel' },
    { name: 'Business_Name', label: 'Business Name', type: 'text' },
    { name: 'Business_Nature', label: 'Business Nature', type: 'text' },
    { name: 'Business_Address', label: 'Business Address', type: 'text' },
    { name: 'cnic_copy_front', label: 'Color Copy of CNIC Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'Color Copy of CNIC Back', type: 'file' },
    { name: 'agree_terms', label: 'I agree to the terms', type: 'checkbox' }
  ],
  'NTN Registration - Salaried': [
    { name: 'gmail_id', label: 'Gmail ID', type: 'email' },
    { name: 'phone_no', label: 'Phone Number', type: 'tel' },
    { name: 'cnic_copy_front', label: 'Color Copy of CNIC Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'Color Copy of CNIC Back', type: 'file' },
  ],
  'NTN Registration - Partnership': [
    { name: 'gmail_id', label: 'Gmail ID', type: 'email' },
    { name: 'phone_no', label: 'Phone Number', type: 'tel' },
    { name: 'cnic_partners_front', label: 'CNIC Copy of Partner Front', type: 'file' },
    { name: 'cnic_partners_back', label: 'CNIC Copy of Partner Back', type: 'file' },
    { name: 'firm_form_c', label: 'Firm Form C', type: 'file' },
    { name: 'deed', label: 'Deed', type: 'file' }
  ],
  'NTN Registration - Company': [
    { name: 'gmail_id', label: 'Gmail ID', type: 'email' },
    { name: 'phone_no', label: 'Phone Number', type: 'tel' },
    { name: 'directors_cnic_front', label: 'Color Copy of Director CNIC Front', type: 'file' },
    { name: 'directors_cnic_back', label: 'Color Copy of Director CNIC Back', type: 'file' },
    { name: 'incorporate_certificate', label: 'Incorporate Certificate', type: 'file' }
  ],
  'NTN Registration - NGO/NPO': [
    { name: 'npo_certificate', label: 'NPO Incorporate Certificate', type: 'file' },
    { name: 'gmail_id', label: 'Gmail ID', type: 'email' },
    { name: 'phone_no', label: 'Phone Number', type: 'tel' },
    { name: 'aoa_moa', label: 'AOA / MOA', type: 'file' },
  ],
  'Private Limited Company Registration': [
    { name: 'company_name', label: 'Company Name', type: 'text' },
    { name: 'company_address', label: 'Company Address', type: 'text' },
    { name: 'business_nature', label: 'Nature Of Business', type: 'text' },
    { name: 'directors_cnic_front', label: 'Color Copy of Director CNIC Front', type: 'file' },
    { name: 'directors_cnic_back', label: 'Color Copy of Director CNIC Back', type: 'file' },
    { name: 'director_gmail', label: 'Director Gmail', type: 'email' },
    { name: 'director_phone', label: 'Director Registered Phone No', type: 'tel' }
  ],
  'Single Member Company Registration': [
    { name: 'company_name', label: 'Company Name', type: 'text' },
    { name: 'company_address', label: 'Company Address', type: 'text' },
    { name: 'business_nature', label: 'Nature Of Business', type: 'text' },
    { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
    { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
    { name: 'owner_gmail', label: 'Owner Gmail', type: 'email' },
    { name: 'owner_phone', label: 'Owner Registered Phone No', type: 'tel' },
    { name: 'nominee_cnic_front', label: 'Nominee CNIC Copy Front', type: 'file' },
    { name: 'nominee_cnic_back', label: 'Nominee CNIC Copy Back', type: 'file' },
    { name: 'nominee_contact', label: 'Nominee Gmail / Phone No', type: 'text' }
  ],
  'Limited Liability Partnership (LLP)': [
    { name: 'llp_names', label: 'Three NAMES of the proposed LLP', type: 'text' },
    { name: 'partners_cnic_front', label: 'CNIC copies of ALL the proposed Partners Front', type: 'file' },
    { name: 'partners_cnic_back', label: 'CNIC copies of ALL the proposed Partners Back', type: 'file' },
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'company_address', label: 'Company Address', type: 'text' },
    { name: 'business_nature', label: 'Nature Of Business', type: 'text' },
    { name: 'partners_contact', label: 'Phone / Email of All Partners', type: 'text' }
  ],
  'Partnership/AOP Registration': [
    { name: 'partners_cnic_front', label: 'CNIC copy of ALL the Partner Front', type: 'file' },
    { name: 'partners_cnic_back', label: 'CNIC copy of ALL the Partner Back', type: 'file' },
    { name: 'partners_phone', label: 'Phone No of All Partners', type: 'text' },
    { name: 'partners_email', label: 'Email Id of All Partners', type: 'text' },
    { name: 'firm_deed', label: 'Firm Deed', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' }
  ],
  'Annual Tax Return - Salaried': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'bank_statement', label: 'Bank Statement', type: 'file' },
    { name: 'salary_slip', label: 'Salary Slip', type: 'file' },
    { name: 'new_assets', label: 'Any New Asset Details', type: 'text' }
  ],
  'Annual Tax Return - Sole Proprietor': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'bank_statement', label: 'Bank Statement', type: 'file' },
    { name: 'business_revenue', label: 'Business Revenue Detail', type: 'text' },
    { name: 'new_assets', label: 'Any New Assets Details', type: 'text' }
  ],
  'Annual Tax Return - Company': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'bank_statement', label: 'Bank Statement', type: 'file' },
    { name: 'taxes_deducted', label: 'Taxes Deducted at Source', type: 'text' },
    { name: 'other_info', label: 'Other Information as Required', type: 'text' }
  ],
  'Annual Tax Return - NPO/NGO': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'npo_bank_statement', label: 'NPO Account Bank Statement', type: 'file' },
    { name: 'financial_details', label: 'Financial Details', type: 'text' },
    { name: 'other_info', label: 'Other Information as Required', type: 'text' }
  ],
  'GST Registration - Trader': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'bank_certificate', label: 'Bank Maintenance Certificate', type: 'file' },
    { name: 'business_premises_pic', label: 'Business Premises Pic', type: 'file' },
    { name: 'electricity_bill', label: 'Electricity Bill Pic', type: 'file' },
    { name: 'electricity_meter', label: 'Electricity Meter Pic', type: 'file' },
    { name: 'biometric_verification', label: 'Biometric Verification', type: 'checkbox' }
  ],
  'GST Registration - Manufacturer': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'bank_certificate', label: 'Bank Maintenance Certificate', type: 'file' },
    { name: 'business_premises_pic', label: 'Business Premises Pic', type: 'file' },
    { name: 'electricity_bill', label: 'Electricity Bill Pic', type: 'file' },
    { name: 'electricity_meter', label: 'Electricity Meter Pic', type: 'file' },
    { name: 'machinery_pic', label: 'Pic of Machinery and Industrial Electricity or Gas Meter Installed', type: 'file' },
    { name: 'biometric_verification', label: 'Biometric Verification', type: 'checkbox' },
    { name: 'post_verification', label: 'Post Verification', type: 'checkbox' }
  ],
  'Monthly Federal / Provincial Sales Tax Return Filing': [
    { name: 'iris_login', label: 'Iris Login Id', type: 'text' },
    { name: 'invoice_details', label: 'Invoice Details', type: 'text' },
    { name: 'purchase_invoices', label: 'Copies of Purchase Invoices', type: 'file' },
    { name: 'bank_statement', label: 'Bank Statement', type: 'file' },
    { name: 'other_info', label: 'Other Information as Required', type: 'text' }
  ],
  'PST Registration - Individual': [
    { name: 'cnic_copy_front', label: 'Color Copy of CNIC Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'Color Copy of CNIC Back', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' },
    { name: 'letterhead', label: 'Letterhead', type: 'file' },
    { name: 'electricity_bill', label: 'Paid Electricity Bill', type: 'file' },
    { name: 'phone_number', label: 'Phone Number', type: 'text' },
    { name: 'email', label: 'Email Address', type: 'email' },
    { name: 'bank_certificate', label: 'Bank Account Certificate', type: 'file' },
    { name: 'signed_form', label: 'Signed Application Form', type: 'file' }
  ],
  'PST Registration - Company': [
    { name: 'incorporation_certificate', label: 'Incorporation Certificate', type: 'file' },
    { name: 'aoa_moa', label: 'AOA / MOA', type: 'file' },
    { name: 'form_a_29', label: 'Form A / 29', type: 'file' },
    { name: 'cnic_copy_front', label: 'Color Copy of CNIC Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'Color Copy of CNIC Back', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' },
    { name: 'letterhead', label: 'Letterhead', type: 'file' },
    { name: 'electricity_bill', label: 'Paid Electricity Bill', type: 'file' },
    { name: 'phone_number', label: 'Phone Number', type: 'text' },
    { name: 'email', label: 'Email Address', type: 'email' },
    { name: 'bank_certificate', label: 'Bank Account Certificate', type: 'file' },
    { name: 'signed_form', label: 'Signed Application Form', type: 'file' }
  ],
  'PST Registration - Partnership': [
    { name: 'form_c', label: 'Form C', type: 'file' },
    { name: 'partnership_deed', label: 'Partnership Deed', type: 'file' },
    { name: 'cnic_partners_front', label: 'Color Copy of CNIC (All Partners) Front', type: 'file' },
    { name: 'cnic_partners_back', label: 'Color Copy of CNIC (All Partners) Back', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' },
    { name: 'letterhead', label: 'Letterhead', type: 'file' },
    { name: 'electricity_bill', label: 'Paid Electricity Bill', type: 'file' },
    { name: 'phone_number', label: 'Phone Number', type: 'text' },
    { name: 'email', label: 'Email Address', type: 'email' },
    { name: 'bank_certificate', label: 'Bank Account Certificate', type: 'file' },
    { name: 'signed_form', label: 'Signed Application Form', type: 'file' }
  ],
  'Trademark Registration': [
    { name: 'gmail_id', label: 'Gmail ID', type: 'email' },
    { name: 'phone_number', label: 'Phone Number', type: 'text' },
    { name: 'cnic_owner_front', label: 'Color Copy of CNIC (Owner) Front', type: 'file' },
    { name: 'cnic_owner_back', label: 'Color Copy of CNIC (Owner) Back', type: 'file' },
    { name: 'brand_logo', label: 'Brand Logo', type: 'file' }
  ],
  'Copyright Registration': [
    { name: 'work_copies', label: 'Two Copies of Work', type: 'file' },
    { name: 'fee_proof', label: 'Demand Draft / Pay Order of Fee', type: 'file' },
    { name: 'cnic_copy_front', label: 'Color Copy of CNIC Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'Color Copy of CNIC Back', type: 'file' },
    { name: 'power_of_attorney', label: 'Power of Attorney', type: 'file' },
    { name: 'letterhead', label: 'Letterhead of the Business', type: 'file' },
    { name: 'noc_publisher', label: 'NOC from Publisher', type: 'file' },
    { name: 'search_certificate', label: 'Search Certificate from Trademark Office', type: 'file' }
  ],
  'Patent Registration': [
    { name: 'form_p1', label: 'Form P-1 or P-1A (Without Priority)', type: 'file' },
    { name: 'form_p2', label: 'Form P-2 or P-2A (With Priority)', type: 'file' },
    { name: 'form_p3', label: 'Form P-3 (Provisional) or P-3A (Complete Specification)', type: 'file' },
    { name: 'specification', label: 'Patent Specification', type: 'file' },
    { name: 'drawings', label: 'Drawings (if any)', type: 'file' },
    { name: 'fee_proof', label: 'Demand Draft / Pay Order of Fee', type: 'file' },
    { name: 'form_p28', label: 'Form P-28 (Power of Attorney)', type: 'file' },
    { name: 'priority_document', label: 'Priority Document', type: 'file' },
    { name: 'cnic_applicant_front', label: 'CNIC of the Applicant Front Side', type: 'file' },
    { name: 'cnic_applicant_back', label: 'CNIC of the Applicant Back Side', type: 'file' },
    { name: 'other_docs', label: 'Other Information or Documents as Required', type: 'file' }
  ],
  'NPO Registration with SECP': [
    { name: 'npo_name', label: 'NPO Name', type: 'text' },
    { name: 'npo_objective', label: 'NPO Objective', type: 'textarea' },
    { name: 'phone_members', label: 'Phone Number of All Members', type: 'text' },
    { name: 'email_members', label: 'Email ID of All Members', type: 'email' },
    { name: 'cnic_members_front', label: 'Color Copy of CNIC (All Members - Minimum 3)', type: 'file' },
    { name: 'cnic_members_back', label: 'Color Copy of CNIC (All Members - Minimum 3)', type: 'file' },
    { name: 'cvs_members', label: 'CVs of All Members', type: 'file' },
    { name: 'qualification_certificates', label: 'Bachelor\'s Qualification Certificates (All Members)', type: 'file' }
  ],

  'NGO Registration with Registrar': [
    { name: 'ngo_name', label: 'NGO Name', type: 'text' },
    { name: 'ngo_objective', label: 'NGO Objective', type: 'textarea' },
    { name: 'phone_members', label: 'Phone Number of All Members', type: 'text' },
    { name: 'email_members', label: 'Email ID of All Members', type: 'email' },
    { name: 'cnic_members_front', label: 'Color Copy of CNIC Front (All Members - Minimum 7)', type: 'file' },
    { name: 'cnic_members_back', label: 'Color Copy of CNIC Back (All Members - Minimum 7)', type: 'file' },
    { name: 'qualification_certificates', label: 'Bachelor\'s Qualification Certificates (All Members)', type: 'file' },
    { name: 'executive_body_list', label: 'Executive Body List', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' }
  ],

  'NGO/NPO Registration': [
    { name: 'trust_name', label: 'Trust Name', type: 'text' },
    { name: 'email_members', label: 'Email ID of All Members', type: 'email' },
    { name: 'trust_objective', label: 'Trust Objective', type: 'textarea' },
    { name: 'cnic_members_front', label: 'Color Copy of CNIC (All Members) Front', type: 'file' },
    { name: 'cnic_members_back', label: 'Color Copy of CNIC (All Members) Back', type: 'file' },
    { name: 'phone_members', label: 'Phone Number of All Members', type: 'text' },
    { name: 'executive_body_list', label: 'Executive Body List', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' }
  ],

  'Registration of NGOs/ Charities/ Trusts with Sindh Charity Commission': [
    { name: 'organization_name', label: 'Organization Name', type: 'text' },
    { name: 'organization_objective', label: 'Organization Objective', type: 'textarea' },
    { name: 'phone_members', label: 'Phone Number of All Members', type: 'text' },
    { name: 'email_members', label: 'Email ID of All Members', type: 'email' },
    { name: 'cnic_members_front', label: 'Color Copy of CNIC (All Members) Front', type: 'file' },
    { name: 'cnic_members_back', label: 'Color Copy of CNIC (All Members) Back', type: 'file' },
    { name: 'executive_body_list', label: 'Executive Body List', type: 'file' },
    { name: 'rent_agreement', label: 'Rent Agreement', type: 'file' }
  ],
  'Arms License - Punjab (Non-Prohibited Bore)': [
    { name: 'cnic_copy_front', label: 'CNIC Copy Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'CNIC Copy Back', type: 'file' },
    { name: 'photo', label: 'Photo', type: 'file' },
    { name: 'medical_certificate', label: 'Medical Certificate (Proposed Arms License)', type: 'file' },
    { name: 'character_certificate', label: 'Character Certificate (Proposed Arms License)', type: 'file' },
    { name: 'affidavit', label: 'Affidavit', type: 'file' }
  ],

  'Arms License - All Pakistan (Non-Prohibited Bore)': [
    { name: 'cnic_copy_front', label: 'CNIC Copy Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'CNIC Copy Back', type: 'file' },
    { name: 'photo', label: 'Photo', type: 'file' },
    { name: 'medical_certificate', label: 'Medical Certificate (Proposed Arms License)', type: 'file' },
    { name: 'character_certificate', label: 'Character Certificate (Proposed Arms License)', type: 'file' },
    { name: 'affidavit', label: 'Affidavit', type: 'file' }
  ],

  'ICT Arms License (Punjab/Islamabad)': [
    { name: 'cnic_copy_front', label: 'CNIC Copy Front', type: 'file' },
    { name: 'cnic_copy_back', label: 'CNIC Copy Back', type: 'file' },
    { name: 'photo', label: 'Photo', type: 'file' },
    { name: 'medical_certificate', label: 'Medical Certificate (Proposed Arms License)', type: 'file' },
    { name: 'character_certificate', label: 'Character Certificate (Proposed Arms License)', type: 'file' },
    { name: 'proof_residence', label: 'Proof of Residence in Islamabad', type: 'file' }
  ],
  'Company Renewal Registration': [
    { name: 'export_summary', label: 'Summary of Export Revenue (with IT/ITeS code defined by SBP)', type: 'file' },
    { name: 'financial_statement', label: 'Financial Statement or Income Tax Return (preceding year)', type: 'file' }
  ],
  'Company Registration PSEB': [
    { name: 'business_ntn', label: 'Business NTN', type: 'text' },
    { name: 'directors_cnic', label: 'Color Copy of Director CNIC Front', type: 'file' },
    { name: 'directors_cnic_front', label: 'Color Copy of Director CNIC Front', type: 'file' },
    { name: 'directors_cnic_Back', label: 'Color Copy of Director CNIC Back', type: 'file' },
    { name: 'passports_directors', label: 'Passports of Directors', type: 'file' },
    { name: 'memorandum_articles', label: 'Memorandum & Articles of Association (SECP)', type: 'file' },
    { name: 'incorporation_certificate', label: 'Incorporation Certificate (SECP)', type: 'file' },
    { name: 'partnership_deed', label: 'Partnership Deed (for firms)', type: 'file' },
    { name: 'firm_registration_certificate', label: 'Firm Registration Certificate (for firms)', type: 'file' },
    { name: 'bank_statement', label: 'Business Bank Statement', type: 'file' },
    { name: 'maintenance_certificate', label: 'Business Maintenance Certificate', type: 'file' }
  ],

  'Call Center Renewal Registration': [
    { name: 'export_summary', label: 'Summary of Export Revenue (with IT/ITeS code defined by SBP)', type: 'file' },
    { name: 'financial_statement', label: 'Financial Statement or Income Tax Return (preceding year)', type: 'file' }
  ],

  'New Call Center Registration': [
    { name: 'business_ntn', label: 'Business NTN', type: 'text' },
    { name: 'directors_cnic_front', label: 'Color Copy of Director CNIC Front', type: 'file' },
    { name: 'directors_cnic_back', label: 'Color Copy of Director CNIC Back', type: 'file' },
    { name: 'passports_directors', label: 'Passports of Directors', type: 'file' },
    { name: 'memorandum_articles', label: 'Memorandum & Articles of Association (SECP)', type: 'file' },
    { name: 'incorporation_certificate', label: 'Incorporation Certificate (SECP)', type: 'file' },
    { name: 'partnership_deed', label: 'Partnership Deed (for firms)', type: 'file' },
    { name: 'firm_registration_certificate', label: 'Firm Registration Certificate (for firms)', type: 'file' },
    { name: 'bank_statement', label: 'Business Bank Statement', type: 'file' },
    { name: 'maintenance_certificate', label: 'Business Maintenance Certificate', type: 'file' }
  ],

  'Freelancer Registration': [
    { name: 'personal_ntn', label: 'Personal NTN', type: 'text' },
    { name: 'cnic_front', label: 'CNIC Front', type: 'file' },
    { name: 'cnic_back', label: 'CNIC Back', type: 'file' },
    { name: 'bank_certificate', label: 'Personal Bank Account Letter/Certificate', type: 'file' }
  ],

  'Freelancer Renewal': [
    { name: 'export_summary', label: 'Summary of Export Revenue (with IT/ITeS code defined by SBP)', type: 'file' },
    { name: 'income_tax_return', label: 'Income Tax Return (preceding year)', type: 'file' }
  ],
  'Sole Proprietor': [
    { name: 'business_ntn', label: 'Business NTN', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone No', type: 'text' }
  ],

  'Partnership firm': [
    { name: 'firm_ntn', label: 'Firm NTN', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone No', type: 'text' },
    { name: 'form_c', label: 'Form C', type: 'file' }
  ],

  'Private Limited Company (PVT)': [
    { name: 'company_ntn', label: 'Company NTN', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone No', type: 'text' },
    { name: 'incorporation_certificate', label: 'Incorporation Certificate', type: 'file' }
  ],
'Newspaper Registration': [
  { name: 'newspaper_name', label: 'Newspaper Name', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
  { name: 'master_degree', label: 'Master Degree Copy', type: 'file' },
  { name: 'experience_certificate', label: 'Experience Certificate', type: 'file' },
  { name: 'bank_statement', label: 'Bank Statement', type: 'file' }
],

'RTO Password Recovery': [
  { name: 'cnic_front', label: 'Original CNIC Front Pic', type: 'file' },
  { name: 'cnic_back', label: 'Original CNIC Back Pic', type: 'file' },
  { name: 'gmail', label: 'Active Gmail ID', type: 'email' },
  { name: 'phone', label: 'Registered Phone No', type: 'tel' },
  { name: 'rto_name', label: 'RTO Name', type: 'text' }
],

'Company Transfer': [
  { name: 'owner_login_secp', label: 'Owner Login SECP', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
  { name: 'purchaser_cnic_front', label: 'Purchaser CNIC Copy Front', type: 'file' },
  { name: 'purchaser_cnic_back', label: 'Purchaser CNIC Copy Back', type: 'file' },
  { name: 'purchaser_gmail', label: 'Purchaser Gmail', type: 'email' },
  { name: 'purchaser_phone', label: 'Purchaser Phone No', type: 'tel' },
  { name: 'share_transfer', label: 'Share Transfer Details', type: 'text' }
],

'SECP Company Filing': [
  { name: 'secp_login', label: 'SECP Login', type: 'text' },
  { name: 'directors_pin', label: 'All Directors Pin Code', type: 'text' },
  { name: 'total_revenue', label: 'Total Revenue', type: 'number' },
  { name: 'total_employees', label: 'Total Employees', type: 'number' }
],

'PSDA License': [
  { name: 'institute_name', label: 'Institute Name', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
  { name: 'bank_statement', label: 'Owner Bank Statement', type: 'file' },
  { name: 'courses_details', label: 'Courses Details', type: 'text' },
  { name: 'classes_enrollment', label: 'Classes Enrollment', type: 'text' },
  { name: 'ntn_copy', label: 'Owner NTN Copy', type: 'file' },
  { name: 'admission_form', label: 'Admission Form', type: 'file' },
  { name: 'other_details', label: 'Other Details (Labs, Washroom, Storeroom, etc.)', type: 'text' },
  { name: 'gmail', label: 'Owner Gmail ID', type: 'email' },
  { name: 'phone', label: 'Owner Phone No', type: 'tel' }
],

'Food Authority License': [
  { name: 'shop_name', label: 'Shop Name', type: 'text' },
  { name: 'shop_address', label: 'Shop Address', type: 'text' },
  { name: 'items_details', label: 'Items Details', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Back', type: 'file' },
  { name: 'gmail', label: 'Owner Gmail ID', type: 'email' },
  { name: 'phone', label: 'Owner Phone No', type: 'tel' },
  { name: 'owner_photo', label: 'Owner Photo', type: 'file' },
  { name: 'unit_details', label: 'Unit Details (if applicable)', type: 'text' }
],

'Company Close': [
  { name: 'secp_login', label: 'SECP Login ID', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
  { name: 'auditor_report', label: 'Auditor Report', type: 'file' },
  { name: 'affidavit', label: 'Affidavit', type: 'file' }
],

'ZGO License': [
  { name: 'directors_cnic_front', label: 'Directors CNIC Copy Front', type: 'file' },
  { name: 'directors_cnic_back', label: 'Directors CNIC Copy Back', type: 'file' },
  { name: 'incorporate_certificate', label: 'Company Incorporate Certificate', type: 'file' },
  { name: 'aoa_moa', label: 'Company AOA/MOA', type: 'file' },
  { name: 'form_21', label: 'Company FORM 21', type: 'file' },
  { name: 'dts_license', label: 'DTS License (if applicable)', type: 'file' },
  { name: 'iata_license', label: 'IATA License (if applicable)', type: 'file' },
  { name: 'no_dispute_certificate', label: 'Directors No Dispute Certificate', type: 'file' },
  { name: 'ntn', label: 'Company and Directors NTN', type: 'file' },
  { name: 'gmail', label: 'Company Gmail ID', type: 'email' },
  { name: 'phone', label: 'Company Phone No', type: 'tel' }
],

'DTS License': [
  { name: 'institute_name', label: 'Institute Name', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
  { name: 'gmail', label: 'Institute Gmail ID', type: 'email' },
  { name: 'phone', label: 'Institute Phone No', type: 'tel' },
  { name: 'institute_address', label: 'Institute Address', type: 'text' },
  { name: 'bank_statement', label: 'Bank Statement', type: 'file' },
  { name: 'bank_security', label: 'Bank Security Deposit Slip', type: 'file' },
  { name: 'office_plan', label: 'Office Plan', type: 'file' },
  { name: 'sole_ntn', label: 'NTN (for Sole Proprietorship)', type: 'file' },
  { name: 'partnership_docs', label: 'Partnership Docs (Form C, Firm Deed, All Partners CNIC)', type: 'file' },
  { name: 'company_docs', label: 'Company Docs (Incorporate Certificate, AoA, MoA)', type: 'file' },
  { name: 'license_category', label: 'License Category', type: 'text' }
],

'Medical Store License': [
  { name: 'store_name', label: 'Medical Store Name', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Copy Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Copy Back', type: 'file' },
  { name: 'gmail', label: 'Owner Gmail ID', type: 'email' },
  { name: 'phone', label: 'Owner Phone No', type: 'tel' },
  { name: 'qualification_certificate', label: 'Owner Qualification Certificate', type: 'file' },
  { name: 'owner_biometric', label: 'Owner Biometric Slip', type: 'file' },
  { name: 'qualified_person_cnic_front', label: 'Qualified Person CNIC Front', type: 'file' },
  { name: 'qualified_person_cnic_back', label: 'Qualified Person CNIC Back', type: 'file' },
  { name: 'degree_copy', label: 'Degree Copy', type: 'file' },
  { name: 'biometric_slip', label: 'Biometric Slip', type: 'file' },
  { name: 'contract_agreement', label: 'Contract Agreement', type: 'file' },
  { name: 'store_board_pic', label: 'Medical Store Board Pic', type: 'file' },
  { name: 'ac_photo', label: 'AC Photo', type: 'file' },
  { name: 'refrigerator_photo', label: 'Refrigerators Photo', type: 'file' }
],

'Import Export License': [
  { name: 'ntn', label: 'Business NTN', type: 'text' },
  { name: 'owner_cnic_front', label: 'Owner CNIC Front', type: 'file' },
  { name: 'owner_cnic_back', label: 'Owner CNIC Back', type: 'file' },
  { name: 'gmail', label: 'Business Gmail ID', type: 'email' },
  { name: 'phone', label: 'Business Phone No', type: 'tel' }
]

};


const DirectService = () => {
  const [selectedService, setSelectedService] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [cnicGroups, setCnicGroups] = useState([]); // For dynamic CNIC fields
  const [serviceOptions, setServiceOptions] = useState(Object.keys(serviceFields));
  const [memberContacts, setMemberContacts] = useState([]); // For dynamic email/phone fields
  const [priceFields, setPriceFields] = useState({ totalPrice: '', advancePayment: '', paymentDate: '' }); // Add price fields to the form

  // Dynamic member contact logic
  const handleAddMemberContact = () => {
    setMemberContacts((prev) => [
      ...prev,
      { id: Date.now(), email: '', phone: '' },
    ]);
  };
  const handleRemoveMemberContact = (id) => {
    setMemberContacts((prev) => prev.filter((g) => g.id !== id));
  };
  const handleMemberContactChange = (e, id, field) => {
    const value = e.target.value;
    setMemberContacts((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  // Update fields when service changes
  useEffect(() => {
    if (selectedService) {
      setFields(serviceFields[selectedService] || []);
    } else {
      setFields([]);
    }
  }, [selectedService]);

  // Handle input changes for main form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle dynamic field changes (for required docs)
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : type === 'checkbox' ? checked : value,
    }));
  };

  // Dynamic CNIC group logic (if needed)
  const handleAddCnicField = () => {
    setCnicGroups((prev) => [
      ...prev,
      { id: Date.now(), front: null, back: null },
    ]);
  };
  const handleRemoveCnicField = (id) => {
    setCnicGroups((prev) => prev.filter((g) => g.id !== id));
  };
  const handleCnicChange = (e, id, side) => {
    const file = e.target.files[0];
    setCnicGroups((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, [side]: file } : g
      )
    );
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('serviceType', selectedService);
      // Main form fields
      ['name', 'email', 'cnic', 'phone', 'price'].forEach((key) => {
        if (formData[key]) data.append(key, formData[key]);
      });
      // Dynamic fields
      fields.forEach((field) => {
        if (field.type === 'file' && formData[field.name]) {
          data.append(field.name, formData[field.name]);
        } else if (field.type === 'checkbox') {
          data.append(field.name, formData[field.name] ? 'true' : 'false');
        } else if (formData[field.name]) {
          data.append(field.name, formData[field.name]);
        }
      });

      // CNIC groups (if any)
      cnicGroups.forEach((group, idx) => {
        if (group.front) data.append(`cnic_group_${idx}_front`, group.front);
        if (group.back) data.append(`cnic_group_${idx}_back`, group.back);
      });

      // Member contacts (if any)
      memberContacts.forEach((contact, idx) => {
        if (contact.email) data.append(`member_contact_${idx}_email`, contact.email);
        if (contact.phone) data.append(`member_contact_${idx}_phone`, contact.phone);
      });

      // Payment fields (new)
      data.append('totalPayment', priceFields.totalPayment || '');
      data.append('currentReceivingPayment', priceFields.currentReceivingPayment || '');
      data.append('remainingAmount',
        priceFields.totalPayment && priceFields.currentReceivingPayment
          ? Math.max(Number(priceFields.totalPayment) - Number(priceFields.currentReceivingPayment), 0)
          : ''
      );
      data.append('paymentMethod', priceFields.paymentMethod || '');
      data.append('accountNumber', priceFields.accountNumber || '');
  data.append('personName', priceFields.personName || '');
  data.append('paymentDate', priceFields.paymentDate || '');

      // POST to backend (use relative path for Vite proxy)
      await axios.post('/manualService', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Service submitted successfully!');
      setFormData({});
      setCnicGroups([]);
      setShowForm(false);
      setSelectedService('');
      // Optionally: trigger update in ManualService.jsx (e.g., via context or event)
    } catch (err) {
      toast.error('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-[#57123f]">Manual Service Submission</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Select Service
          </label>
          <select
            value={selectedService}
            onChange={(e) => {
              setSelectedService(e.target.value);
              setShowForm(true);
            }}
            className="w-full border rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#57123f]"
          >
            <option value="">Select a service...</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            name="name"
            onChange={handleInputChange}
            className="border rounded p-3"
            type='text'
            placeholder="Add Full Name"
            value={formData.name || ''}
          />

          <input
            name="email"
            type='email'
            onChange={handleInputChange}
            className="border rounded p-3"
            placeholder="Add Email"
            value={formData.email || ''}
          />

          <input
            name="cnic"
            type='text'
            onChange={handleInputChange}
            className="border rounded p-3"
            placeholder="CNIC : *************"
            value={formData.cnic || ''}
          />

          <div className="flex items-center border rounded p-3">
            <input
              name="phone"
              type='tel'
              onChange={handleInputChange}
              className="flex-1 outline-none"
              placeholder="Phone : ************"
              value={formData.phone || ''}
            />
          </div>
        </div>
           {/* Payment fields (matching Convert Lead modal) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Total Payment</label>
                <input
                  type="number"
                  name="totalPayment"
                  className="border rounded px-3 py-2 w-full"
                  value={priceFields.totalPayment || ''}
                  onChange={e => setPriceFields(f => ({ ...f, totalPayment: e.target.value }))}
                  placeholder="Enter total payment for this service"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Payment Date</label>
                <input
                  type="date"
                  name="paymentDate"
                  className="border rounded px-3 py-2 w-full"
                  value={priceFields.paymentDate || ''}
                  onChange={e => setPriceFields(f => ({ ...f, paymentDate: e.target.value }))}
                  required
                />
              </div>
            
              <div>
                <label className="block font-semibold mb-1">Current Receiving Payment</label>
                <input
                  type="number"
                  name="currentReceivingPayment"
                  className="border rounded px-3 py-2 w-full"
                  value={priceFields.currentReceivingPayment || ''}
                  onChange={e => setPriceFields(f => ({ ...f, currentReceivingPayment: e.target.value }))}
                  placeholder="Enter current payment received"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Remaining Amount</label>
                <input
                  type="number"
                  name="remainingAmount"
                  className="border rounded px-3 py-2 w-full bg-gray-100"
                  value={
                    priceFields.totalPayment && priceFields.currentReceivingPayment
                      ? Math.max(Number(priceFields.totalPayment) - Number(priceFields.currentReceivingPayment), 0)
                      : ''
                  }
                  placeholder="Auto-calculated"
                  readOnly
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Payment Method</label>
                <select
                  name="paymentMethod"
                  className="border rounded px-3 py-2 w-full"
                  value={priceFields.paymentMethod || ''}
                  onChange={e => setPriceFields(f => ({ ...f, paymentMethod: e.target.value }))}
                  required
                >
                  <option value="">Select method</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank">Bank</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="Jazzcash">Jazzcash</option>
                </select>
              </div>
              {(priceFields.paymentMethod === 'Bank' || priceFields.paymentMethod === 'Easypaisa' || priceFields.paymentMethod === 'Jazzcash') && (
                <div>
                  <label className="block font-semibold mb-1">Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    className="border rounded px-3 py-2 w-full"
                    value={priceFields.accountNumber || ''}
                    onChange={e => setPriceFields(f => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="Enter account number"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1">Person Name (who accepted payment)</label>
                <input
                  type="text"
                  name="personName"
                  className="border rounded px-3 py-2 w-full"
                  value={priceFields.personName || ''}
                  onChange={e => setPriceFields(f => ({ ...f, personName: e.target.value }))}
                  placeholder="Enter person name"
                  required
                />
              </div>
            </div>

      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-[#57123f]">Required Documents</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {fields.map((field, index) => (
              <div key={index} className="flex flex-col">
                {field.type !== 'checkbox' && (
                  <>
                    <label className="mb-2 font-medium text-gray-700">{field.label}</label>
                    <input
                      type={field.type}
                      name={field.name}
                      onChange={handleChange}
                      className="border rounded p-2"
                      accept={field.type === 'file' ? '.pdf,.jpg,.jpeg,.png' : undefined}
                    />
                  </>
                )}
                {field.type === 'checkbox' && (
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      name={field.name}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    {field.label}
                  </label>
                )}
              </div>
            ))}

            {cnicGroups.map((group) => (
              <div key={group.id} className="border p-4 rounded mb-4 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="mb-2 font-medium text-gray-700">Upload CNIC (Front)</label>
                    <input
                      type="file"
                      onChange={(e) => handleCnicChange(e, group.id, 'front')}
                      className="border rounded p-2"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-2 font-medium text-gray-700">Upload CNIC (Back)</label>
                    <input
                      type="file"
                      onChange={(e) => handleCnicChange(e, group.id, 'back')}
                      className="border rounded p-2"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCnicField(group.id)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold"
                >
                  ✖ Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddCnicField}
              className="bg-[#5B2148] text-white mx-2 px-4 py-2 rounded hover:bg-opacity-90 mb-4"
            >
              Add Another Member’s CNIC
            </button>

            {/* Additional Member Email/Phone Fields */}
            {memberContacts.map((member) => (
              <div key={member.id} className="border p-4 rounded mb-4 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="mb-2 font-medium text-gray-700">Member Email</label>
                    <input
                      type="email"
                      value={member.email}
                      onChange={e => handleMemberContactChange(e, member.id, 'email')}
                      className="border rounded p-2"
                      placeholder="Enter member's email"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-2 font-medium text-gray-700">Member Phone</label>
                    <input
                      type="tel"
                      value={member.phone}
                      onChange={e => handleMemberContactChange(e, member.id, 'phone')}
                      className="border rounded p-2"
                      placeholder="Enter member's phone"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMemberContact(member.id)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800 font-semibold"
                >
                  ✖ Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddMemberContact}
              className="bg-[#5B2148] text-white mx-2 px-4 py-2 rounded hover:bg-opacity-90 mb-4"
            >
              Add Another Member’s Email/Phone
            </button>

         
            <button
              type="submit"
              disabled={loading}
              className={`block mt-6 w-full px-6 py-2 rounded text-white ${
                loading ? 'bg-gray-400' : 'bg-[#57123f] hover:bg-[#4a0f35]'
              }`}
            >
              {loading ? 'Processing...' : 'Submit Service Details'}
            </button>

          </form>

        </div>
      )}

      {!showForm && selectedService && (
        <div className="text-center mt-4">
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#57123f] text-white px-6 py-2 rounded hover:bg-[#4a0f35]"
          >
            Add Service Details
          </button>
        </div>
      )}

    </div>
  );
};

export default DirectService;
