// routes/onboarding.js
const express = require("express");
const Joi = require("joi");
const { supabase } = require("../config/supabase");
const { requireRole } = require("../middleware/auth");
const router = express.Router();

// Validation schemas for each form
const complianceStatementSchema = Joi.object({
  employee_name: Joi.string().required(),
  employee_id: Joi.string().required(),
  position: Joi.string().required(),
  start_date: Joi.date().required(),
  background_check_completed: Joi.boolean().required(),
  drug_screening_completed: Joi.boolean().required(),
  licensure_verification: Joi.boolean().required(),
  tb_testing_completed: Joi.boolean().required(),
  required_immunizations_current: Joi.boolean().required(),
  electronic_signature: Joi.string().required(),
  signature_date: Joi.date().required(),
});

const confidentialityAgreementSchema = Joi.object({
  employee_name: Joi.string().required(),
  employee_id: Joi.string().required(),
  department: Joi.string().required(),
  maintain_confidentiality: Joi.boolean().required(),
  no_solicitation_agreement: Joi.boolean().required(),
  privacy_regulations_compliance: Joi.boolean().required(),
  hipaa_compliance_acknowledgment: Joi.boolean().required(),
  electronic_signature: Joi.string().required(),
  signature_date: Joi.date().required(),
});

const directDepositSchema = Joi.object({
  employee_name: Joi.string().required(),
  employee_id: Joi.string().required(),
  bank_name: Joi.string().required(),
  routing_number: Joi.string().length(9).required(),
  account_number: Joi.string().required(),
  account_type: Joi.string().valid("checking", "savings").required(),
  deposit_type: Joi.string().valid("full_amount", "partial_amount").required(),
  authorization_agreement: Joi.boolean().required(),
  electronic_signature: Joi.string().required(),
  signature_date: Joi.date().required(),
});

const healthStatementSchema = Joi.object({
  employee_name: Joi.string().required(),
  employee_id: Joi.string().required(),
  chronic_medical_conditions: Joi.string().allow(""),
  current_medications: Joi.string().allow(""),
  known_allergies: Joi.string().allow(""),
  immunizations_current: Joi.boolean().required(),
  tb_screening_completed: Joi.boolean().required(),
  health_insurance_coverage: Joi.boolean().required(),
  emergency_contact_name: Joi.string().required(),
  emergency_contact_phone: Joi.string().required(),
  emergency_contact_relationship: Joi.string().required(),
  electronic_signature: Joi.string().required(),
  signature_date: Joi.date().required(),
});

const hepatitisBSchema = Joi.object({
  employee_name: Joi.string().required(),
  date_of_hire: Joi.date().required(),
  social_security_number: Joi.string().optional(),
  vaccine_choice: Joi.string().valid("waive", "receive").required(),
  series_1_date: Joi.date().optional(),
  series_2_date: Joi.date().optional(),
  series_3_date: Joi.date().optional(),
  employee_signature: Joi.string().required(),
  mmo_rep_signature: Joi.string().optional(),
  signature_date: Joi.date().required(),
});

