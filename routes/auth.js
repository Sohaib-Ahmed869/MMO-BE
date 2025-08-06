const express = require("express");
const Joi = require("joi");
const { supabase, supabaseAdmin } = require("../config/supabase");
const router = express.Router();

// Validation schemas
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("admin", "manager", "employee").default("employee"),
  full_name: Joi.string().required(),
  department: Joi.string().allow("").optional(),
  position: Joi.string().allow("").optional(),
  start_date: Joi.date().allow(null).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Employee Signup (self-registration)
router.post("/signup/employee", async (req, res) => {
  try {
    const { error: validationError, value } = signupSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { email, password, full_name, department, position, start_date } =
      value;

    // Create user in Supabase Auth with metadata
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "employee",
          full_name,
          department,
          position,
          start_date,
        },
      });

    if (authError) {
      console.error("Auth creation error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    // Wait a moment for the trigger to create basic user record
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate employee ID
    const { data: employeeIdResult, error: idError } = await supabaseAdmin.rpc(
      "generate_employee_id"
    );

    if (idError) {
      console.error("Error generating employee ID:", idError);
      return res.status(500).json({ error: "Failed to generate employee ID" });
    }

    // Update the user record created by the trigger with additional info
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .update({
        full_name,
        department: department || null,
        position: position || null,
        start_date: start_date || null,
        employee_id: employeeIdResult,
        role: "employee",
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (userError) {
      console.error("Error updating user profile:", userError);

      // Fallback: try to insert if update failed (in case trigger didn't work)
      const { data: insertedUserData, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          department: department || null,
          position: position || null,
          start_date: start_date || null,
          employee_id: employeeIdResult,
          role: "employee",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting user profile:", insertError);
        return res.status(500).json({ error: "Failed to create user profile" });
      }

      // Use inserted data if update failed
      const finalUserData = insertedUserData;

      // Ensure onboarding progress record exists
      const { error: progressError } = await supabaseAdmin
        .from("onboarding_progress")
        .insert({
          user_id: authData.user.id,
          started_at: new Date().toISOString(),
        });

      if (progressError && progressError.code !== "23505") {
        // Ignore duplicate key error
        console.error("Error creating onboarding progress:", progressError);
      }

      return res.status(201).json({
        message: "Employee account created successfully",
        user: {
          id: finalUserData.id,
          email: finalUserData.email,
          employee_id: finalUserData.employee_id,
          full_name: finalUserData.full_name,
          role: finalUserData.role,
          onboarding_status: finalUserData.onboarding_status || "pending",
        },
      });
    }

    res.status(201).json({
      message: "Employee account created successfully",
      user: {
        id: userData.id,
        email: userData.email,
        employee_id: userData.employee_id,
        full_name: userData.full_name,
        role: userData.role,
        onboarding_status: userData.onboarding_status || "pending",
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin/Manager Signup (admin only)
router.post("/signup/admin", async (req, res) => {
  try {
    const { error: validationError, value } = signupSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { email, password, role, full_name, department, position } = value;

    if (!["admin", "manager"].includes(role)) {
      return res.status(400).json({ error: "Invalid role for admin signup" });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          full_name,
          department,
          position,
        },
      });

    if (authError) {
      console.error("Auth creation error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    // Wait for trigger
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update user profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .update({
        full_name,
        department: department || null,
        position: position || null,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (userError) {
      console.error("Error updating admin/manager profile:", userError);

      // Fallback insert
      const { data: insertedUserData, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          department: department || null,
          position: position || null,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting admin/manager profile:", insertError);
        return res.status(500).json({ error: "Failed to create user profile" });
      }

      return res.status(201).json({
        message: `${role} account created successfully`,
        user: {
          id: insertedUserData.id,
          email: insertedUserData.email,
          full_name: insertedUserData.full_name,
          role: insertedUserData.role,
        },
      });
    }

    res.status(201).json({
      message: `${role} account created successfully`,
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login (keep this the same as it's working)
router.post("/login", async (req, res) => {
  try {
    const { error: validationError, value } = loginSchema.validate(req.body);
    if (validationError) {
      return res
        .status(400)
        .json({ error: validationError.details[0].message });
    }

    const { email, password } = value;

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user profile:", userError);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: userData.id,
        email: userData.email,
        employee_id: userData.employee_id,
        full_name: userData.full_name,
        role: userData.role,
        onboarding_status: userData.onboarding_status,
        department: userData.department,
        position: userData.position,
      },
      session: authData.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Enable 2FA
router.post("/enable-2fa", async (req, res) => {
  try {
    const { factorType } = req.body;

    if (!["totp", "phone"].includes(factorType)) {
      return res.status(400).json({ error: "Invalid factor type" });
    }

    res.json({ message: "2FA setup initiated" });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Password reset request
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
