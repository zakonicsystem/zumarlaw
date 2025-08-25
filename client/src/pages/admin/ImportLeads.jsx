import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

const ImportLeads = () => {
    const [filename, setFilename] = useState("");
    const [leads, setLeads] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.type === "text/csv" || file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
            processFile(file);
        } else {
            toast.error("Please upload a valid CSV or XLSX file.");
        }
    };

    const processFile = (file) => {
        if (file.size > 50 * 1024 * 1024) {
            toast.error("File must be under 50MB");
            return;
        }
        setFilename(file.name);
        const mapHeaders = (row) => {
            // Normalize keys: trim and lowercase
            const normalized = {};
            Object.keys(row).forEach(key => {
                normalized[key.trim().toLowerCase()] = row[key];
            });
            return {
                name: normalized["lead name"] || normalized["name"] || "",
                email: normalized["email"] || "",
                createdAt: normalized["registered on"] ? new Date(normalized["registered on"]) : (normalized["createdat"] ? new Date(normalized["createdat"]) : new Date()),
                phone: normalized["phone no"] || normalized["phone"] || "",
                status: normalized["status"] || "",
                assigned: normalized["assigned to"] || ""
            };
        };
        if (file.name.endsWith(".csv")) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const mapped = results.data.map(mapHeaders);
                    setLeads(mapped);
                    toast.success("File parsed successfully!");
                },
                error: (error) => {
                    console.error("Error parsing CSV:", error);
                    toast.error("Error parsing CSV file. Please check the format.");
                }
            });
        } else if (file.name.endsWith(".xlsx")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                const mapped = json.map(mapHeaders);
                setLeads(mapped);
                toast.success("XLSX file parsed successfully!");
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleImport = async () => {
        if (!leads.length) return toast.error("No leads to import");
        try {
            await axios.post("https://app.zumarlawfirm.com/leads/import", { leads });
            toast.success("Leads imported successfully!");
            setLeads([]);
            setFilename("");
        } catch (err) {
            toast.error("Failed to import leads");
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <Toaster position="top-right" />

            {/* Page Heading */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Lead Import</h1>
                    </div>

                    {/* Breadcrumbs */}
                    <nav className="flex mt-4" aria-label="Breadcrumb">
                        <ol className="flex items-center space-x-4">
                            <li>
                                <Link to="/admin" className="text-gray-400 hover:text-gray-500 flex items-center">
                                    <HomeIcon className="h-5 w-5" aria-hidden="true" />
                                    <span className="sr-only">Home</span>
                                </Link>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    <Link to="/leads" className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                                        Leads
                                    </Link>
                                </div>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    <span className="ml-4 text-sm font-medium text-gray-500">Import</span>
                                </div>
                            </li>
                        </ol>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h2 className="text-xl font-semibold mb-2">Upload your .csv or .xlsx file</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            File must be under 50 MB. Only CSV or XLSX with proper formatting structure.
                        </p>

                        <div
                            className={`border-2 border-dashed rounded-lg p-8 mb-4 cursor-pointer transition-colors ${
                                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("file-upload").click()}
                        >
                            <div className="flex flex-col items-center justify-center">
                                <svg
                                    className="w-10 h-10 mb-2 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                                <p className="text-sm text-gray-600">
                                    {filename ? filename : "Click to browse or drag and drop"}
                                </p>
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                accept=".csv,.xlsx"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>

                        <button
                            className="w-full bg-[#57123f] hover:bg-[#7a1a59] text-white py-2 px-4 rounded-md transition-colors"
                            disabled={!filename}
                            onClick={handleImport}
                        >
                            Import Leads
                        </button>

                        {leads.length > 0 && (
                            <div className="mt-8">
                                <h2 className="text-lg font-medium mb-2">Preview</h2>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                {Object.keys(leads[0]).map((key) => (
                                                    <th key={key} className="px-4 py-2 text-left border-b">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leads.slice(0, 5).map((lead, index) => (
                                                <tr key={index} className="border-b">
                                                    {Object.values(lead).map((value, idx) => (
                                                        <td key={idx} className="px-4 py-2">
                                                            {value instanceof Date
                                                                ? value.toLocaleDateString()
                                                                : (typeof value === 'object' && value !== null && value.toISOString)
                                                                    ? new Date(value).toLocaleDateString()
                                                                    : String(value)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportLeads;
