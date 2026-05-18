require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const axios = require("axios");

const app = express();

/* ======================================
   MIDDLEWARE
====================================== */

app.use(cors());
app.use(express.json());

/* ======================================
   DATABASE CONNECTION
====================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err.message);
  });

/* ======================================
   STUDENT SCHEMA
====================================== */

const studentSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

const Student =
  mongoose.model("Student", studentSchema);

/* ======================================
   GRIEVANCE SCHEMA
====================================== */

const grievanceSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    enum: [
      "Academic",
      "Hostel",
      "Transport",
      "Other",
    ],
    default: "Other",
  },

  status: {
    type: String,
    enum: [
      "Pending",
      "Resolved",
    ],
    default: "Pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

const Grievance =
  mongoose.model(
    "Grievance",
    grievanceSchema
  );

/* ======================================
   HOME ROUTE
====================================== */

app.get("/", (req, res) => {

  res.status(200).json({

    success: true,

    message:
      "🚀 Student Grievance API Running",

  });

});

/* ======================================
   REGISTER
====================================== */

app.post("/api/register", async (req, res) => {

  try {

    const {
      name,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({

        success: false,

        message:
          "All fields are required",

      });

    }

    const existingStudent =
      await Student.findOne({ email });

    if (existingStudent) {

      return res.status(400).json({

        success: false,

        message:
          "Email already exists",

      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const student =
      await Student.create({

        name,
        email,
        password: hashedPassword,

      });

    res.status(201).json({

      success: true,

      message:
        "✅ Registration Successful",

      student,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Registration Failed",

    });

  }

});

/* ======================================
   LOGIN
====================================== */

app.post("/api/login", async (req, res) => {

  try {

    const {
      email,
      password,
    } = req.body;

    const student =
      await Student.findOne({ email });

    if (!student) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid Email",

      });

    }

    const isMatch =
      await bcrypt.compare(
        password,
        student.password
      );

    if (!isMatch) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid Password",

      });

    }

    res.status(200).json({

      success: true,

      message:
        "✅ Login Successful",

      student: {

        id: student._id,

        name: student.name,

        email: student.email,

      },

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Login Failed",

    });

  }

});

/* ======================================
   SUBMIT GRIEVANCE
====================================== */

app.post(
  "/api/grievances",
  async (req, res) => {

    try {

      const {

        title,
        description,
        category,

      } = req.body;

      const grievance =
        await Grievance.create({

          title,
          description,
          category,

        });

      res.status(201).json({

        success: true,

        message:
          "✅ Grievance Submitted",

        grievance,

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "❌ Submission Failed",

      });

    }

  }
);

/* ======================================
   GET ALL GRIEVANCES
====================================== */

app.get(
  "/api/grievances",
  async (req, res) => {

    try {

      const grievances =
        await Grievance.find().sort({

          createdAt: -1,

        });

      res.status(200).json({

        success: true,

        total: grievances.length,

        grievances,

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "❌ Failed to Fetch",

      });

    }

  }
);

/* ======================================
   GET SINGLE GRIEVANCE
====================================== */

app.get(
  "/api/grievances/:id",
  async (req, res) => {

    try {

      const grievance =
        await Grievance.findById(
          req.params.id
        );

      if (!grievance) {

        return res.status(404).json({

          success: false,

          message:
            "Grievance not found",

        });

      }

      res.status(200).json({

        success: true,

        grievance,

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "❌ Error Fetching",

      });

    }

  }
);

/* ======================================
   UPDATE GRIEVANCE
====================================== */

app.put(
  "/api/grievances/:id",
  async (req, res) => {

    try {

      const updated =
        await Grievance.findByIdAndUpdate(

          req.params.id,

          req.body,

          {
            new: true,
          }

        );

      res.status(200).json({

        success: true,

        message:
          "✅ Grievance Updated",

        updated,

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "❌ Update Failed",

      });

    }

  }
);

/* ======================================
   DELETE GRIEVANCE
====================================== */

app.delete(
  "/api/grievances/:id",
  async (req, res) => {

    try {

      await Grievance.findByIdAndDelete(
        req.params.id
      );

      res.status(200).json({

        success: true,

        message:
          "🗑️ Grievance Deleted",

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "❌ Delete Failed",

      });

    }

  }
);

/* ======================================
   SEARCH GRIEVANCE
====================================== */

app.get(
  "/api/grievances/search",
  async (req, res) => {

    try {

      const title =
        req.query.title || "";

      const grievances =
        await Grievance.find({

          title: {

            $regex: title,

            $options: "i",

          },

        });

      res.status(200).json({

        success: true,

        results:
          grievances.length,

        grievances,

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
          "❌ Search Failed",

      });

    }

  }
);

/* ======================================
   AI HELP
====================================== */

app.post(
  "/api/ai/help",
  async (req, res) => {

    try {

      const { problem } = req.body;

      const prompt = `

You are a helpful college support assistant.

Student Problem:
${problem}

Give:
1. Proper advice
2. Solution
3. Steps to solve issue
4. Professional response

`;

      const response =
        await axios.post(

          "https://openrouter.ai/api/v1/chat/completions",

          {

            model:
              "openai/gpt-4o-mini",

            max_tokens: 500,

            messages: [

              {
                role: "user",
                content: prompt,
              },

            ],

          },

          {

            headers: {

              Authorization:
                `Bearer ${process.env.OPENROUTER_API_KEY}`,

              "Content-Type":
                "application/json",

            },

          }

        );

      const aiText =
        response.data.choices[0]
          .message.content;

      res.status(200).json({

        success: true,

        response: aiText,

      });

    } catch (error) {

      console.log(
        error.response?.data ||
        error.message
      );

      res.status(500).json({

        success: false,

        message:
          "❌ AI Failed",

      });

    }

  }
);

/* ======================================
   SERVER
====================================== */

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `🚀 Server Running on Port ${PORT}`
  );

});