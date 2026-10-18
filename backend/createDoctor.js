import mongoose from "mongoose";
import bcrypt from "bcrypt";
import doctorModel from "./models/doctorModel.js";
import 'dotenv/config';

const createDoctor = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/prescripto`);
        console.log("DB Connected");

        const email = "admin@example.com";
        const password = "Admin@123";

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const doctorData = {
            name: "Dr. Admin",
            email: email,
            password: hashedPassword,
            image: "https://via.placeholder.com/150",
            speciality: "General Physician",
            degree: "MBBS",
            experience: "4 Years",
            about: "Dr. Admin is a placeholder doctor for testing.",
            fees: 50,
            address: { line1: "123 Admin St", line2: "Admin City" },
            available: true,
            date: Date.now()
        };

        const existingDoctor = await doctorModel.findOne({ email });

        if (existingDoctor) {
            existingDoctor.password = hashedPassword;
            await existingDoctor.save();
            console.log("Doctor password updated");
        } else {
            const newDoctor = new doctorModel(doctorData);
            await newDoctor.save();
            console.log("Doctor created");
        }

    } catch (error) {
        console.error("Error creating doctor:", error);
    } finally {
        mongoose.disconnect();
    }
};

createDoctor();
