import express from "express";
import multer from "multer";
import {
  createReport,
  sendReport,
  updateReport,
  getDoctorReports,
  getPatientReports,
  getReportById,
  deleteReport,
  uploadTestReport,
  deleteTestUpload,
} from "../controllers/reportController.js";
import authDoctor from "../middleware/authDoctor.js";
import authUser from "../middleware/authUser.js";

const reportRouter = express.Router();

// multer — store in memory for cloudinary stream
const storage = multer.diskStorage({});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG and PDF files are allowed"), false);
  },
});

// Doctor routes
reportRouter.post("/create", authDoctor, createReport);
reportRouter.post("/send", authDoctor, sendReport);
reportRouter.post("/update", authDoctor, updateReport);
reportRouter.get("/doctor-reports", authDoctor, getDoctorReports);
reportRouter.post("/delete", authDoctor, deleteReport);

// Patient routes
reportRouter.get("/my-reports", authUser, getPatientReports);
reportRouter.post("/upload-test", authUser, upload.single("file"), uploadTestReport);
reportRouter.post("/delete-upload", authUser, deleteTestUpload);

// Shared
reportRouter.get("/:reportId", getReportById);

export default reportRouter;
