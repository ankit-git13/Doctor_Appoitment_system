import reportModel from "../models/reportModel.js";
import { v2 as cloudinary } from "cloudinary";

// Upload patient test report file
const uploadTestReport = async (req, res) => {
  try {
    const { userId } = req.body;
    const { reportId, testName } = req.body;

    if (!req.file) {
      return res.json({ success: false, message: "No file uploaded" });
    }

    const report = await reportModel.findById(reportId);
    if (!report) return res.json({ success: false, message: "Report not found" });
    if (report.userId.toString() !== userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "patient_test_reports",
    });

    report.patientUploads.push({
      testName: testName || "General",
      fileUrl: result.secure_url,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      uploadedAt: new Date(),
    });

    await report.save();
    res.json({ success: true, message: "File uploaded successfully", upload: report.patientUploads.at(-1) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Delete a patient upload
const deleteTestUpload = async (req, res) => {
  try {
    const { userId } = req.body;
    const { reportId, uploadId } = req.body;

    const report = await reportModel.findById(reportId);
    if (!report) return res.json({ success: false, message: "Report not found" });
    if (report.userId.toString() !== userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    report.patientUploads = report.patientUploads.filter(
      (u) => u._id.toString() !== uploadId
    );
    await report.save();
    res.json({ success: true, message: "Upload deleted" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Create a new report (Doctor)
const createReport = async (req, res) => {
  try {
    const { docId } = req.body; // from doctorAuth middleware
    const {
      appointmentId,
      userId,
      patientName,
      patientEmail,
      patientAge,
      patientGender,
      visitDate,
      vitals,
      diagnosis,
      severity,
      symptoms,
      prescription,
      testsRequired,
      doctorNotes,
      followUpDate,
    } = req.body;

    if (!patientName || !patientEmail || !diagnosis || !userId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const report = new reportModel({
      appointmentId,
      doctorId: docId,
      userId,
      patientName,
      patientEmail,
      patientAge,
      patientGender,
      visitDate,
      vitals,
      diagnosis,
      severity,
      symptoms,
      prescription,
      testsRequired: testsRequired || [],
      doctorNotes,
      followUpDate,
      isSent: false,
    });

    await report.save();
    res.json({ success: true, message: "Report created successfully", report });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Send report to patient (Doctor)
const sendReport = async (req, res) => {
  try {
    const { reportId } = req.body;
    const { docId } = req.body;

    const report = await reportModel.findById(reportId);
    if (!report) return res.json({ success: false, message: "Report not found" });

    if (report.doctorId.toString() !== docId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    report.isSent = true;
    report.sentAt = new Date();
    await report.save();

    res.json({ success: true, message: "Report sent to patient successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Update report (Doctor)
const updateReport = async (req, res) => {
  try {
    const { reportId, docId, ...updateData } = req.body;

    const report = await reportModel.findById(reportId);
    if (!report) return res.json({ success: false, message: "Report not found" });

    if (report.doctorId.toString() !== docId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    await reportModel.findByIdAndUpdate(reportId, updateData);
    res.json({ success: true, message: "Report updated successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Get all reports by doctor (Doctor dashboard)
const getDoctorReports = async (req, res) => {
  try {
    const { docId } = req.body;
    const reports = await reportModel
      .find({ doctorId: docId })
      .sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Get reports for a patient (Patient view)
const getPatientReports = async (req, res) => {
  try {
    const { userId } = req.body;
    const reports = await reportModel
      .find({ userId, isSent: true })
      .populate("doctorId", "name speciality image")
      .sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Get single report by ID
const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await reportModel
      .findById(reportId)
      .populate("doctorId", "name speciality image address");
    if (!report) return res.json({ success: false, message: "Report not found" });
    res.json({ success: true, report });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Delete report (Doctor)
const deleteReport = async (req, res) => {
  try {
    const { reportId, docId } = req.body;
    const report = await reportModel.findById(reportId);
    if (!report) return res.json({ success: false, message: "Report not found" });

    if (report.doctorId.toString() !== docId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    await reportModel.findByIdAndDelete(reportId);
    res.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  createReport,
  sendReport,
  updateReport,
  getDoctorReports,
  getPatientReports,
  getReportById,
  deleteReport,
  uploadTestReport,
  deleteTestUpload,
};
