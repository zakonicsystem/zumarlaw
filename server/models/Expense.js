import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  // Sender grouped information
  sender: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    designation: { type: String },
    branch: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    accountTitle: { type: String },
    paymentMethod: { type: String } // 'Cash' or 'Bank'
  },

  // Expense classification and details
  expenseCategory: { type: String, required: true },
  expenseTypeNumber: { type: Number }, // 1..11 indicates main category
  expenseSubCategory: { type: String },
  otherDetails: { type: String },
  remarks: { type: String },

  // Monetary and timing
  amount: { type: Number, required: true },
  expenseDate: { type: Date, default: Date.now },
  branch: { type: String },

  // Accountant details: history of accounting actions on this expense
  accountantDetails: [
    {
      name: { type: String },
      role: { type: String },
      action: { type: String }, // e.g., 'created', 'paid','refused'
      date: { type: Date, default: Date.now },
      // Structured payment info when action === 'paid'
      paymentMethod: { type: String }, // Cash | Bank | JazzCash | EasyPaisa | Cheque
      bankName: { type: String },
      accountTitle: { type: String },
      accountNumber: { type: String },
      chequeNumber: { type: String }
    }
  ],

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles' },
  createdByRole: { type: String },

  // Payment tracking
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paidBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Roles' },
    role: { type: String }
  },
  proof: { type: String } // path to uploaded proof screenshot
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