// Get onboarding progress
router.get("/progress", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      return res.status(400).json({ error: error.message });
    }

    // If no progress record exists, create one
    if (!data) {
      const { data: newProgress, error: createError } = await supabase
        .from("onboarding_progress")
        .insert({
          user_id: req.user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        return res.status(400).json({ error: createError.message });
      }

      return res.json({ progress: newProgress });
    }

    res.json({ progress: data });
  } catch (error) {
    console.error("Get onboarding progress error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit compliance statement
router.post("/compliance-statement", async (req, res) => {
  try {
    const { error: validationError, value } =
      complianceStatementSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { data, error } = await supabase
      .from("compliance_statements")
      .insert({
        user_id: req.user.id,
        ...value,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Compliance statement submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit compliance statement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit confidentiality agreement
router.post("/confidentiality-agreement", async (req, res) => {
  try {
    const { error: validationError, value } =
      confidentialityAgreementSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { data, error } = await supabase
      .from("confidentiality_agreements")
      .insert({
        user_id: req.user.id,
        ...value,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Confidentiality agreement submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit confidentiality agreement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit direct deposit authorization
router.post("/direct-deposit", async (req, res) => {
  try {
    const { error: validationError, value } = directDepositSchema.validate(
      req.body
    );
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { data, error } = await supabase
      .from("direct_deposit_authorizations")
      .insert({
        user_id: req.user.id,
        ...value,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Direct deposit authorization submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit direct deposit error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit health statement
router.post("/health-statement", async (req, res) => {
  try {
    const { error: validationError, value } = healthStatementSchema.validate(
      req.body
    );
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { data, error } = await supabase
      .from("health_statements")
      .insert({
        user_id: req.user.id,
        ...value,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Health statement submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit health statement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit hepatitis B vaccination form
router.post("/hepatitis-b", async (req, res) => {
  try {
    const { error: validationError, value } = hepatitisBSchema.validate(
      req.body
    );
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { data, error } = await supabase
      .from("hepatitis_b_vaccinations")
      .insert({
        user_id: req.user.id,
        ...value,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Hepatitis B vaccination form submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit hepatitis B form error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all submitted forms for a user
router.get("/forms", async (req, res) => {
  try {
    const forms = {};

    // Get all forms for the user
    const formTables = [
      "compliance_statements",
      "confidentiality_agreements",
      "direct_deposit_authorizations",
      "field_practice_statements",
      "hepatitis_b_vaccinations",
      "health_statements",
      "influenza_vaccination_declinations",
      "job_acceptance_forms",
      "job_description_acknowledgments",
      "ppe_acknowledgements",
      "policies_procedures_statements",
      "employee_handbook_acknowledgments",
      "tb_medical_questionnaires",
    ];

    for (const table of formTables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", req.user.id);

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        forms[table] = [];
      } else {
        forms[table] = data;
      }
    }

    res.json({ forms });
  } catch (error) {
    console.error("Get forms error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all onboarding data for admin/manager view
router.get(
  "/admin/all",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      let query = supabase
        .from("users")
        .select(
          `
        *,
        onboarding_progress (*)
      `
        )
        .eq("role", "employee");

      if (status) {
        query = query.eq("onboarding_status", status);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        employees: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get all onboarding data error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get specific employee's onboarding details
router.get(
  "/admin/employee/:id",
  requireRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get user and progress
      const { data: user, error: userError } = await supabase
        .from("users")
        .select(
          `
        *,
        onboarding_progress (*)
      `
        )
        .eq("id", id)
        .single();

      if (userError) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Get all forms
      const forms = {};
      const formTables = [
        "compliance_statements",
        "confidentiality_agreements",
        "direct_deposit_authorizations",
        "field_practice_statements",
        "hepatitis_b_vaccinations",
        "health_statements",
        "influenza_vaccination_declinations",
        "job_acceptance_forms",
        "job_description_acknowledgments",
        "ppe_acknowledgements",
        "policies_procedures_statements",
        "employee_handbook_acknowledgments",
        "tb_medical_questionnaires",
      ];

      for (const table of formTables) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", id);

        if (!error) {
          forms[table] = data;
        }
      }

      res.json({
        employee: user,
        forms,
      });
    } catch (error) {
      console.error("Get employee onboarding details error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Add more form submission endpoints as needed
// Following the same pattern as above...

// Submit field practice statement
router.post("/field-practice", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("field_practice_statements")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        practice_guidelines_acknowledged:
          req.body.practice_guidelines_acknowledged,
        field_procedures_understood: req.body.field_procedures_understood,
        safety_protocols_agreed: req.body.safety_protocols_agreed,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Field practice statement submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit field practice statement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit influenza vaccination declination
router.post("/influenza-declination", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("influenza_vaccination_declinations")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        acknowledgment_read: req.body.acknowledgment_read,
        mask_requirement_understood: req.body.mask_requirement_understood,
        declination_signature: req.body.declination_signature,
        witness_signature: req.body.witness_signature,
        signature_date: req.body.signature_date,
        witness_date: req.body.witness_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Influenza vaccination declination submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit influenza declination error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit job acceptance form
router.post("/job-acceptance", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("job_acceptance_forms")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        position_accepted: req.body.position_accepted,
        start_date: req.body.start_date,
        salary_acknowledged: req.body.salary_acknowledged,
        benefits_understood: req.body.benefits_understood,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Job acceptance form submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit job acceptance form error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit job description acknowledgment
router.post("/job-description", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("job_description_acknowledgments")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        job_duties_understood: req.body.job_duties_understood,
        responsibilities_acknowledged: req.body.responsibilities_acknowledged,
        requirements_met: req.body.requirements_met,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Job description acknowledgment submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit job description acknowledgment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit PPE acknowledgement
router.post("/ppe-acknowledgement", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ppe_acknowledgements")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        ppe_training_completed: req.body.ppe_training_completed,
        equipment_received: req.body.equipment_received,
        usage_guidelines_understood: req.body.usage_guidelines_understood,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "PPE acknowledgement submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit PPE acknowledgement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit policies & procedures statement
router.post("/policies-procedures", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("policies_procedures_statements")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        policies_read: req.body.policies_read,
        procedures_understood: req.body.procedures_understood,
        compliance_agreed: req.body.compliance_agreed,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Policies & procedures statement submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit policies & procedures statement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit employee handbook acknowledgment
router.post("/handbook-acknowledgment", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("employee_handbook_acknowledgments")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        handbook_received: req.body.handbook_received,
        handbook_read: req.body.handbook_read,
        policies_understood: req.body.policies_understood,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "Employee handbook acknowledgment submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit handbook acknowledgment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit TB medical questionnaire
router.post("/tb-questionnaire", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tb_medical_questionnaires")
      .insert({
        user_id: req.user.id,
        employee_name: req.body.employee_name,
        employee_id: req.body.employee_id,
        tb_symptoms_present: req.body.tb_symptoms_present,
        tb_exposure_history: req.body.tb_exposure_history,
        chest_xray_completed: req.body.chest_xray_completed,
        medical_clearance: req.body.medical_clearance,
        electronic_signature: req.body.electronic_signature,
        signature_date: req.body.signature_date,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: "TB medical questionnaire submitted successfully",
      data,
    });
  } catch (error) {
    console.error("Submit TB questionnaire error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
