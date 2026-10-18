import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointment",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: true },
    patientAge: { type: String },
    patientGender: { type: String },
    visitDate: { type: String },
    vitals: {
      bloodPressure: { type: String, default: "" },
      temperature: { type: String, default: "" },
      pulse: { type: String, default: "" },
      weight: { type: String, default: "" },
    },
    diagnosis: { type: String, required: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    symptoms: { type: String },
    prescription: [
      {
        medicineName: { type: String },
        dosage: { type: String },
        duration: { type: String },
      },
    ],
    testsRequired: [
      {
        testName: { type: String },
        reason: { type: String, default: "" },
        urgent: { type: Boolean, default: false },
      },
    ],
    patientUploads: [
      {
        testName: { type: String, default: "General" },
        fileUrl: { type: String, required: true },
        fileName: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    doctorNotes: { type: String },
    followUpDate: { type: String },
    isSent: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

const reportModel =
  mongoose.models.report || mongoose.model("report", reportSchema);

export default reportModel;
