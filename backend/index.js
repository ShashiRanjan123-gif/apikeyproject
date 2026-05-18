require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
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
   CANDIDATE SCHEMA
====================================== */

const candidateSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  skills: {
    type: [String],
    default: [],
  },

  experience: {
    type: Number,
    default: 0,
  },

  projects: {
    type: String,
    default: "",
  },

  bio: {
    type: String,
    default: "",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

const Candidate =
  mongoose.model("Candidate", candidateSchema);

/* ======================================
   HOME ROUTE
====================================== */

app.get("/", (req, res) => {

  res.status(200).json({

    success: true,

    message:
      "🚀 AI Candidate Shortlisting API Running",

  });

});

/* ======================================
   ADD CANDIDATE
====================================== */

app.post("/api/candidates", async (req, res) => {

  try {

    const {

      name,
      email,
      skills,
      experience,
      projects,
      bio,

    } = req.body;

    if (!name || !email) {

      return res.status(400).json({

        success: false,

        message:
          "Name and Email are required",

      });

    }

    const existingCandidate =
      await Candidate.findOne({ email });

    if (existingCandidate) {

      return res.status(400).json({

        success: false,

        message:
          "Candidate already exists",

      });

    }

    const candidate =
      await Candidate.create({

        name,
        email,
        skills,
        experience,
        projects,
        bio,

      });

    res.status(201).json({

      success: true,

      message:
        "✅ Candidate Added Successfully",

      candidate,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Failed to Add Candidate",

    });

  }

});

/* ======================================
   GET ALL CANDIDATES
====================================== */

app.get("/api/candidates", async (req, res) => {

  try {

    const candidates =
      await Candidate.find().sort({

        createdAt: -1,

      });

    res.status(200).json({

      success: true,

      total: candidates.length,

      candidates,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Failed to Fetch Candidates",

    });

  }

});

/* ======================================
   GET SINGLE CANDIDATE
====================================== */

app.get("/api/candidates/:id", async (req, res) => {

  try {

    const candidate =
      await Candidate.findById(req.params.id);

    if (!candidate) {

      return res.status(404).json({

        success: false,

        message:
          "Candidate not found",

      });

    }

    res.status(200).json({

      success: true,

      candidate,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Error Fetching Candidate",

    });

  }

});

/* ======================================
   UPDATE CANDIDATE
====================================== */

app.put("/api/candidates/:id", async (req, res) => {

  try {

    const updatedCandidate =
      await Candidate.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true,
        }

      );

    res.status(200).json({

      success: true,

      message:
        "✅ Candidate Updated",

      updatedCandidate,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Update Failed",

    });

  }

});

/* ======================================
   DELETE CANDIDATE
====================================== */

app.delete("/api/candidates/:id", async (req, res) => {

  try {

    await Candidate.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({

      success: true,

      message:
        "🗑️ Candidate Deleted",

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Delete Failed",

    });

  }

});

/* ======================================
   SEARCH CANDIDATES
====================================== */

app.get("/api/search", async (req, res) => {

  try {

    const keyword =
      req.query.keyword || "";

    const candidates =
      await Candidate.find({

        $or: [

          {
            name: {
              $regex: keyword,
              $options: "i",
            },
          },

          {
            skills: {
              $elemMatch: {
                $regex: keyword,
                $options: "i",
              },
            },
          },

        ],

      });

    res.status(200).json({

      success: true,

      results: candidates.length,

      candidates,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Search Failed",

    });

  }

});

/* ======================================
   MATCH CANDIDATES
====================================== */

app.post("/api/match", async (req, res) => {

  try {

    const {

      requiredSkills,
      minExperience,
      preferredSkills,

    } = req.body;

    const candidates =
      await Candidate.find();

    const results =
      candidates.map((candidate) => {

        const matchedSkills =
          candidate.skills.filter((skill) =>

            requiredSkills.includes(skill)

          );

        const preferredMatched =
          preferredSkills?.filter((skill) =>

            candidate.skills.includes(skill)

          ) || [];

        const skillScore =
          requiredSkills.length > 0

            ? (
                matchedSkills.length /
                requiredSkills.length
              ) * 100

            : 0;

        let experienceScore = 0;

        if (
          candidate.experience >=
          minExperience
        ) {

          experienceScore = 20;

        }

        const preferredScore =
          preferredMatched.length * 10;

        const totalScore =
          skillScore +
          experienceScore +
          preferredScore;

        let ranking = "Low";

        if (totalScore >= 90) {

          ranking = "High";

        } else if (totalScore >= 60) {

          ranking = "Medium";

        }

        return {

          id: candidate._id,

          name: candidate.name,

          email: candidate.email,

          skills: candidate.skills,

          experience: candidate.experience,

          matchedSkills,

          preferredMatched,

          matchScore:
            Math.min(totalScore, 100).toFixed(2),

          ranking,

        };

      });

    results.sort(

      (a, b) => b.matchScore - a.matchScore

    );

    res.status(200).json({

      success: true,

      totalMatched: results.length,

      shortlistedCandidates: results,

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      success: false,

      message:
        "❌ Matching Failed",

    });

  }

});

/* ======================================
   AI SHORTLISTING
====================================== */

app.post("/api/ai/shortlist", async (req, res) => {

  try {

    const {

      requiredSkills,
      minExperience,

    } = req.body;

    const candidates =
      await Candidate.find();

    const formattedCandidates =
      candidates
        .map(
          (candidate, index) => `

${index + 1}. ${candidate.name}

Skills:
${candidate.skills.join(", ")}

Experience:
${candidate.experience} years

Projects:
${candidate.projects}

Bio:
${candidate.bio}

`
        )
        .join("\n");

    const prompt = `

You are an expert HR recruiter.

JOB REQUIREMENTS:

Required Skills:
${requiredSkills.join(", ")}

Minimum Experience:
${minExperience} years

CANDIDATES:

${formattedCandidates}

TASK:

1. Rank candidates from best to worst
2. Give match percentage
3. Explain suitability
4. Suggest top 3 candidates
5. Mention strengths and weaknesses

`;

    const response = await axios.post(

      "https://openrouter.ai/api/v1/chat/completions",

      {

        model: "openai/gpt-4o-mini",

        max_tokens: 1000,

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
      response.data.choices[0].message.content;

    res.status(200).json({

      success: true,

      aiRecommendation: aiText,

    });

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );

    res.status(500).json({

      success: false,

      message:
        "❌ AI Shortlisting Failed",

      error:
        error.response?.data ||
        error.message,

    });

  }

});

/* ======================================
   AI INTERVIEW QUESTIONS
====================================== */

app.post(

  "/api/ai/interview-questions",

  async (req, res) => {

    try {

      const { skills } = req.body;

      const prompt = `

Generate 10 technical interview questions
for these skills:

${skills.join(", ")}

Also provide short answers.

`;

      const response = await axios.post(

        "https://openrouter.ai/api/v1/chat/completions",

        {

          model: "openai/gpt-4o-mini",

          max_tokens: 1000,

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

      res.status(200).json({

        success: true,

        questions:
          response.data.choices[0].message.content,

      });

    } catch (error) {

      console.log(
        error.response?.data || error.message
      );

      res.status(500).json({

        success: false,

        message:
          "❌ Failed to Generate Questions",

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